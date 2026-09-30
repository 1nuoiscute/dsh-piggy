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
  GRAVE,
  LIFE_STAGES,
  LIFESPAN_DAYS,
  SOUL,
  SOUL_AFTER_DAYS,
  ILLNESS_CHAINS,
  DAYS_PER_MONTH,
  DEFAULT_TIME_SCALE,
  LEVEL_TITLES,
  illnessStageMs,
  xpForLevel,
  traitBonus,
  SELF_HEAL_CHANCE,
  SICK_AWAY_MULTIPLIER,
  SICK_PAY_MULTIPLIER,
  JOBS,
  KIND_ORDER,
  MAX,
  REVIVE_ITEM,
  SCHOOL_STAGES,
  SHOP,
  SICK_RISK_MINUTES,
  SLEEPY_AFTER_MINUTES,
  SOUVENIR_RARITY,
  STAGE_HEALTH,
  SUBJECTS,
  THRESHOLDS,
  TRAITS,
  TRAIT_ORDER,
  TRIPS,
  illnessAt,
  interestByKey,
  INTERESTS,
  itemByKey,
  jobByKey,
  jobRequirement,
  careItems,
  medicineForStage,
  nextIllness,
  rarityByKey,
  schoolStageByKey,
  stageProgress,
  stageSubjectKeys,
  stageUnlocked,
  subjectByKey,
  tripByKey,
} from './data.js'

/** Bumped when the saved shape changes in a way migrate() must handle. */
export const STATE_VERSION = 7

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
// Life — the pig is measured in days, not in points
//
// QQ Pet's pets hatch, grow up and eventually die; nothing in it is a level to
// grind. This is that idea, on a clock the pig can actually be watched against.
// XP still accumulates from real work, but it feeds *weight*: a fatter pig, not
// a higher one.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000

/**
 * The pig's age in days.
 *
 * This is accumulated *pig time*, not wall clock: `decay()` adds elapsed real
 * time times the time scale. Storing it this way means changing the scale only
 * affects the future — the pig does not suddenly jump from a piglet to elderly
 * because you raised the multiplier.
 */
export function ageDays(state, nowMs) {
  if (state === null) return 0
  if (typeof state.ageMs === 'number' && Number.isFinite(state.ageMs)) {
    return Math.max(0, state.ageMs / DAY_MS)
  }
  // Saves from before pig time existed only have a birthday.
  if (typeof state.bornAt !== 'number') return 0
  return Math.max(0, (nowMs - state.bornAt) / DAY_MS)
}

/** The pig's age in whole months, for display. */
export const ageMonths = (state, nowMs) => ageDays(state, nowMs) / DAYS_PER_MONTH

/** Which stage the pig is at right now: a box, a pig of some age, or a grave. */
export function lifeStageFor(state, nowMs) {
  if (state === null) return LIFE_STAGES[0]
  if (state.dead === true) return GRAVE
  if (state.hatched !== true) return LIFE_STAGES[0]
  const days = ageDays(state, nowMs)
  let stage = LIFE_STAGES[1]
  for (const candidate of LIFE_STAGES) {
    if (candidate.box === true) continue
    if (days >= candidate.from) stage = candidate
  }
  return stage
}

/** The next rung, or null once the pig is as grown as it gets. */
export function nextLifeStage(state, nowMs) {
  if (state === null || state.dead === true || state.hatched !== true) return null
  const days = ageDays(state, nowMs)
  return LIFE_STAGES.find(stage => stage.box !== true && stage.from > days) ?? null
}

/** Days remaining until that next rung, or null at the end of the line. */
export function daysToNextStage(state, nowMs) {
  const next = nextLifeStage(state, nowMs)
  return next === null ? null : Math.max(0, next.from - ageDays(state, nowMs))
}

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

/** The pig's level for a given XP total. Unbounded. */
export function levelFor(xp) {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0
  let level = 1
  while (level < 999 && value >= xpForLevel(level + 1)) level += 1
  return level
}

/** The title earned at this level. */
export function levelTitle(level) {
  let found = LEVEL_TITLES[0]
  for (const entry of LEVEL_TITLES) if (level >= entry.level) found = entry
  return found
}

