/**
 * dsh-pig · core — the pure pig model.
 *
 * No IO, no ctx, no clock of its own: every function takes the current time as
 * a parameter, so the whole game model is testable in isolation. Nothing here
 * schedules a timer — shifts, courses, trips, illness progression and decay are
 * all resolved lazily from timestamps, which is why the pig survives restarts
 * and why the tests never have to wait.
 *
 * Three ways the pig changes:
 *   - `feed()`  digests a *passive* harness event (a turn ended, a tool ran)
 *   - `act()`   applies a *deliberate* care action (feed it, bathe it, play)
 *   - `buy()` / `useItem()` / `start*()` drive the game loop
 *
 * Time away from the desk is one concept, not three: work, study and travel all
 * become a single `activity` record, so "is the pig home?" has exactly one
 * answer and `decay()` has exactly one place to settle it.
 *
 * @module dsh-pig/core
 */

import {
  AWAY_MULTIPLIER,
  CARE_KIND,
  DEFAULT_TOY,
  ILLNESS_CHAINS,
  ILLNESS_STAGE_MINUTES,
  JOBS,
  KIND_ORDER,
  MAX,
  REVIVE_ITEM,
  SCHOOL_STAGES,
  SHOP,
  SICK_RISK_MINUTES,
  SLEEPY_AFTER_MINUTES,
  STAGE_HEALTH,
  SUBJECTS,
  THRESHOLDS,
  TRAITS,
  TRAIT_ORDER,
  TRIPS,
  illnessAt,
  itemByKey,
  jobByKey,
  careItems,
  medicineForStage,
  nextIllness,
  schoolStageByKey,
  stageProgress,
  stageUnlocked,
  subjectByKey,
  tripByKey,
} from './data.js'

/** Bumped when the saved shape changes in a way migrate() must handle. */
export const STATE_VERSION = 4

const BIRTH_WEIGHT_G = 1200
const HATCH_WEIGHT_G = 160
const MEMORY_LIMIT = 8
const PENDING_LIMIT = 6

/** Growth ladder, ascending by xp. */
/**
 * Growth ladder, ascending by xp.
 *
 * Tuned so that ordinary passive work alone takes roughly: 7 minutes to 小猪崽,
 * 40 minutes to 圆滚猪, an afternoon to 大猪猪, a few days to 猪皇, a week or so
 * to 猪王, and the best part of a month of real use to 野猪王. Sending the pig
 * out to work or study is worth several hours of watching you type, so playing
 * the game is the fast lane.
 */
export const STAGES = Object.freeze([
  { level: 1, xp: 0, emoji: '🥚', title: '猪蛋', line: '还没孵出来，安静地躺着' },
  { level: 2, xp: 20, emoji: '🐖', title: '小猪崽', line: '刚睁眼，什么都想吃' },
  { level: 3, xp: 120, emoji: '🐖', title: '圆滚猪', line: '圆滚滚的，走路会晃' },
  { level: 4, xp: 600, emoji: '🐖', title: '大猪猪', line: '很有分量，会一屁股坐住你的椅子' },
  { level: 5, xp: 2200, emoji: '🐖', title: '猪皇', line: '👑 猪中至尊，吃饭要人喂' },
  { level: 6, xp: 6000, emoji: '🐖', title: '猪王', line: '村里最体面的猪，走路带风' },
  { level: 7, xp: 15000, emoji: '🐗', title: '野猪王', line: '返祖了，獠牙毕露' },
])

/**
 * Passive diet — what the pig gets for watching you actually work.
 *
 * These numbers are deliberately small. A single tool call used to be worth 3,
 * and a heavy agent session fires hundreds of them an hour: one afternoon of
 * ordinary use was 2232 XP, 94% of the whole pig, and it hit 「猪皇」 without the
 * player ever sending it to work or school. Passive work is now a trickle; the
 * activities are where the growth is.
 */
const DIET = Object.freeze({
  message: { xp: 1, satiety: 1, happiness: 1, weightG: 6 },
  turn: { xp: 2, satiety: 2, happiness: 1, weightG: 14 },
  tool: { xp: 1, satiety: 2, happiness: 0, weightG: 9 },
  toolError: { xp: 1, satiety: 0, happiness: 1, weightG: 2 },
  agentError: { xp: 1, satiety: 0, happiness: 0, weightG: 2 },
})

