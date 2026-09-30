// @ts-check
/**
 * 存档迁移与字段清洗。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/migrate
 */

import { ILLNESS_CHAINS, INTERESTS, MAX, SCHOOL_STAGES, SHOP, SOUVENIR_RARITY, TRAIT_ORDER, interestByKey, itemByKey, jobByKey, schoolStageByKey, stageSubjectKeys, subjectByKey, tripByKey } from '../data.js'
import { MEMORY_LIMIT, STATE_VERSION } from './constants.js'
import { clamp, clamp100 } from './effects.js'
import { layEgg, pickSex } from './egg.js'
import { ensureDialogue } from './lines.js'
import { isSeed, seedFor } from './random.js'
import { applyUpgrades } from './upgrades.js'

/** Fill in anything a hand-edited or older save is missing. */
export function migrate(input, nowMs) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null
  const onDiskVersion = typeof input.version === 'number' ? input.version : 0
  // Untrusted save data: every field below is checked before it is used.
  const raw = /** @type {any} */ (applyUpgrades(input, nowMs))
  const egg = layEgg(typeof raw.bornAt === 'number' ? raw.bornAt : nowMs)
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
  if (onDiskVersion < 5 && state.coins >= 0 && state.coins < egg.coins) {
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
  state.illness = sanitizeIllness(raw.illness, nowMs)
  state.activity = sanitizeActivity(raw.activity ?? raw.work)
  state.dead = state.dead === true || state.health <= 0
  state.hatched = state.hatched === true
  if (!isSeed(state.seed)) state.seed = seedFor(state)
  if (state.hatched && state.sex !== 'boy' && state.sex !== 'girl') state.sex = pickSex(state)
  if (state.stage === 'elder') state.stage = 'middle'
  if (!Number.isInteger(state.pendingSeq) || state.pendingSeq < 0) state.pendingSeq = 0
  ensureDialogue(state)
  return state
}

export function asObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null
}

export function sanitizeInventory(raw) {
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

export function sanitizeTraits(raw) {
  const source = asObject(raw)
  const out = {}
  for (const key of TRAIT_ORDER) {
    const value = source?.[key]
    out[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  }
  return out
}

export function sanitizeCourses(raw) {
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
export function sanitizeLessonsByStage(raw, rawCourses) {
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
export function sanitizeCoursesByStage(raw, lessonsByStage) {
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
export function sanitizeSouvenirs(raw) {
  if (!Array.isArray(raw)) return []
  // No cap: the shelf used to keep only the last 40, which threw away the
  // oldest keepsakes (and made them unsellable) without telling anyone.
  const out = []
  for (const entry of raw) {
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
export function sanitizeDressList(raw) {
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
export function sanitizeInterests(raw) {
  const source = asObject(raw)
  if (source === null) return {}
  const out = {}
  for (const entry of INTERESTS) {
    const value = source[entry.key]
    if (Number.isFinite(value) && value > 0) out[entry.key] = Math.floor(value)
  }
  return out
}

export function sanitizeIllness(raw, nowMs) {
  const source = asObject(raw)
  if (source === null) return null
  const chain = Number.isInteger(source.chain) ? source.chain : -1
  const stage = Number.isInteger(source.stage) ? source.stage : 0
  if (chain < 0 || chain >= ILLNESS_CHAINS.length) return null
  if (stage < 1 || stage > ILLNESS_CHAINS[chain].stages.length) return null
  return {
    chain,
    stage,
    since: Number.isFinite(source.since) ? source.since : nowMs,
    progressMs: Number.isFinite(source.progressMs) ? Math.max(0, source.progressMs) : 0,
  }
}

/** Accepts both the v4 `activity` record and the v3 `work` record. */
export function sanitizeActivity(raw) {
  const source = asObject(raw)
  if (source === null) return null
  if (!Number.isFinite(source.endsAt)) return null
  const kind = source.kind ?? 'work'
  if (!['work', 'study', 'trip', 'interest'].includes(kind)) return null
  const known = kind === 'work'
    ? jobByKey(source.key ?? source.job) !== null
    : kind === 'study'
      ? subjectByKey(source.key) !== null
      : kind === 'interest'
        ? interestByKey(source.key) !== null
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