/** How far into the current level, 0-1, plus the numbers behind it. */
export function levelProgress(xp) {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0
  const level = levelFor(value)
  const floor = xpForLevel(level)
  const ceiling = xpForLevel(level + 1)
  const span = Math.max(1, ceiling - floor)
  return {
    level,
    xp: value,
    floor,
    ceiling,
    toNext: Math.max(0, ceiling - value),
    percent: Math.max(0, Math.min(100, Math.round(((value - floor) / span) * 100))),
    title: levelTitle(level),
  }
}

/** Has the pig outlived its span? */
export const isElderly = (state, nowMs) => ageDays(state, nowMs) >= LIFESPAN_DAYS

/** Has the grave been left alone long enough for the soul to settle on it? */
export const hasSoul = (state, nowMs) =>
  state !== null && state.dead === true && (nowMs - (state.diedAt ?? nowMs)) / DAY_MS >= SOUL_AFTER_DAYS

/**
 * Let the pig go. Used by illness at the end of a chain and by old age.
 * @param {string} why - shown in the announcement.
 */
function die(state, nowMs, why) {
  if (state.dead === true) return
  state.dead = true
  state.health = 0
  state.illness = null
  state.activity = null
  state.diedAt = nowMs
  state.stats.deaths = (state.stats.deaths ?? 0) + 1
  remember(state, `${why} ${GRAVE.emoji}`, nowMs)
  announce(state, 'death', `${state.name} ${why}…用${REVIVE_ITEM.label}可以救回来，也可以领养一只新的`)
}

/**
 * Wipe the pig and start from a fresh box, whatever state it was in.
 *
 * `adopt` only works once a pig has died, which meant there was no way to start
 * over with a living one short of deleting the save file by hand — and the
 * running host holds the state in memory, so editing the file does not even
 * work while it is up.
 */
export function reset(nowMs) {
  return layEgg(nowMs)
}

/**
 * What a new pig inherits from the old one.
 *
 * This is the whole point of the two-axis design: the body dies, the history
 * does not. Level, schooling, traits and souvenirs carry over, so losing a pig
 * to old age is a chapter break rather than a wipe.
 */
const INHERITED = ['xp', 'traits', 'courses', 'coursesByStage', 'lessonsByStage', 'souvenirs']

export function inherit(oldState, fresh, nowMs) {
  if (oldState === null) return fresh
  for (const key of INHERITED) {
    if (oldState[key] !== undefined) fresh[key] = structuredCloneish(oldState[key])
  }
  if (Array.isArray(oldState.memories)) fresh.memories = oldState.memories.slice(-MEMORY_LIMIT)
  remember(fresh, '🐖 新的小猪来了，本事和收藏都留下了', nowMs)
  return fresh
}

/** JSON round-trip; every inherited field is plain data. */
function structuredCloneish(value) {
  try { return JSON.parse(JSON.stringify(value)) } catch (error) { return value }
}

/** Change how fast pig time runs. Only affects the future, never the past. */
export function setTimeScale(state, scale, nowMs) {
  if (state === null) return state
  const value = Number.isFinite(scale) && scale > 0 ? Math.min(365, scale) : DEFAULT_TIME_SCALE
  state.timeScale = value
  remember(state, `⏱ 时间倍率改成 ×${value}`, nowMs)
  return state
}

/** Put the pig's clock back to now, so its age counts real time again. */
export function ageFromNow(state, nowMs) {
  if (state === null) return state
  state.bornAt = nowMs
  state.ageMs = 0
  state.ageForced = false
  state.stage = lifeStageFor(state, nowMs).key
  state.lastSeenAt = nowMs
  remember(state, '🔧 年龄归零，从现在开始按真实时间算', nowMs)
  return state
}

/**
 * ---------------------------------------------------------------------------
 * Developer mode
 *
 * Applies an arbitrary patch to the pig so the panel can be driven into any
 * state without waiting days for it. Everything is clamped through the same
 * bounds the game uses, so dev mode can produce a *valid* state but never a
 * corrupt one — no negative coins, no health of 99, no dangling illness.
 * ---------------------------------------------------------------------------
 */

/** Numeric fields dev mode may set, with their legal range. */
const DEV_NUMBERS = Object.freeze({
  satiety: [0, 100],
  happiness: [0, 100],
  cleanliness: [0, 100],
  health: [0, MAX.health],
  coins: [0, 1_000_000],
  xp: [0, 10_000_000],
  weightG: [400, 500_000],
})