export const ACTIONS = Object.freeze({
  feed: {
    key: 'feed', label: '喂食', emoji: '🍎', verb: '吃了一口 🍎',
    // No blanket cleanliness hit: eating an apple does not make you dirty. Only
    // the foods that are actually messy declare a penalty of their own.
    cooldownMs: 60_000, satiety: 22, happiness: 6, cleanliness: 0, xp: 4, weightG: 90,
  },
  bathe: {
    key: 'bathe', label: '洗澡', emoji: '🛁', verb: '洗了个澡 🛁',
    cooldownMs: 90_000, satiety: -2, happiness: 8, cleanliness: 50, xp: 3, weightG: 0,
  },
  play: {
    key: 'play', label: '玩耍', emoji: '🎾', verb: '玩了一会儿 🎾',
    cooldownMs: 45_000, satiety: -5, happiness: 16, cleanliness: -4, xp: 3, weightG: 4,
  },
  pet: {
    key: 'pet', label: '摸摸', emoji: '❤️', verb: '被摸了摸头 ❤️',
    cooldownMs: 0, satiety: 0, happiness: 10, cleanliness: 0, xp: 1, weightG: 0,
  },
})

export const ACTION_ORDER = Object.freeze(['feed', 'bathe', 'play', 'pet'])

// Tuned against the activity lengths, not against minutes. A four-hour shift
// now costs roughly one meal and one bath, which is recoverable; the old rates
// were written when a shift was ten minutes and emptied every bar twice over.
const SATIETY_DECAY_PER_MIN = 0.08
const HAPPINESS_DECAY_PER_MIN = 0.06
const CLEANLINESS_DECAY_PER_MIN = 0.07
const AWAY_DECAY_MULTIPLIER = 1.4
/** No single trip may push a bar below this — see the drain() comment in decay. */
const AWAY_FLOOR = 15

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const clamp100 = value => clamp(value, 0, 100)

// ---------------------------------------------------------------------------
// Growth
// ---------------------------------------------------------------------------

export function stageFor(xp) {
  let stage = STAGES[0]
  for (const candidate of STAGES) if (xp >= candidate.xp) stage = candidate
  return stage
}

export const nextStageFor = xp => STAGES.find(candidate => candidate.xp > xp) ?? null

export function xpToNext(xp) {
  const next = nextStageFor(xp)
  return next === null ? null : next.xp - xp
}

// ---------------------------------------------------------------------------
// Creation and migration
// ---------------------------------------------------------------------------

export function layEgg(nowMs) {
  return {
    version: STATE_VERSION,
    name: '猪猪',
    bornAt: nowMs,
    hatched: false,
    dead: false,
    xp: 0,
    weightG: BIRTH_WEIGHT_G,
    satiety: 70,
    happiness: 70,
    cleanliness: 90,
    health: MAX.health,
    coins: 60,
    inventory: {},
    traits: { intel: 0, charm: 0, strong: 0 },
    courses: {},
    // Finished lessons per school stage. QQ Pet starts every pet at 小学 and
    // `college` / `graduate` sit behind it; this is what opens them.
    lessonsByStage: { primary: 0, college: 0, graduate: 0 },
    souvenirs: [],
    illness: null,
    activity: null,
    riskMinutes: 0,
    lastFedAt: 0,
    lastActiveAt: nowMs,
    lastSeenAt: nowMs,
    cooldowns: {},
    pending: [],
    memories: [],
    stats: {
      turns: 0, messages: 0, tools: 0, toolErrors: 0, agentErrors: 0,
      levelUps: 0, feeds: 0, baths: 0, plays: 0, pets: 0,
      jobs: 0, coinsEarned: 0, purchases: 0, illnesses: 0, cures: 0, deaths: 0, revives: 0,
      courses: 0, lessons: 0, trips: 0,
    },
  }
}

export const HATCH_XP = STAGES[1].xp

export function hatchEgg(nowMs) {
  const state = layEgg(nowMs)
  state.xp = HATCH_XP
  state.hatched = true
  state.weightG += HATCH_WEIGHT_G
  state.stats.levelUps = 1
  remember(state, '从蛋壳里钻出来了 🐣', nowMs)
  return state
}

