// @ts-check
/**
 * 时间推进：衰减、疾病、结算、死亡。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/settlement
 */

import { DEFAULT_TIME_SCALE, GRAVE, ILLNESS_CHAINS, LIFESPAN_DAYS, MAX, REVIVE_ITEM, SELF_HEAL_CHANCE, SICK_AWAY_MULTIPLIER, SICK_PAY_MULTIPLIER, SICK_RISK_MINUTES, STAGE_HEALTH, THRESHOLDS, TRAITS, illnessAt, illnessStageMs, interestByKey, jobByKey, nextIllness, rarityByKey, schoolStageByKey, subjectByKey, traitBonus, tripByKey } from '../data.js'
import { ageDays, lifeStageFor } from './clock.js'
import { AWAY_DECAY_MULTIPLIER, AWAY_FLOOR, CLEANLINESS_DECAY_PER_MIN, HAPPINESS_DECAY_PER_MIN, SATIETY_DECAY_PER_MIN, SETTLE_STEP_MS } from './constants.js'
import { announce, applyEffects, clamp100, remember } from './effects.js'
import { chance, rollerFor } from './random.js'

/**
 * Let the pig go. Used by illness at the end of a chain and by old age.
 * @param {string} why - shown in the announcement.
 */
export function die(state, nowMs, why) {
  if (state.dead === true) return
  state.dead = true
  state.health = 0
  state.illness = null
  state.activity = null
  state.diedAt = nowMs
  state.stats.deaths = (state.stats.deaths ?? 0) + 1
  remember(state, `${why} ${GRAVE.emoji}`, nowMs)
  announce(state, 'death', `${state.name} ${why}…用${REVIVE_ITEM.label}可以救回来，也可以领养一只新的`, nowMs)
}

export function currentIllness(state) {
  if (state.illness === null || state.illness === undefined) return null
  return illnessAt(state.illness.chain, state.illness.stage)
}

// ---------------------------------------------------------------------------
// The clock: decay, activity settlement, illness progression
// ---------------------------------------------------------------------------

/**
 * Bring the pig up to `nowMs`, resolving everything that happened in between.
 *
 * The gap is cut into at most two stretches — away until the activity ends,
 * then home — and each stretch is walked in steps of SETTLE_STEP_MS. That is
 * what lets a long absence play out the way it would have live: a job that
 * ended at 18:56 is paid (and stamped) at 18:56, the evening after it is time
 * at home, and a bar that crosses a threshold at 3 a.m. starts its sickness
 * risk at 3 a.m. rather than at whatever moment the panel was next opened.
 *
 * Randomness comes from the pig's own seed (see random.js); pass `roll` to pin
 * the outcome, as the tests and dev mode do.
 *
 * @param {object} state
 * @param {number} nowMs
 * @param {{roll?: import('./random.js').Roll}} [options]
 */
export function decay(state, nowMs, options = {}) {
  const fromMs = state.lastSeenAt ?? nowMs
  state.lastSeenAt = nowMs
  // An unopened box is not a pet yet: it never gets hungry, dirty, sick or
  // older, and it cannot die while it waits to be poked open (#2).
  if (state.hatched !== true) return state
  if (!(nowMs > fromMs) || state.dead === true) return state
  const next = options.roll ?? rollerFor(state)
  if (typeof state.ageMs !== 'number' || !Number.isFinite(state.ageMs)) {
    // First tick after loading an old save: seed pig time from the birthday.
    state.ageMs = typeof state.bornAt === 'number' ? Math.max(0, fromMs - state.bornAt) : 0
  }

  let cursor = fromMs
  const activity = state.activity
  if (activity !== null && activity !== undefined) {
    const untilMs = Math.min(nowMs, Math.max(cursor, activity.endsAt))
    passTime(state, { fromMs: cursor, toMs: untilMs, away: true }, next)
    cursor = untilMs
    // Settle at the moment it ended, not at the moment someone looked.
    if (state.dead !== true && state.activity === activity && untilMs >= activity.endsAt) {
      finishActivity(state, untilMs)
    }
  }
  if (state.dead !== true) passTime(state, { fromMs: cursor, toMs: nowMs, away: false }, next)
  return state
}