export function applyDevPatch(state, patch, nowMs) {
  if (state === null || typeof patch !== 'object' || patch === null) return state
  const before = { dead: state.dead, hatched: state.hatched, stage: state.stage }

  for (const [key, [lo, hi]] of Object.entries(DEV_NUMBERS)) {
    const value = patch[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      state[key] = clamp(Math.round(value), lo, hi)
    }
  }

  if (patch.traits !== null && typeof patch.traits === 'object') {
    state.traits = sanitizeTraits({ ...state.traits, ...patch.traits })
  }

  if (patch.illness === null) state.illness = null
  else if (typeof patch.illness === 'object' && patch.illness !== null) {
    state.illness = sanitizeIllness({ ...patch.illness, since: nowMs, progressMs: 0 })
  }

  if (patch.inventory !== null && typeof patch.inventory === 'object') {
    state.inventory = sanitizeInventory({ ...state.inventory, ...patch.inventory })
  }

  // Fast-forward: decay the pig as if `__advanceMs` had really passed. This is
  // the whole point of dev mode — the interesting states take days to reach.
  if (typeof patch.__advanceMs === 'number' && Number.isFinite(patch.__advanceMs) && patch.__advanceMs > 0) {
    state.lastSeenAt = nowMs - Math.min(patch.__advanceMs, 60 * 86_400_000)
    decay(state, nowMs)
  }

  // Age is the one thing worth jumping: it is what takes days to see.
  if (typeof patch.ageDays === 'number' && Number.isFinite(patch.ageDays)) {
    // Age is accumulated pig time, so both have to move or the stage will not.
    const days = Math.max(0, patch.ageDays)
    state.bornAt = nowMs - days * 86_400_000
    state.ageMs = days * 86_400_000
    // Mark it, so a forced age is never mistaken for the pig simply growing up.
    state.ageForced = true
  }

  if (patch.dead === true) {
    die(state, nowMs, '被开发者按死了')
  } else if (patch.dead === false && state.dead === true) {
    revive(state, nowMs)
  }

  if (patch.hatched === true && state.hatched !== true) state.hatched = true
  if (patch.hatched === false) {
    state.hatched = false
    state.dead = false
    state.diedAt = null
    state.stage = 'box'
  }

  if (patch.activity === null) state.activity = null
  if (patch.riskMinutes === 0) state.riskMinutes = 0

  state.stage = lifeStageFor(state, nowMs).key
  state.lastSeenAt = nowMs
  remember(state, `🔧 开发者改了状态（${before.stage} → ${state.stage}）`, nowMs)
  return state
}

/** Start over with a fresh box. The old pig's story stays in `memories`. */
export function adopt(state, nowMs) {
  const fresh = inherit(state, layEgg(nowMs), nowMs)
  remember(fresh, '又领养了一只，纸盒里传来窸窸窣窣的声音 📦', nowMs)
  return Object.assign(state ?? {}, fresh)
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
    /** When the pig died, so the grave can be left alone long enough for a soul. */
    diedAt: null,
    /** Last stage the panel announced; drives the "grew up" message. */
    stage: 'box',
    /** Accumulated pig time in ms — age is this, not wall clock. */
    ageMs: 0,
    /** 1 = the stage table is real months. See DEFAULT_TIME_SCALE. */
    timeScale: DEFAULT_TIME_SCALE,
    /** True when developer mode forced the age; the panel says so. */
    ageForced: false,
    xp: 0,
    weightG: BIRTH_WEIGHT_G,
    satiety: 70,
    happiness: 70,
    cleanliness: 90,
    health: MAX.health,
    // Enough to buy medicine on day one: at 60 a sick pig could not afford the
    // cheapest cure and had nothing left to earn it with.
    coins: 500,
    inventory: {},
    // 家当: dress items are bought once, owned forever, and worn.
    dress: [],
    worn: [],
    traits: { intel: 0, charm: 0, strong: 0 },
    courses: {},
    // Lessons finished per stage **and per subject**. Seven stages share subject
    // names (语文 is taught in 小学/中学/高中), so "how many lessons" cannot say
    // whether this stage's course list is complete — this can.
    coursesByStage: {},
    // 兴趣课修读次数（不是属性，只是记录学了几次）。
    interests: {},
    // Finished lessons per school stage, kept as the running total for the
    // panel and for saves written before the per-subject table existed.
    lessonsByStage: { preschool: 0, extracurricular: 0, primary: 0, middle: 0, high: 0, college: 0, graduate: 0 },
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
      courses: 0, lessons: 0, trips: 0, sales: 0, interests: 0,
    },
  }
}