/** Fill in anything a hand-edited or older save is missing. */
export function migrate(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const egg = layEgg(typeof raw.bornAt === 'number' ? raw.bornAt : Date.now())
  const state = { ...egg, ...raw }
  state.version = STATE_VERSION
  state.stats = { ...egg.stats, ...(asObject(raw.stats) ?? {}) }
  state.cooldowns = { ...(asObject(raw.cooldowns) ?? {}) }
  state.inventory = sanitizeInventory(raw.inventory)
  state.traits = sanitizeTraits(raw.traits)
  state.courses = sanitizeCourses(raw.courses)
  state.lessonsByStage = sanitizeLessonsByStage(raw.lessonsByStage, raw.courses)
  state.souvenirs = Array.isArray(raw.souvenirs) ? raw.souvenirs.filter(s => typeof s === 'string').slice(-40) : []
  state.pending = []
  state.memories = Array.isArray(raw.memories)
    ? raw.memories.filter(m => typeof m === 'string').slice(-MEMORY_LIMIT)
    : []

  for (const key of ['xp', 'weightG', 'satiety', 'happiness', 'cleanliness', 'health', 'coins', 'riskMinutes', 'bornAt', 'lastFedAt', 'lastActiveAt', 'lastSeenAt']) {
    if (typeof state[key] !== 'number' || !Number.isFinite(state[key])) state[key] = egg[key]
  }
  if (typeof raw.cleanliness !== 'number') state.cleanliness = egg.cleanliness
  if (typeof raw.health !== 'number') state.health = raw.dead === true ? 0 : MAX.health
  if (typeof raw.coins !== 'number') state.coins = egg.coins
  if (typeof state.name !== 'string' || state.name.trim() === '') state.name = egg.name

  state.health = clamp(Math.round(state.health), 0, MAX.health)
  state.satiety = clamp100(state.satiety)
  state.happiness = clamp100(state.happiness)
  state.cleanliness = clamp100(state.cleanliness)
  state.coins = Math.max(0, Math.floor(state.coins))
  state.illness = sanitizeIllness(raw.illness)
  state.activity = sanitizeActivity(raw.activity ?? raw.work)
  state.dead = state.dead === true || state.health <= 0
  state.hatched = state.hatched === true || state.xp > 0
  return state
}

function asObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null
}

function sanitizeInventory(raw) {
  const source = asObject(raw)
  if (source === null) return {}
  const out = {}
  for (const [key, count] of Object.entries(source)) {
    if (!Number.isFinite(count)) continue
    const n = Math.floor(count)
    if (n > 0 && SHOP.some(item => item.key === key)) out[key] = n
  }
  return out
}

