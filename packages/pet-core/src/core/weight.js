// @ts-check
/** Weight, exercise and body appearance. Time is supplied by the caller. */
import { MAX_LEVEL, WEIGHT_RULES, xpForLevel } from '../data.js'
import { dayKeyFor } from './clock.js'
import { DAY_MS } from './constants.js'

/** Reference weight follows growth continuously, stopping at the Lv60 reference.
 * @param {object} state
 * @returns {number}
 */
export function idealWeightG(state) {
  const xp = Number.isFinite(state?.xp) ? Math.max(0, state.xp) : 0
  return Math.round(WEIGHT_RULES.baseG + Math.min(xp, xpForLevel(MAX_LEVEL)) * WEIGHT_RULES.growthGPerXp)
}

/** Pure hysteresis check; viewing the pig never changes its saved state.
 * @param {object} state
 * @returns {boolean}
 */
function isFat(state) {
  const ideal = idealWeightG(state)
  return state.bodyWeight?.isFat === true
    ? state.weightG > ideal * WEIGHT_RULES.restoreRatio
    : state.weightG >= ideal * WEIGHT_RULES.fatRatio
}

/** Fill and sanitize the saved body/counter record without changing weight.
 * @param {object} state
 * @returns {{isFat: boolean, playDay: string, plays: number}}
 */
export function ensureBodyWeight(state) {
  const raw = state.bodyWeight
  const record = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  state.bodyWeight = {
    isFat: record.isFat === true,
    playDay: typeof record.playDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.playDay) ? record.playDay : '',
    plays: Number.isFinite(record.plays) ? Math.max(0, Math.min(WEIGHT_RULES.playsPerDay, Math.floor(record.plays))) : 0,
  }
  state.bodyWeight.isFat = isFat(state)
  return state.bodyWeight
}

/** Recheck appearance after food, real work, growth or exercise.
 * @param {object} state
 */
export function updateBodyWeight(state) {
  ensureBodyWeight(state)
}

/** Remove only excess weight. Lean pigs never gain weight from this function.
 * @param {object} state
 * @param {number} retained - remaining fraction of excess weight
 */
function reduceExcess(state, retained) {
  if (state?.hatched !== true || state.dead === true || !Number.isFinite(state.weightG)) return
  const ideal = idealWeightG(state)
  const excess = Math.max(0, state.weightG - ideal)
  if (excess > 0) state.weightG = ideal + excess * Math.max(0, Math.min(1, retained))
  updateBodyWeight(state)
}

/** A successful play uses one of the first ten daily exercise slots.
 * @param {object} state
 * @param {number} nowMs
 */
export function reducePlayWeight(state, nowMs) {
  if (state?.hatched !== true || state.dead === true) return
  const record = ensureBodyWeight(state)
  const day = dayKeyFor(nowMs)
  if (record.playDay !== day) { record.playDay = day; record.plays = 0 }
  if (record.plays >= WEIGHT_RULES.playsPerDay) return
  record.plays += 1
  reduceExcess(state, 1 - WEIGHT_RULES.playLoss)
}

/** Credit exercise only when a work activity finishes; use actual duration.
 * @param {object} state
 * @param {number} minutes
 */
export function reduceWorkWeight(state, minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return
  reduceExcess(state, (1 - WEIGHT_RULES.workLossPerHour) ** (minutes / 60))
}

/** Offline metabolism is continuous and compounds, independent of polling.
 * @param {object} state
 * @param {number} pigMs - already scaled elapsed pig time
 */
export function settleWeight(state, pigMs) {
  if (!Number.isFinite(pigMs) || pigMs <= 0) return
  reduceExcess(state, (1 - WEIGHT_RULES.dailyLoss) ** (pigMs / DAY_MS))
}

/** Read-only panel data. Form/skin choices retain their own artwork.
 * @param {object} state
 * @param {number} nowMs
 * @returns {object | null}
 */
export function bodyWeightView(state, nowMs) {
  if (state?.hatched !== true || state.dead === true) return null
  const ideal = idealWeightG(state)
  const fat = isFat(state)
  const hasDefaultSkin = state.skin == null || state.skin === 'default'
  const today = state.bodyWeight?.playDay === dayKeyFor(nowMs) ? state.bodyWeight.plays : 0
  return {
    isFat: fat,
    visible: fat && state.form == null && hasDefaultSkin,
    idealG: ideal,
    fatAtG: ideal * WEIGHT_RULES.fatRatio,
    restoreAtG: ideal * WEIGHT_RULES.restoreRatio,
    ideal: (ideal / 1000).toFixed(1) + ' kg',
    fatAt: (ideal * WEIGHT_RULES.fatRatio / 1000).toFixed(1) + ' kg',
    restoreAt: (ideal * WEIGHT_RULES.restoreRatio / 1000).toFixed(1) + ' kg',
    playsLeft: Math.max(0, WEIGHT_RULES.playsPerDay - (Number.isFinite(today) ? today : 0)),
  }
}

/** Lay fat artwork over the original life stage, keeping its identity.
 * @param {object} state
 * @param {object} life
 * @param {number} nowMs
 * @returns {object}
 */
export function weightStageView(state, life, nowMs) {
  if (!bodyWeightView(state, nowMs)?.visible) return life
  return { ...life, label: '肥猪', art: 'pig-fat', actionArt: true,
    size: Math.round(life.size * WEIGHT_RULES.sizeMultiplier), line: '圆滚滚的，走两步肚子也跟着晃。' }
}