/**
 * Open the box. The piglet falls out — it does not start as a fully grown pig,
 * and `ageDays` starts counting from the moment it does.
 */
/**
 * Open an existing box in place, keeping everything the save already has.
 * `hatchEgg` builds a brand new pig; this one just lets the piglet out.
 */
export function hatch(state, nowMs) {
  state.hatched = true
  state.bornAt = nowMs
  state.ageForced = false
  state.dead = false
  state.diedAt = null
  state.stage = 'piglet'
  state.weightG += HATCH_WEIGHT_G
  state.health = Math.max(state.health, 1)
  remember(state, '纸盒打开了，一只小猪蹦了出来 🐷', nowMs)
  return state
}

export function hatchEgg(nowMs) {
  const state = layEgg(nowMs)
  state.hatched = true
  state.bornAt = nowMs
  state.ageForced = false
  state.weightG += HATCH_WEIGHT_G
  state.stage = 'piglet'
  remember(state, '纸盒打开了，一只小猪蹦了出来 🐷', nowMs)
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
  state.dress = sanitizeDressList(raw.dress)
  // Only owned items can be worn, and unknown keys are dropped.
  state.worn = sanitizeDressList(raw.worn).filter(key => state.dress.includes(key))
  state.traits = sanitizeTraits(raw.traits)
  state.courses = sanitizeCourses(raw.courses)
  state.lessonsByStage = sanitizeLessonsByStage(raw.lessonsByStage, raw.courses)
  state.coursesByStage = sanitizeCoursesByStage(raw.coursesByStage, state.lessonsByStage)
  state.interests = sanitizeInterests(raw.interests)
  state.souvenirs = sanitizeSouvenirs(raw.souvenirs)
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
  // Starting money went 60 -> 500. A pig that hatched under the old number is
  // broke through no fault of its owner, so top it up once — and only once, by
  // keying off the version that was on disk when it was loaded.
  if ((typeof raw.version !== 'number' || raw.version < 5) && state.coins >= 0 && state.coins < egg.coins) {
    state.coins = egg.coins
  }
  if (typeof raw.diedAt !== 'number') state.diedAt = state.dead === true ? (raw.lastSeenAt ?? egg.bornAt) : null
  if (typeof state.stage !== 'string') state.stage = state.hatched === true ? 'piglet' : 'box'
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

/**
 * Per-stage, per-subject lesson counts.
 *
 * New saves carry the real table. Saves written before 0.18.0 only counted
 * lessons per stage, so the exact subjects are unknowable; credit that stage's
 * course list from the top until the old count runs out. A pig that had
 * finished 小学's nine lessons gets all six of the new 小学 courses — nobody
 * loses a school they had already opened.
 */
function sanitizeCoursesByStage(raw, lessonsByStage) {
  const source = asObject(raw)
  const out = {}
  if (source !== null) {
    for (const stage of SCHOOL_STAGES) {
      const entry = asObject(source[stage.key])
      if (entry === null) continue
      const counts = {}
      for (const key of stageSubjectKeys(stage)) {
        const value = entry[key]
        if (Number.isFinite(value) && value > 0) counts[key] = Math.floor(value)
      }
      if (Object.keys(counts).length > 0) out[stage.key] = counts
    }
    if (Object.keys(out).length > 0) return out
  }
  // Legacy saves counted lessons per stage only. Rebuild the ladder from the
  // bottom: having lessons in a stage means every stage below it was cleared,
  // and the stage itself is credited from its own count.
  let highest = -1
  for (const [index, stage] of SCHOOL_STAGES.entries()) {
    if (Math.floor(lessonsByStage?.[stage.key] ?? 0) > 0) highest = index
  }
  for (const [index, stage] of SCHOOL_STAGES.entries()) {
    if (index > highest) break
    const keys = stageSubjectKeys(stage)
    const counts = {}
    const done = index < highest ? keys.length : Math.floor(lessonsByStage?.[stage.key] ?? 0)
    for (const key of keys.slice(0, Math.min(done, keys.length))) counts[key] = 1
    if (Object.keys(counts).length > 0) out[stage.key] = counts
  }
  return out
}

/**
 * Souvenirs became objects in 0.20.0 so they could carry a rarity and a story.
 * A save written before that holds bare strings ("贝壳"); wrap them so an old
 * collection stays visible and sellable instead of being dropped.
 */
function sanitizeSouvenirs(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const entry of raw.slice(-40)) {
    if (typeof entry === 'string' && entry !== '') {
      out.push({ key: entry, emoji: '🎁', label: entry, rarity: 'common', story: '', from: null, fromLabel: '' })
      continue
    }
    const source = asObject(entry)
    if (source === null || typeof source.key !== 'string' || source.key === '') continue
    out.push({
      key: source.key,
      emoji: typeof source.emoji === 'string' && source.emoji !== '' ? source.emoji : '🎁',
      label: typeof source.label === 'string' && source.label !== '' ? source.label : source.key,
      rarity: typeof source.rarity === 'string' && SOUVENIR_RARITY[source.rarity] !== undefined ? source.rarity : 'common',
      story: typeof source.story === 'string' ? source.story : '',
      from: typeof source.from === 'string' ? source.from : null,
      fromLabel: typeof source.fromLabel === 'string' ? source.fromLabel : '',
    })
  }
  return out
}