/**
 * Walk one stretch, all of it either away or at home, in bounded steps.
 * @param {object} state
 * @param {{fromMs: number, toMs: number, away: boolean}} stretch
 * @param {import('./random.js').Roll} next
 */
function passTime(state, stretch, next) {
  let cursor = stretch.fromMs
  while (cursor < stretch.toMs && state.dead !== true) {
    const stepEnd = Math.min(stretch.toMs, cursor + SETTLE_STEP_MS)
    step(state, { elapsedMs: stepEnd - cursor, atMs: stepEnd, away: stretch.away }, next)
    cursor = stepEnd
  }
}

/**
 * One step of pig time: bars, sickness risk, illness, age.
 * @param {object} state
 * @param {{elapsedMs: number, atMs: number, away: boolean}} tick
 * @param {import('./random.js').Roll} next
 */
function step(state, tick, next) {
  const { elapsedMs, atMs, away } = tick
  drainBars(state, elapsedMs / 60000, away)
  trackSicknessRisk(state, elapsedMs / 60000, away, atMs)
  progressIllness(state, elapsedMs, { away, atMs }, next)
  if (state.dead !== true) growOlder(state, elapsedMs, atMs)
}

/**
 * Time passing, with one floor: an activity may not empty a bar on its own.
 * A pig back from a day trip should be ravenous and filthy — a welcome-home
 * meal and bath — not sitting at zero before you can even react to it.
 * Going away never *raises* a bar either.
 */
function drainBars(state, minutes, away) {
  const speed = away ? AWAY_DECAY_MULTIPLIER : 1
  const drain = (value, perMinute) => {
    const lowered = value - minutes * perMinute * speed
    return away ? Math.max(lowered, Math.min(value, AWAY_FLOOR)) : lowered
  }
  state.satiety = clamp100(drain(state.satiety, SATIETY_DECAY_PER_MIN))
  state.happiness = clamp100(drain(state.happiness, HAPPINESS_DECAY_PER_MIN))
  state.cleanliness = clamp100(drain(state.cleanliness, CLEANLINESS_DECAY_PER_MIN))
}

/**
 * Illness only comes from being left at home. A pig that was out living its
 * life has not been neglected, and coming back sick every trip is not a game.
 */
function trackSicknessRisk(state, minutes, away, atMs) {
  if (away) {
    state.riskMinutes = 0
    return
  }
  // Risk is about catching a *new* illness, so it only builds while healthy:
  // otherwise a day of being ill and hungry would be banked and spent the very
  // step the pig shook the first one off.
  const neglected = state.satiety < THRESHOLDS.sickSatiety || state.cleanliness < THRESHOLDS.sickCleanliness
  state.riskMinutes = neglected && state.illness === null ? (state.riskMinutes ?? 0) + minutes : 0
  if (state.illness === null && state.riskMinutes >= SICK_RISK_MINUTES) {
    state.riskMinutes = 0
    catchIllness(state, atMs)
  }
}

/**
 * Illness advances on accumulated *effective* time, not wall clock: being out
 * and about while ill runs it at SICK_AWAY_MULTIPLIER, so a day of work costs
 * two days of illness and staying home is the cheap way to wait it out.
 */
function progressIllness(state, elapsedMs, where, next) {
  if (state.illness === null || state.illness === undefined) return
  const rate = where.away ? SICK_AWAY_MULTIPLIER : 1
  state.illness.progressMs = (state.illness.progressMs ?? 0) + elapsedMs * rate
  let guard = 0
  while (state.illness !== null && guard < 16) {
    // Each stage has its own length, so it has to be re-read after every step.
    const stageMs = illnessStageMs(state.illness.stage)
    if (state.illness.progressMs < stageMs) break
    // Carry the excess into the next stage rather than dropping it.
    const carried = state.illness.progressMs - stageMs
    advanceIllness(state, where.atMs, next)
    if (state.illness !== null) state.illness.progressMs = carried
    guard += 1
  }
}

/**
 * Pig time is elapsed real time times the scale; age passes whether or not
 * anyone is watching, so a pig left alone comes back a day older.
 */
