// @ts-check
/**
 * 时间推进：衰减、疾病、结算、死亡。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/settlement
 */

import { DEFAULT_TIME_SCALE, GRAVE, ILLNESS_CHAINS, LIFESPAN_DAYS, MAX, REVIVE_ITEM, SELF_HEAL_CHANCE, SICK_AWAY_MULTIPLIER, SICK_PAY_MULTIPLIER, SICK_RISK_MINUTES, STAGE_HEALTH, THRESHOLDS, TRAITS, illnessAt, illnessStageMs, interestByKey, jobByKey, nextIllness, rarityByKey, schoolStageByKey, subjectByKey, traitBonus, tripByKey } from '../data.js'
import { ageDays, lifeStageFor } from './clock.js'
import { AWAY_DECAY_MULTIPLIER, AWAY_FLOOR, CLEANLINESS_DECAY_PER_MIN, HAPPINESS_DECAY_PER_MIN, SATIETY_DECAY_PER_MIN } from './constants.js'
import { announce, applyEffects, clamp100, remember } from './effects.js'

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

export function decay(state, nowMs) {
  const elapsedMs = Math.max(0, nowMs - (state.lastSeenAt ?? nowMs))
  state.lastSeenAt = nowMs
  if (elapsedMs <= 0) return state

  const minutes = elapsedMs / 60000
  // Read the away flag *before* settling: finishActivity clears `activity`, and
  // everything below needs to know whether this stretch was spent out of the
  // house. Getting this order wrong is what let a day trip come home sick.
  const away = state.activity !== null
  const speed = away ? AWAY_DECAY_MULTIPLIER : 1

  // Settle whatever the pig was away doing before anything else, so its payout
  // lands in the right order relative to decay.
  if (state.activity !== null && nowMs >= state.activity.endsAt) finishActivity(state, nowMs)

  if (state.dead) return state

  /**
   * Time passing, with one floor: an activity may not empty a bar on its own.
   * A pig back from a day trip should be ravenous and filthy — a welcome-home
   * meal and bath — not sitting at zero before you can even react to it.
   * Going away never *raises* a bar either.
   */
  // Pig time: elapsed real time times the scale. The birthday is kept only so
  // the panel can say when the pig arrived.
  const scale = Number.isFinite(state.timeScale) && state.timeScale > 0
    ? state.timeScale
    : DEFAULT_TIME_SCALE
  if (typeof state.ageMs !== 'number' || !Number.isFinite(state.ageMs)) {
    // First tick after loading an old save: seed pig time from the birthday.
    state.ageMs = typeof state.bornAt === 'number' ? Math.max(0, nowMs - state.bornAt) : 0
  } else {
    state.ageMs += elapsedMs * scale
  }

  const drain = (value, perMinute) => {
    const next = value - minutes * perMinute * speed
    return away ? Math.max(next, Math.min(value, AWAY_FLOOR)) : next
  }
  state.satiety = clamp100(drain(state.satiety, SATIETY_DECAY_PER_MIN))
  state.happiness = clamp100(drain(state.happiness, HAPPINESS_DECAY_PER_MIN))
  state.cleanliness = clamp100(drain(state.cleanliness, CLEANLINESS_DECAY_PER_MIN))

  // Illness only comes from being left at home. A pig that was out living its
  // life has not been neglected, and coming back sick every trip is not a game.
  if (away) {
    state.riskMinutes = 0
  } else {
    const neglected = state.satiety < THRESHOLDS.sickSatiety || state.cleanliness < THRESHOLDS.sickCleanliness
    state.riskMinutes = neglected ? (state.riskMinutes ?? 0) + minutes : 0
    if (state.illness === null && state.riskMinutes >= SICK_RISK_MINUTES) {
      state.riskMinutes = 0
      catchIllness(state, nowMs)
    }
  }

  // Illness advances on accumulated *effective* time, not wall clock: being out
  // and about while ill runs it at SICK_AWAY_MULTIPLIER, so a day of work costs
  // two days of illness and staying home is the cheap way to wait it out.
  if (state.illness !== null) {
    const rate = away ? SICK_AWAY_MULTIPLIER : 1
    const gained = elapsedMs * rate
    state.illness.progressMs = (state.illness.progressMs ?? 0) + gained
    let guard = 0
    while (state.illness !== null && guard < 16) {
      // Each stage has its own length, so it has to be re-read after every step.
      const stageMs = illnessStageMs(state.illness.stage)
      if (state.illness.progressMs < stageMs) break
      // Carry the excess into the next stage rather than dropping it.
      const carried = state.illness.progressMs - stageMs
      advanceIllness(state, nowMs)
      if (state.illness !== null) state.illness.progressMs = carried
      guard += 1
    }
  }

  // Time does the growing now, not XP. Age passes whether or not anyone is
  // watching, so a pig left alone comes back a day older.
  if (state.dead !== true && state.hatched === true) {
    const stage = lifeStageFor(state, nowMs)
    if (state.stage !== stage.key) {
      state.stage = stage.key
      remember(state, `长成了${stage.label} ${stage.emoji}`, nowMs)
      announce(state, 'stage', `${state.name} 长成了${stage.label} ${stage.emoji}`, nowMs)
    }
    if (ageDays(state, nowMs) >= LIFESPAN_DAYS) die(state, nowMs, '老了')
  }

  return state
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

export function advanceIllness(state, nowMs) {
  const chain = state.illness.chain
  const stage = state.illness.stage
  const worse = nextIllness(chain, stage)

  // Before it gets worse, it might just get better. An untreated cold shakes
  // itself off fairly often; the last stage never does.
  const healChance = SELF_HEAL_CHANCE[stage - 1] ?? 0
  if (healChance > 0 && Math.random() < healChance) {
    state.illness = null
    state.health = Math.min(MAX.health, state.health + 1)
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