/**
 * Owned / worn 装扮 keys. Unknown and duplicate keys are dropped, and only real
 * dress items survive, so a hand-edited save cannot dress the pig in a 药品.
 */
function sanitizeDressList(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const key of raw) {
    if (typeof key !== 'string') continue
    const item = itemByKey(key)
    if (item === null || item.kind !== 'dress' || out.includes(key)) continue
    out.push(key)
  }
  return out
}

/** How many times each 兴趣课 has been taken; unknown keys are dropped. */
function sanitizeInterests(raw) {
  const source = asObject(raw)
  if (source === null) return {}
  const out = {}
  for (const entry of INTERESTS) {
    const value = source[entry.key]
    if (Number.isFinite(value) && value > 0) out[entry.key] = Math.floor(value)
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
  return {
    chain,
    stage,
    since: Number.isFinite(source.since) ? source.since : Date.now(),
    progressMs: Number.isFinite(source.progressMs) ? Math.max(0, source.progressMs) : 0,
  }
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
  for (const item of SHOP) {
    // 家当 is not carried in counts — it is owned and worn.
    if (item.kind === 'dress') continue
    out[item.key] = state.inventory?.[item.key] ?? 0
  }
  // The free default toy is always in the bag and never runs out, so `玩耍` is
  // never blocked by an empty one.
  out[DEFAULT_TOY.key] = Infinity
  return out
}

/**
 * Owned / worn state for the 装扮 shelf, plus the level each one needs.
 *
 * The panel shows all twelve even when locked: an item you cannot see is an
 * item you will never save up for.
 */
export function dressView(state) {
  const owned = new Set(state.dress ?? [])
  const worn = new Set(state.worn ?? [])
  const have = levelProgress(state.xp).level
  return SHOP.filter(item => item.kind === 'dress').map(item => ({
    key: item.key, label: item.label, emoji: item.emoji, price: item.price,
    level: item.level ?? 1, blurb: item.blurb ?? '',
    owned: owned.has(item.key),
    worn: worn.has(item.key),
    unlocked: have >= (item.level ?? 1),
  }))
}

/** Which shelves the pig can actually use right now, for the panel's picker. */
export function careView(state) {
  const out = {}
  for (const action of ['feed', 'bathe', 'play']) out[action] = careOptions(state, action)
  return out
}

/** Per-stage lesson counts plus whether the next rung is open yet. */
export function studyView(state) {
  const byStage = state.coursesByStage ?? {}
  return SCHOOL_STAGES.map(stage => ({
    key: stage.key,
    label: stage.label,
    emoji: stage.emoji ?? '📚',
    minutes: stage.minutes,
    tuition: stage.tuition,
    gain: stage.gain,
    // The panel needs the course list per stage: seven stages share subjects.
    subjects: stageSubjectKeys(stage).slice(),
    lessons: state.lessonsByStage?.[stage.key] ?? 0,
    unlocked: stageUnlocked(stage, byStage),
    progress: stageProgress(stage, byStage),
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

/**
/**
 * 兴趣课的修读次数, per interest key.
 *
 * The point of 兴趣 is that it feeds an *existing* trait (智力/魅力/武力) — it
 * is not a fourth axis, so there is nothing else to track.
 */
export function interestView(state) {
  const out = {}
  for (const entry of INTERESTS) out[entry.key] = state.interests?.[entry.key] ?? 0
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
      announce(state, 'stage', `${state.name} 长成了${stage.label} ${stage.emoji}`)
    }
    if (ageDays(state, nowMs) >= LIFESPAN_DAYS) die(state, nowMs, '老了')
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
  else if (activity.kind === 'interest') finishInterest(state, activity, nowMs)
  else if (activity.kind === 'trip') finishTrip(state, activity, nowMs)
}

function finishInterest(state, activity, nowMs) {
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
  announce(state, 'study', `${state.name} 学会了${interest.label}，${TRAITS[interest.trait].label} +${interest.gain} ${interest.emoji}`)
}

function finishWork(state, activity, nowMs) {
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
    : `${state.name} 打工回来了！赚到 ${coins} 金币 💰`)
}

function finishStudy(state, activity, nowMs) {
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
  announce(state, 'study', `${state.name} 学完${stage.label}${subject.label}，${TRAITS[subject.trait].label} +${stage.gain} 📚`)
}

function finishTrip(state, activity, nowMs) {
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
  announce(state, 'trip', `${state.name} 从${trip.label}回来了，带回「${pick.label}」${tier.emoji}🧳`)
}

/**
 * Sell one souvenir from the collection.
 *
 * Souvenirs used to be strings with no way out of the list; now each one has a
 * rarity and a price, so the collection is a wallet as well as a shelf.
 *
 * @returns `{ok: true, sold, coins}` or `{ok: false, reason}`.
 */
export function sellSouvenir(state, souvenirKey, nowMs) {
  if (state === null || state === undefined) return { ok: false, reason: 'absent' }
  if (state.dead === true) return { ok: false, reason: 'dead' }
  const list = Array.isArray(state.souvenirs) ? state.souvenirs : []
  const index = list.findIndex(entry => entry !== null && typeof entry === 'object' && entry.key === souvenirKey)
  if (index < 0) return { ok: false, reason: 'not-owned' }
  const entry = list[index]
  const tier = rarityByKey(entry.rarity)
  state.souvenirs = [...list.slice(0, index), ...list.slice(index + 1)]
  state.coins += tier.price
  state.stats.sales = (state.stats.sales ?? 0) + 1
  remember(state, `把「${entry.label}」卖了 ${tier.price} 金币`, nowMs)
  return { ok: true, sold: entry.key, coins: tier.price, rarity: tier.key }
}

function catchIllness(state, nowMs) {
  const chain = (state.stats.illnesses ?? 0) % ILLNESS_CHAINS.length
  state.illness = { chain, stage: 1, since: nowMs, progressMs: 0 }
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

  // Before it gets worse, it might just get better. An untreated cold shakes
  // itself off fairly often; the last stage never does.
  const healChance = SELF_HEAL_CHANCE[stage - 1] ?? 0
  if (healChance > 0 && Math.random() < healChance) {
    state.illness = null
    state.health = Math.min(MAX.health, state.health + 1)
    remember(state, `自己好了，扛过去了 💚`, nowMs)
    announce(state, 'cured', `${state.name} 的${ILLNESS_CHAINS[chain].name}自己好了 💚`)
    return
  }

  if (worse === null) {
    die(state, nowMs, '没能撑过去')
    return
  }

  state.illness = { chain, stage: stage + 1, since: nowMs, progressMs: 0 }
  state.health = STAGE_HEALTH[stage]
  remember(state, `病情加重：${worse.name}`, nowMs)
  announce(state, 'worse', `${state.name} 的病情加重了：${worse.name}，需要${worse.cure}`)
}

// ---------------------------------------------------------------------------
// Effects and level crossings
// ---------------------------------------------------------------------------

function applyEffects(state, effects, nowMs) {
  if (effects.xp) state.xp += effects.xp
  if (effects.satiety) state.satiety = clamp100(state.satiety + effects.satiety)
  if (effects.happiness) state.happiness = clamp100(state.happiness + effects.happiness)
  if (effects.cleanliness) state.cleanliness = clamp100(state.cleanliness + effects.cleanliness)
  if (effects.weightG) state.weightG = Math.max(400, state.weightG + effects.weightG)
  if (effects.health) state.health = clamp(Math.round(state.health + effects.health), 0, MAX.health)
  state.lastActiveAt = nowMs
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

  applyEffects(state, careEffects(item, spec), nowMs)
  remember(state, item === null ? spec.verb : `${item.emoji} ${spec.label}用了「${item.label}」`, nowMs)
  return { ok: true, item: item === null ? null : item.key, spent: item !== null && item.default !== true }
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

/**
 * Health at or below which the pig is too weak to leave the house. The scale is
 * 5 = full, and the four illness stages set it to 4/3/2/1, so 1 is the last
 * stage before it dies.
 */
const TOO_WEAK_HEALTH = 1

/**
 * Why the pig cannot head out right now, or null when it can.
 *
 * Illness used to block this outright, which deadlocked the whole game:
 * sick → cannot work → no coins → cannot buy medicine → still sick, and the
 * only way out was to wait to die. A pig that can still stand up can go and
 * earn its own prescription; only one at death's door has to stay in bed.
 */
export function awayBlockedReason(state) {
  if (state === null) return 'absent'
  if (state.dead) return 'dead'
  if (state.activity !== null) return 'away'
  if (state.health <= TOO_WEAK_HEALTH) return 'weak'
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
  if (state.health <= TOO_WEAK_HEALTH) return { ok: false, reason: 'weak' }
  // The gate is checked before the pig walks out: an unqualified job is refused
  // with the exact axes it is short on, so the panel can point at 学习.
  const gate = jobRequirement(job, state.traits)
  if (gate !== null && !gate.ok) {
    return { ok: false, reason: 'underqualified', missing: gate.missing, job: job.key }
  }
  if (state.satiety < 15) return { ok: false, reason: 'hungry' }
  // The pig's trait shortens the shift; the pay bonus is applied on the way out.
  const points = state.traits?.[job.trait] ?? 0
  const bonus = traitBonus(job.trait, points)
  const minutes = Math.max(1, Math.round(job.minutes * bonus.minutes))
  const result = begin(state, {
    kind: 'work', key: job.key, label: job.label, emoji: job.emoji, minutes, cost: 0,
    trait: job.trait ?? null,
  }, nowMs)
  if (result.ok) {
    const saved = job.minutes - minutes
    remember(state, `${job.emoji} 出门${job.label}去了${saved > 0 ? `（${TRAITS[job.trait].label} ${points}，省了 ${saved} 分钟）` : ''}`, nowMs)
  }
  return result
}

export function startStudy(state, subjectKey, stageKey, nowMs) {
  const subject = subjectByKey(subjectKey)
  const stage = schoolStageByKey(stageKey)
  if (subject === null || stage === null) return { ok: false, reason: 'unknown' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.health <= TOO_WEAK_HEALTH) return { ok: false, reason: 'weak' }
  // A subject only exists inside the stages that teach it: 幼儿园 has no 物理,
  // and the route must refuse that rather than quietly charging tuition.
  if (!stageSubjectKeys(stage).includes(subject.key)) {
    return { ok: false, reason: 'wrong-stage', subject: subject.label, stage: stage.label }
  }
  // The stage ladder: every course of the stage below must have been attended.
  if (!stageUnlocked(stage, state.coursesByStage)) {
    return { ok: false, reason: 'locked', need: stageProgress(stage, state.coursesByStage) }
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

/**
 * 兴趣课 — like 上课, but outside the school ladder and repeatable.
 *
 * It pays into the same three traits (智力/魅力/武力); there is no separate
 * skill stat, because a skill stat would just be a second name for those three.
 */
export function startInterest(state, interestKey, nowMs) {
  const interest = interestByKey(interestKey)
  if (interest === null) return { ok: false, reason: 'unknown' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.health <= TOO_WEAK_HEALTH) return { ok: false, reason: 'weak' }
  if (state.coins < interest.cost) return { ok: false, reason: 'poor', price: interest.cost }
  if (state.satiety < 15) return { ok: false, reason: 'hungry' }

  state.coins -= interest.cost
  const result = begin(state, {
    kind: 'interest', key: interest.key,
    label: `兴趣·${interest.label}`, emoji: interest.emoji,
    minutes: interest.minutes, cost: interest.cost,
  }, nowMs)
  if (!result.ok) {
    state.coins += interest.cost
    return result
  }
  remember(state, `${interest.emoji} 去学${interest.label}（花了 ${interest.cost} 金币）`, nowMs)
  return result
}

export function startTrip(state, tripKey, nowMs) {
  const trip = tripByKey(tripKey)
  if (trip === null) return { ok: false, reason: 'unknown' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.health <= TOO_WEAK_HEALTH) return { ok: false, reason: 'weak' }
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

  // 家当 is a different transaction: own it once, then wear it. No counts.
  if (item.kind === 'dress') {
    if ((state.dress ?? []).includes(item.key)) return { ok: false, reason: 'owned', item }
    const have = levelProgress(state.xp).level
    const need = item.level ?? 1
    if (have < need) return { ok: false, reason: 'low-level', need, have, item }
    if (state.coins < item.price) return { ok: false, reason: 'poor', price: item.price }
    state.coins -= item.price
    state.dress = [...(state.dress ?? []), item.key]
    state.stats.purchases += 1
    remember(state, `买下了 ${item.emoji} ${item.label}（-${item.price} 金币）`, Date.now())
    return { ok: true, item }
  }

  if (state.coins < item.price) return { ok: false, reason: 'poor', price: item.price }

  state.coins -= item.price
  state.inventory = { ...(state.inventory ?? {}) }
  state.inventory[item.key] = (state.inventory[item.key] ?? 0) + 1
  state.stats.purchases += 1
  remember(state, `买了 ${item.emoji} ${item.label}（-${item.price} 金币）`, Date.now())
  return { ok: true, item }
}

/**
 * Put a dress item on (or take it off). Only owned items, only dress items.
 * @param {object} state
 * @param {string} itemKey
 * @param {boolean} on - true to wear, false to take off.
 */
export function wear(state, itemKey, on = true) {
  const item = itemByKey(itemKey)
  if (item === null || item.kind !== 'dress') return { ok: false, reason: 'unknown' }
  if (!(state.dress ?? []).includes(item.key)) return { ok: false, reason: 'not-owned' }
  const worn = new Set(state.worn ?? [])
  if (on) worn.add(item.key)
  else worn.delete(item.key)
  state.worn = [...worn]
  remember(state, on ? `戴上了 ${item.emoji} ${item.label}` : `摘下了 ${item.emoji} ${item.label}`, Date.now())
  return { ok: true, item, worn: state.worn.slice() }
}

export const canAfford = (state, itemKey) => {
  const item = itemByKey(itemKey)
  return item !== null && state.coins >= item.price
}

export function useItem(state, itemKey, nowMs) {
  const item = itemByKey(itemKey)
  if (item === null) return { ok: false, reason: 'unknown' }
  // 家当 is worn, not consumed — 穿上 is a different action.
  if (item.kind === 'dress') return { ok: false, reason: 'not-consumable' }
  const have = state.inventory?.[itemKey] ?? 0
  if (have <= 0) return { ok: false, reason: 'empty' }
  decay(state, nowMs)

  if (item.key === REVIVE_ITEM.key) {
    if (!state.dead) return { ok: false, reason: 'not-dead' }
    state.inventory[itemKey] = have - 1
    revive(state, nowMs)
    return { ok: true, item }
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
    return { ok: true, item }
  }

  if (state.activity !== null) return { ok: false, reason: 'away' }
  state.inventory[itemKey] = have - 1
  applyEffects(state, item, nowMs)
  remember(state, `用了 ${item.emoji} ${item.label}`, nowMs)
  return { ok: true, item }
}

export function revive(state, nowMs) {
  state.dead = false
  state.diedAt = null
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
export { LIFE_STAGES, GRAVE, SOUL, LIFESPAN_DAYS, SOUL_AFTER_DAYS }
export { DIET }