function growOlder(state, elapsedMs, atMs) {
  const scale = Number.isFinite(state.timeScale) && state.timeScale > 0
    ? state.timeScale
    : DEFAULT_TIME_SCALE
  state.ageMs += elapsedMs * scale
  if (state.hatched !== true) return
  const stage = lifeStageFor(state, atMs)
  if (state.stage !== stage.key) {
    state.stage = stage.key
    remember(state, `长成了${stage.label} ${stage.emoji}`, atMs)
    announce(state, 'stage', `${state.name} 长成了${stage.label} ${stage.emoji}`, atMs)
  }
  if (ageDays(state, atMs) >= LIFESPAN_DAYS) die(state, atMs, '老了')
}

export function finishActivity(state, nowMs) {
  const activity = state.activity
  state.activity = null
  if (activity === null) return
  state.lastActiveAt = nowMs
  if (activity.kind === 'work') finishWork(state, activity, nowMs)
  else if (activity.kind === 'study') finishStudy(state, activity, nowMs)
  else if (activity.kind === 'interest') finishInterest(state, activity, nowMs)
  else if (activity.kind === 'trip') finishTrip(state, activity, nowMs)
}

export function finishInterest(state, activity, nowMs) {
  const interest = interestByKey(activity.key)
  if (interest === null) return
  // Straight into the same three traits the school ladder feeds.
  state.traits = { ...(state.traits ?? {}) }
  state.traits[interest.trait] = (state.traits[interest.trait] ?? 0) + interest.gain
  state.interests = { ...(state.interests ?? {}) }
  state.interests[interest.key] = (state.interests[interest.key] ?? 0) + 1
  state.satiety = clamp100(state.satiety - 4)
  state.happiness = clamp100(state.happiness + 3)
  state.stats.interests = (state.stats.interests ?? 0) + 1
  applyEffects(state, { xp: interest.xp }, nowMs)
  remember(state, `${interest.emoji} 学完${interest.label}，${TRAITS[interest.trait].label} +${interest.gain}`, nowMs)
  announce(state, 'study', `${state.name} 学会了${interest.label}，${TRAITS[interest.trait].label} +${interest.gain} ${interest.emoji}`, nowMs)
}

export function finishWork(state, activity, nowMs) {
  const job = jobByKey(activity.key)
  if (job === null) return
  // A sick pig still goes to work — that is the way out of the sick-and-broke
  // deadlock — but it works at half speed, so being ill costs money rather than
  // being an outright wall.
  const sick = state.illness !== null
  // Trait bonus first, then the sick penalty: going to school should still be
  // worth it while the pig is under the weather.
  const points = state.traits?.[job.trait] ?? 0
  const withTrait = job.coins * traitBonus(job.trait, points).pay
  const coins = sick ? Math.max(1, Math.round(withTrait * SICK_PAY_MULTIPLIER)) : Math.round(withTrait)
  state.coins += coins
  state.satiety = clamp100(state.satiety + job.satiety)
  state.cleanliness = clamp100(state.cleanliness + job.cleanliness)
  state.stats.jobs += 1
  state.stats.coinsEarned += coins
  applyEffects(state, { xp: job.xp }, nowMs)
  const tag = sick ? '（带病上工，只有一半）' : (points > 0 ? `（${TRAITS[job.trait].label} ${points}）` : '')
  remember(state, `${job.emoji} ${job.label}回来，赚了 ${coins} 金币${tag}`, nowMs)
  announce(state, 'work', sick
    ? `${state.name} 带病打工回来了，只赚到 ${coins} 金币 🤒`
    : `${state.name} 打工回来了！赚到 ${coins} 金币 💰`, nowMs)
}