function sanitizeTraits(raw) {
  const source = asObject(raw)
  const out = {}
  for (const key of TRAIT_ORDER) {
    const value = source?.[key]
    out[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  }
  return out
}

function sanitizeCourses(raw) {
  const source = asObject(raw)
  if (source === null) return {}
  const out = {}
  for (const [key, level] of Object.entries(source)) {
    if (!Number.isFinite(level)) continue
    const n = Math.floor(level)
    if (n > 0 && subjectByKey(key) !== null) out[key] = n
  }
  return out
}

/**
 * Lesson counts per school stage.
 *
 * A save written before the stage ladder existed only has per-subject totals,
 * and no way to say which stage they came from. Rather than locking an existing
 * player out of everything, assume those lessons were the entry stage — which is
 * the only one that existed to them.
 */
function sanitizeLessonsByStage(raw, rawCourses) {
  const source = asObject(raw)
  const out = {}
  for (const stage of SCHOOL_STAGES) out[stage.key] = 0
  if (source !== null) {
    for (const stage of SCHOOL_STAGES) {
      const n = source[stage.key]
      if (Number.isFinite(n) && n > 0) out[stage.key] = Math.floor(n)
    }
  }
  const total = Object.values(out).reduce((sum, n) => sum + n, 0)
  if (total === 0) {
    const legacy = Object.values(sanitizeCourses(rawCourses)).reduce((sum, n) => sum + n, 0)
    if (legacy > 0) out[SCHOOL_STAGES[0].key] = legacy
  }
  return out
}

function sanitizeIllness(raw) {
  const source = asObject(raw)
  if (source === null) return null
  const chain = Number.isInteger(source.chain) ? source.chain : -1
  const stage = Number.isInteger(source.stage) ? source.stage : 0
  if (chain < 0 || chain >= ILLNESS_CHAINS.length) return null
  if (stage < 1 || stage > ILLNESS_CHAINS[chain].stages.length) return null
  return { chain, stage, since: Number.isFinite(source.since) ? source.since : Date.now() }
}

/** Accepts both the v4 `activity` record and the v3 `work` record. */
function sanitizeActivity(raw) {
  const source = asObject(raw)
  if (source === null) return null
  if (!Number.isFinite(source.endsAt)) return null
  const kind = source.kind ?? 'work'
  if (!['work', 'study', 'trip'].includes(kind)) return null
  const known = kind === 'work'
    ? jobByKey(source.key ?? source.job) !== null
    : kind === 'study'
      ? subjectByKey(source.key) !== null
      : tripByKey(source.key) !== null
  if (!known) return null
  return {
    kind,
    key: source.key ?? source.job,
    stage: kind === 'study' && schoolStageByKey(source.stage) !== null ? source.stage : undefined,
    label: typeof source.label === 'string' ? source.label : '',
    emoji: typeof source.emoji === 'string' ? source.emoji : '',
    startedAt: Number(source.startedAt) || 0,
    endsAt: source.endsAt,
    cost: Number(source.cost) || 0,
  }
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

function clock(nowMs) {
  const d = new Date(nowMs)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function remember(state, text, nowMs) {
  state.memories.push(`[${clock(nowMs)}] ${text}`)
  if (state.memories.length > MEMORY_LIMIT) state.memories.splice(0, state.memories.length - MEMORY_LIMIT)
}

function announce(state, kind, text) {
  state.pending = Array.isArray(state.pending) ? state.pending : []
  state.pending.push({ kind, text, at: Date.now() })
  if (state.pending.length > PENDING_LIMIT) state.pending.splice(0, state.pending.length - PENDING_LIMIT)
}

function takePending(state) {
  const out = Array.isArray(state.pending) ? state.pending.slice() : []
  state.pending = []
  return out
}

/** Take and clear the queued announcements. */
export function drainPending(state) {
  return takePending(state)
}

/** Inventory counts, always including zeroes so the UI can render a grid. */
export function inventoryView(state) {
  const out = {}
  for (const item of SHOP) out[item.key] = state.inventory?.[item.key] ?? 0
  // The free default toy is always in the bag and never runs out, so `玩耍` is
  // never blocked by an empty one.
  out[DEFAULT_TOY.key] = Infinity
  return out
}

/** Which shelves the pig can actually use right now, for the panel's picker. */
export function careView(state) {
  const out = {}
  for (const action of ['feed', 'bathe', 'play']) out[action] = careOptions(state, action)
  return out
}

/** Per-stage lesson counts plus whether the next rung is open yet. */
export function studyView(state) {
  const lessons = state.lessonsByStage ?? {}
  return SCHOOL_STAGES.map(stage => ({
    key: stage.key,
    label: stage.label,
    minutes: stage.minutes,
    tuition: stage.tuition,
    gain: stage.gain,
    unlocked: stageUnlocked(stage, lessons),
    progress: stageProgress(stage, lessons),
  }))
}

/** Trait totals, always including every trait. */
export function traitView(state) {
  const out = {}
  for (const key of TRAIT_ORDER) out[key] = state.traits?.[key] ?? 0
  return out
}

/** Levels per subject, always including every subject (0 = never studied). */
export function courseView(state) {
  const out = {}
  for (const subject of SUBJECTS) out[subject.key] = state.courses?.[subject.key] ?? 0
  return out
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

  if (state.illness !== null) {
    const stageMs = ILLNESS_STAGE_MINUTES * 60000
    while (state.illness !== null && nowMs - state.illness.since >= stageMs) {
      advanceIllness(state, nowMs)
    }
  }

  return state
}

function finishActivity(state, nowMs) {
  const activity = state.activity
  state.activity = null
  if (activity === null) return
  state.lastActiveAt = nowMs
  if (activity.kind === 'work') finishWork(state, activity, nowMs)
  else if (activity.kind === 'study') finishStudy(state, activity, nowMs)
  else if (activity.kind === 'trip') finishTrip(state, activity, nowMs)
}

function finishWork(state, activity, nowMs) {
  const job = jobByKey(activity.key)
  if (job === null) return
  state.coins += job.coins
  state.satiety = clamp100(state.satiety + job.satiety)
  state.cleanliness = clamp100(state.cleanliness + job.cleanliness)
  state.stats.jobs += 1
  state.stats.coinsEarned += job.coins
  const crossed = applyEffects(state, { xp: job.xp }, nowMs)
  remember(state, `${job.emoji} ${job.label}回来，赚了 ${job.coins} 金币`, nowMs)
  announce(state, 'work', `${state.name} 打工回来了！赚到 ${job.coins} 金币 💰`)
  for (const stage of crossed) announce(state, 'levelup', `长成了「${stage.title}」${stage.emoji}`)
}

function finishStudy(state, activity, nowMs) {
  const subject = subjectByKey(activity.key)
  const stage = schoolStageByKey(activity.stage)
  if (subject === null || stage === null) return
  state.traits = { ...(state.traits ?? {}) }
  state.traits[subject.trait] = (state.traits[subject.trait] ?? 0) + stage.gain
  state.courses = { ...(state.courses ?? {}) }
  state.courses[subject.key] = (state.courses[subject.key] ?? 0) + 1
  // Counted per stage, because that is what unlocks the next school.
  state.lessonsByStage = { ...(state.lessonsByStage ?? {}) }
  state.lessonsByStage[stage.key] = (state.lessonsByStage[stage.key] ?? 0) + 1
  state.satiety = clamp100(state.satiety + stage.satiety)
  state.happiness = clamp100(state.happiness + stage.happiness)
  state.stats.courses += 1
  state.stats.lessons += 1
  const crossed = applyEffects(state, { xp: stage.xp }, nowMs)
  remember(state, `${subject.emoji} 上完${stage.label}${subject.label}，${TRAITS[subject.trait].label} +${stage.gain}`, nowMs)
  announce(state, 'study', `${state.name} 学完${stage.label}${subject.label}，${TRAITS[subject.trait].label} +${stage.gain} 📚`)
  for (const stage_ of crossed) announce(state, 'levelup', `长成了「${stage_.title}」${stage_.emoji}`)
}

function finishTrip(state, activity, nowMs) {
  const trip = tripByKey(activity.key)
  if (trip === null) return
  // Deterministic souvenir rotation keeps the mechanic testable without RNG.
  const souvenir = trip.souvenirs[state.stats.trips % trip.souvenirs.length]
  state.souvenirs = [...(state.souvenirs ?? []), souvenir]
  state.happiness = clamp100(state.happiness + trip.happiness)
  state.satiety = clamp100(state.satiety + trip.satiety)
  state.stats.trips += 1
  const crossed = applyEffects(state, { xp: trip.xp }, nowMs)
  remember(state, `${trip.emoji} ${trip.label}回来，带回「${souvenir}」`, nowMs)
  announce(state, 'trip', `${state.name} 从${trip.label}回来了，带回「${souvenir}」🧳`)
  for (const stage of crossed) announce(state, 'levelup', `长成了「${stage.title}」${stage.emoji}`)
}

function catchIllness(state, nowMs) {
  const chain = (state.stats.illnesses ?? 0) % ILLNESS_CHAINS.length
  state.illness = { chain, stage: 1, since: nowMs }
  state.health = STAGE_HEALTH[0]
  state.stats.illnesses = (state.stats.illnesses ?? 0) + 1
  const ill = illnessAt(chain, 1)
  if (ill !== null) {
    remember(state, `得了${ill.name} 🤒`, nowMs)
    announce(state, 'sick', `${state.name} 得了${ill.name}，需要${ill.cure} 🤒`)
  }
}

function advanceIllness(state, nowMs) {
  const chain = state.illness.chain
  const stage = state.illness.stage
  const worse = nextIllness(chain, stage)

  if (worse === null) {
    state.health = 0
    state.dead = true
    state.illness = null
    state.activity = null
    state.stats.deaths = (state.stats.deaths ?? 0) + 1
    remember(state, '撑不住了 💀', nowMs)
    announce(state, 'death', `${state.name} 没能撑过去…用${REVIVE_ITEM.label}可以救回来`)
    return
  }

  state.illness = { chain, stage: stage + 1, since: nowMs }
  state.health = STAGE_HEALTH[stage]
  remember(state, `病情加重：${worse.name}`, nowMs)
  announce(state, 'worse', `${state.name} 的病情加重了：${worse.name}，需要${worse.cure}`)
}

// ---------------------------------------------------------------------------
// Effects and level crossings
// ---------------------------------------------------------------------------

function applyEffects(state, effects, nowMs) {
  const before = stageFor(state.xp).level
  if (effects.xp) state.xp += effects.xp
  if (effects.satiety) state.satiety = clamp100(state.satiety + effects.satiety)
  if (effects.happiness) state.happiness = clamp100(state.happiness + effects.happiness)
  if (effects.cleanliness) state.cleanliness = clamp100(state.cleanliness + effects.cleanliness)
  if (effects.weightG) state.weightG = Math.max(400, state.weightG + effects.weightG)
  if (effects.health) state.health = clamp(Math.round(state.health + effects.health), 0, MAX.health)
  state.lastActiveAt = nowMs

  const crossed = []
  const after = stageFor(state.xp).level
  for (let level = before + 1; level <= after; level += 1) {
    const stage = STAGES.find(s => s.level === level)
    if (stage !== undefined) {
      crossed.push(stage)
      state.stats.levelUps += 1
      remember(state, `长成了「${stage.title}」${stage.emoji}`, nowMs)
    }
  }
  return crossed
}

// ---------------------------------------------------------------------------
// Passive diet
// ---------------------------------------------------------------------------

export function feed(state, event, nowMs) {
  const diet = DIET[event]
  if (diet === undefined) return []
  decay(state, nowMs)
  if (state.dead) return []
  switch (event) {
    case 'message': state.stats.messages += 1; break
    case 'turn': state.stats.turns += 1; break
    case 'tool': state.stats.tools += 1; break
    case 'toolError': state.stats.toolErrors += 1; break
    case 'agentError': state.stats.agentErrors += 1; break
    default: break
  }
  return applyEffects(state, diet, nowMs)
}

// ---------------------------------------------------------------------------
// Care actions
// ---------------------------------------------------------------------------

export function actionCooldownSeconds(state, action, nowMs) {
  const spec = ACTIONS[action]
  if (spec === undefined || spec.cooldownMs <= 0) return 0
  const last = state.cooldowns?.[action] ?? 0
  const remaining = spec.cooldownMs - (nowMs - last)
  return remaining <= 0 ? 0 : Math.ceil(remaining / 1000)
}

export const actionReady = (state, action, nowMs) => actionCooldownSeconds(state, action, nowMs) === 0

export function act(state, action, nowMs, itemKey) {
  const spec = ACTIONS[action]
  if (spec === undefined) return { ok: false, reason: 'unknown' }
  if (state === null) return { ok: false, reason: 'absent' }
  decay(state, nowMs)
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null && action !== 'pet') return { ok: false, reason: 'away' }

  const wait = actionCooldownSeconds(state, action, nowMs)
  if (wait > 0) return { ok: false, reason: 'cooldown', wait }

  // Feeding, washing and playing each spend something off their own shelf —
  // QQ Pet keeps food, sundries and medicine in separate inventory categories
  // for exactly this reason. Petting is affection, and costs nothing.
  const shelf = CARE_KIND[action]
  let item = null
  if (shelf !== undefined) {
    item = resolveCareItem(state, shelf, itemKey)
    if (item === null) return { ok: false, reason: 'no-item', kind: shelf }
    if (item.default !== true) {
      const left = (state.inventory?.[item.key] ?? 0) - 1
      state.inventory = { ...(state.inventory ?? {}) }
      if (left > 0) state.inventory[item.key] = left
      else delete state.inventory[item.key]
    }
  }

  state.cooldowns = { ...(state.cooldowns ?? {}), [action]: nowMs }
  if (action === 'feed') { state.stats.feeds += 1; state.lastFedAt = nowMs }
  else if (action === 'bathe') state.stats.baths += 1
  else if (action === 'play') state.stats.plays += 1
  else if (action === 'pet') state.stats.pets += 1

  const crossed = applyEffects(state, careEffects(item, spec), nowMs)
  remember(state, item === null ? spec.verb : `${item.emoji} ${spec.label}用了「${item.label}」`, nowMs)
  return { ok: true, crossed, item: item === null ? null : item.key, spent: item !== null && item.default !== true }
}

/**
 * The item an action will spend: the caller's pick when it is actually in the
 * bag, otherwise the cheapest thing the pig owns. The free default toy makes
 * `play` always available.
 */
function resolveCareItem(state, kind, wanted) {
  const usable = careItems(kind).filter(
    item => item.default === true || (state.inventory?.[item.key] ?? 0) > 0,
  )
  if (usable.length === 0) return null
  if (wanted === undefined || wanted === null || wanted === '') return usable[0]
  return usable.find(item => item.key === wanted) ?? null
}

/**
 * Blend an item's own effects with the action's baseline. The item decides how
 * far its own bar moves; the action keeps whatever the item does not mention.
 */
function careEffects(item, spec) {
  if (item === null) return spec
  return {
    xp: spec.xp,
    weightG: item.satiety !== undefined && spec.key === 'feed' ? spec.weightG : 0,
    satiety: item.satiety ?? spec.satiety,
    happiness: item.happiness ?? spec.happiness,
    cleanliness: item.cleanliness ?? spec.cleanliness,
  }
}

/** What each care action could be done with right now, and how many are left. */
export function careOptions(state, action) {
  const kind = CARE_KIND[action]
  if (kind === undefined) return []
  return careItems(kind)
    .filter(item => item.default === true || (state.inventory?.[item.key] ?? 0) > 0)
    .map(item => ({
      key: item.key,
      label: item.label,
      emoji: item.emoji,
      price: item.price,
      default: item.default === true,
      count: item.default === true ? null : (state.inventory?.[item.key] ?? 0),
      satiety: item.satiety ?? 0,
      happiness: item.happiness ?? 0,
      cleanliness: item.cleanliness ?? 0,
    }))
}

// ---------------------------------------------------------------------------
// Activities: work · study · trip
// ---------------------------------------------------------------------------

/** Why the pig cannot head out right now, or null when it can. */
export function awayBlockedReason(state) {
  if (state === null) return 'absent'
  if (state.dead) return 'dead'
  if (state.activity !== null) return 'away'
  if (state.illness !== null) return 'sick'
  return null
}

/** Whether the pig is free to go out. */
export function canStartActivity(state) {
  return awayBlockedReason(state) === null
}

/** Back-compat alias. */
export const canWork = canStartActivity

/** Start the named activity. Returns `{ ok, activity }` or `{ ok:false, reason }`. */
function begin(state, activity, nowMs) {
  decay(state, nowMs)
  const blocked = awayBlockedReason(state)
  if (blocked !== null) return { ok: false, reason: blocked }
  state.activity = { ...activity, startedAt: nowMs, endsAt: nowMs + activity.minutes * 60000 }
  state.lastActiveAt = nowMs
  return { ok: true, activity: state.activity }
}

export function startWork(state, jobKey, nowMs) {
  const job = jobByKey(jobKey)
  if (job === null) return { ok: false, reason: 'unknown' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.illness !== null) return { ok: false, reason: 'sick' }
  if (state.satiety < 15) return { ok: false, reason: 'hungry' }
  const result = begin(state, {
    kind: 'work', key: job.key, label: job.label, emoji: job.emoji, minutes: job.minutes, cost: 0,
  }, nowMs)
  if (result.ok) remember(state, `${job.emoji} 出门${job.label}去了`, nowMs)
  return result
}

export function startStudy(state, subjectKey, stageKey, nowMs) {
  const subject = subjectByKey(subjectKey)
  const stage = schoolStageByKey(stageKey)
  if (subject === null || stage === null) return { ok: false, reason: 'unknown' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.illness !== null) return { ok: false, reason: 'sick' }
  // The stage ladder: 小学 first, then every subject once before 大学 opens.
  if (!stageUnlocked(stage, state.lessonsByStage)) {
    return { ok: false, reason: 'locked', need: stageProgress(stage, state.lessonsByStage) }
  }
  if (state.coins < stage.tuition) return { ok: false, reason: 'poor', price: stage.tuition }
  if (state.satiety < 15) return { ok: false, reason: 'hungry' }

  state.coins -= stage.tuition
  const result = begin(state, {
    kind: 'study', key: subject.key, stage: stage.key,
    label: `${stage.label}${subject.label}`, emoji: subject.emoji,
    minutes: stage.minutes, cost: stage.tuition,
  }, nowMs)
  if (!result.ok) {
    state.coins += stage.tuition // refund if the pig turned out to be unavailable
    return result
  }
  remember(state, `${subject.emoji} 去上${stage.label}${subject.label}（学费 ${stage.tuition}）`, nowMs)
  return result
}

export function startTrip(state, tripKey, nowMs) {
  const trip = tripByKey(tripKey)
  if (trip === null) return { ok: false, reason: 'unknown' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.illness !== null) return { ok: false, reason: 'sick' }
  if (state.coins < trip.cost) return { ok: false, reason: 'poor', price: trip.cost }
  if (state.satiety < 15) return { ok: false, reason: 'hungry' }

  state.coins -= trip.cost
  const result = begin(state, {
    kind: 'trip', key: trip.key, label: trip.label, emoji: trip.emoji,
    minutes: trip.minutes, cost: trip.cost,
  }, nowMs)
  if (!result.ok) {
    state.coins += trip.cost
    return result
  }
  remember(state, `${trip.emoji} 出发去${trip.label}（花了 ${trip.cost} 金币）`, nowMs)
  return result
}

/** Seconds left on the current activity (0 when idle). */
export function activitySecondsLeft(state, nowMs) {
  if (state.activity === null) return 0
  return Math.max(0, Math.ceil((state.activity.endsAt - nowMs) / 60000 * 60))
}

/** Back-compat alias. */
export const workSecondsLeft = activitySecondsLeft

/** Bring the pig home early. Work forfeits pay; study and trips are refunded. */
export function callOffActivity(state, nowMs) {
  if (state.activity === null) return { ok: false, reason: 'idle' }
  const activity = state.activity
  state.activity = null
  if (activity.kind !== 'work' && activity.cost > 0) {
    state.coins += activity.cost
    remember(state, `${activity.emoji} 从${activity.label}提前回来了，钱退回来了`, nowMs)
    return { ok: true, refunded: activity.cost }
  }
  remember(state, `${activity.emoji} 从${activity.label}提前回来了，白跑一趟`, nowMs)
  return { ok: true, refunded: 0 }
}

/** Back-compat alias. */
export const callOffWork = callOffActivity

// ---------------------------------------------------------------------------
// Shop and inventory
// ---------------------------------------------------------------------------

export function buy(state, itemKey) {
  const item = itemByKey(itemKey)
  if (item === null) return { ok: false, reason: 'unknown' }
  if (state.dead && item.key !== REVIVE_ITEM.key) return { ok: false, reason: 'dead' }
  if (state.coins < item.price) return { ok: false, reason: 'poor', price: item.price }

  state.coins -= item.price
  state.inventory = { ...(state.inventory ?? {}) }
  state.inventory[item.key] = (state.inventory[item.key] ?? 0) + 1
  state.stats.purchases += 1
  remember(state, `买了 ${item.emoji} ${item.label}（-${item.price} 金币）`, Date.now())
  return { ok: true, item }
}

export const canAfford = (state, itemKey) => {
  const item = itemByKey(itemKey)
  return item !== null && state.coins >= item.price
}

export function useItem(state, itemKey, nowMs) {
  const item = itemByKey(itemKey)
  if (item === null) return { ok: false, reason: 'unknown' }
  const have = state.inventory?.[itemKey] ?? 0
  if (have <= 0) return { ok: false, reason: 'empty' }
  decay(state, nowMs)

  if (item.key === REVIVE_ITEM.key) {
    if (!state.dead) return { ok: false, reason: 'not-dead' }
    state.inventory[itemKey] = have - 1
    revive(state, nowMs)
    return { ok: true, item, crossed: [] }
  }
  if (state.dead) return { ok: false, reason: 'dead' }

  if (item.kind === 'medicine') {
    if (state.illness === null) return { ok: false, reason: 'not-sick' }
    const needed = medicineForStage(state.illness.stage)
    if (needed === null || needed.key !== item.key) {
      return { ok: false, reason: 'wrong-medicine', needs: needed }
    }
    state.inventory[itemKey] = have - 1
    state.illness = null
    state.health = MAX.health
    state.stats.cures = (state.stats.cures ?? 0) + 1
    remember(state, `吃了 ${item.emoji} ${item.label}，病好了`, nowMs)
    announce(state, 'cured', `${state.name} 吃了 ${item.label}，痊愈了 💚`)
    return { ok: true, item, crossed: [] }
  }

  if (state.activity !== null) return { ok: false, reason: 'away' }
  state.inventory[itemKey] = have - 1
  const crossed = applyEffects(state, item, nowMs)
  remember(state, `用了 ${item.emoji} ${item.label}`, nowMs)
  return { ok: true, item, crossed }
}

export function revive(state, nowMs) {
  state.dead = false
  state.health = MAX.health
  state.satiety = Math.max(state.satiety, 60)
  state.cleanliness = Math.max(state.cleanliness, 60)
  state.happiness = Math.max(state.happiness, 50)
  state.illness = null
  state.activity = null
  state.riskMinutes = 0
  state.stats.revives = (state.stats.revives ?? 0) + 1
  remember(state, `被 ${REVIVE_ITEM.label} 救了回来 ✨`, nowMs)
  announce(state, 'revived', `${state.name} 回来了 ✨`)
}

// ---------------------------------------------------------------------------
// Naming and mood
// ---------------------------------------------------------------------------

export function rename(state, rawName, nowMs) {
  const cleaned = String(rawName ?? '').replace(/\s+/g, ' ').trim()
  if (cleaned === '' || [...cleaned].length > 16) return null
  state.name = cleaned
  remember(state, `改名叫「${cleaned}」`, nowMs)
  return cleaned
}

const AWAY_MOODS = Object.freeze({
  work: { key: 'working', emoji: '💼', label: '在打工' },
  study: { key: 'studying', emoji: '📚', label: '在上课' },
  trip: { key: 'traveling', emoji: '🧳', label: '在旅行' },
})

export function mood(state, nowMs) {
  decay(state, nowMs)
  if (state.dead) return { key: 'dead', emoji: '💀', label: '已经走了' }
  if (state.illness !== null) {
    const ill = currentIllness(state)
    return { key: 'sick', emoji: '🤒', label: ill === null ? '生病了' : `得了${ill.name}` }
  }
  if (state.activity !== null) {
    const base = AWAY_MOODS[state.activity.kind] ?? AWAY_MOODS.work
    return { ...base, emoji: state.activity.emoji || base.emoji }
  }
  if (state.satiety < THRESHOLDS.hungry) return { key: 'hungry', emoji: '🍎', label: '饿了' }
  if (state.cleanliness < THRESHOLDS.dirty) return { key: 'dirty', emoji: '🫧', label: '该洗澡了' }
  if (nowMs - state.lastActiveAt > SLEEPY_AFTER_MINUTES * 60000) return { key: 'sleepy', emoji: '💤', label: '睡着了' }
  if (state.happiness >= 75) return { key: 'happy', emoji: '❤️', label: '很开心' }
  if (state.happiness < THRESHOLDS.lonely) return { key: 'lonely', emoji: '🥺', label: '有点孤单' }
  return { key: 'fine', emoji: '😊', label: '还不错' }
}

export const healthPercent = state => Math.round((clamp(state.health, 0, MAX.health) / MAX.health) * 100)

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const canFeed = (state, nowMs) => actionReady(state, 'feed', nowMs)
export const feedCooldownSeconds = (state, nowMs) => actionCooldownSeconds(state, 'feed', nowMs)

export const formatWeight = weightG => `${(weightG / 1000).toFixed(1)} kg`

export function bar(value, width = 10) {
  const filled = Math.round((clamp100(value) / 100) * width)
  return `${'▓'.repeat(filled)}${'░'.repeat(width - filled)}`
}

export { JOBS, SHOP, MAX, THRESHOLDS, REVIVE_ITEM, SUBJECTS, SCHOOL_STAGES, TRIPS, TRAITS, TRAIT_ORDER }