export function finishStudy(state, activity, nowMs) {
  const subject = subjectByKey(activity.key)
  const stage = schoolStageByKey(activity.stage)
  if (subject === null || stage === null) return
  state.traits = { ...(state.traits ?? {}) }
  state.traits[subject.trait] = (state.traits[subject.trait] ?? 0) + stage.gain
  state.courses = { ...(state.courses ?? {}) }
  state.courses[subject.key] = (state.courses[subject.key] ?? 0) + 1
  // Counted per stage AND per subject: that pair is what opens the next school.
  state.coursesByStage = { ...(state.coursesByStage ?? {}) }
  const perStage = { ...(state.coursesByStage[stage.key] ?? {}) }
  perStage[subject.key] = (perStage[subject.key] ?? 0) + 1
  state.coursesByStage[stage.key] = perStage
  // Running total per stage, kept for the panel and for older saves.
  state.lessonsByStage = { ...(state.lessonsByStage ?? {}) }
  state.lessonsByStage[stage.key] = (state.lessonsByStage[stage.key] ?? 0) + 1
  state.satiety = clamp100(state.satiety + stage.satiety)
  state.happiness = clamp100(state.happiness + stage.happiness)
  state.stats.courses += 1
  state.stats.lessons += 1
  applyEffects(state, { xp: stage.xp }, nowMs)
  remember(state, `${subject.emoji} 上完${stage.label}${subject.label}，${TRAITS[subject.trait].label} +${stage.gain}`, nowMs)
  announce(state, 'study', `${state.name} 学完${stage.label}${subject.label}，${TRAITS[subject.trait].label} +${stage.gain} 📚`, nowMs)
}

export function finishTrip(state, activity, nowMs) {
  const trip = tripByKey(activity.key)
  if (trip === null) return
  // Deterministic souvenir rotation keeps the mechanic testable without RNG —
  // and the rarity is a property of the souvenir, so "far trips are worth more"
  // is a fact about the table rather than a dice roll.
  const pick = trip.souvenirs[state.stats.trips % trip.souvenirs.length]
  const tier = rarityByKey(pick.rarity)
  state.souvenirs = [...(state.souvenirs ?? []), {
    key: pick.key, emoji: pick.emoji, label: pick.label,
    rarity: pick.rarity, story: pick.story,
    from: trip.key, fromLabel: trip.label,
  }]
  state.happiness = clamp100(state.happiness + trip.happiness)
  state.satiety = clamp100(state.satiety + trip.satiety)
  state.stats.trips += 1
  applyEffects(state, { xp: trip.xp }, nowMs)
  remember(state, `${trip.emoji} ${trip.label}回来，带回「${pick.label}」${tier.emoji}`, nowMs)
  announce(state, 'trip', `${state.name} 从${trip.label}回来了，带回「${pick.label}」${tier.emoji}🧳`, nowMs)
}

export function catchIllness(state, nowMs) {
  const chain = (state.stats.illnesses ?? 0) % ILLNESS_CHAINS.length
  state.illness = { chain, stage: 1, since: nowMs, progressMs: 0 }
  state.health = STAGE_HEALTH[0]
  state.stats.illnesses = (state.stats.illnesses ?? 0) + 1
  const ill = illnessAt(chain, 1)
  if (ill !== null) {
    remember(state, `得了${ill.name} 🤒`, nowMs)
    announce(state, 'sick', `${state.name} 得了${ill.name}，需要${ill.cure} 🤒`, nowMs)
  }
}

/**
 * @param {object} state
 * @param {number} nowMs
 * @param {import('./random.js').Roll} [next] - defaults to the pig's own seed.
 */
export function advanceIllness(state, nowMs, next = rollerFor(state)) {
  const chain = state.illness.chain
  const stage = state.illness.stage
  const worse = nextIllness(chain, stage)

  // Before it gets worse, it might just get better. An untreated cold shakes
  // itself off fairly often; the last stage never does.
  const healChance = SELF_HEAL_CHANCE[stage - 1] ?? 0
  if (chance(next, healChance)) {
    // #7: recovering means well again. Adding a single point left a pig that
    // survived a fever (health 3) dented for the rest of its life.
    state.illness = null
    state.health = MAX.health
    remember(state, `自己好了，扛过去了 💚`, nowMs)
    announce(state, 'cured', `${state.name} 的${ILLNESS_CHAINS[chain].name}自己好了 💚`, nowMs)
    return
  }

  if (worse === null) {
    die(state, nowMs, '没能撑过去')
    return
  }

  state.illness = { chain, stage: stage + 1, since: nowMs, progressMs: 0 }
  state.health = STAGE_HEALTH[stage]
  remember(state, `病情加重：${worse.name}`, nowMs)
  announce(state, 'worse', `${state.name} 的病情加重了：${worse.name}，需要${worse.cure}`, nowMs)
}

// ---------------------------------------------------------------------------
// Effects and level crossings
// ---------------------------------------------------------------------------
