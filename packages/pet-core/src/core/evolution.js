// @ts-check
/** Optional coronation, independent of age, rewards and inheritance. */
import { KING_FORM, KING_REQUIREMENTS, KING_STAGES, TRAITS } from '../data.js'
import { lifeStageFor } from './clock.js'
import { announce, remember } from './effects.js'
import { decay } from './settlement.js'

/** Read eligibility without changing the player's chosen form.
 * @param {object} state
 * @param {number} nowMs
 * @returns {object}
 */
export function coronationView(state, nowMs) {
  const requirements = Object.keys(KING_REQUIREMENTS).map(key => ({
    key, label: key === 'jobs' ? '本代完成打工' : TRAITS[key].label,
    have: key === 'jobs' ? (state.stats?.jobs ?? 0) : (state.traits?.[key] ?? 0),
    need: KING_REQUIREMENTS[key],
  }))
  const visible = state.dead !== true && state.hatched === true
    && KING_STAGES.includes(lifeStageFor(state, nowMs).key) && state.finalForm !== KING_FORM.key
  return { visible, ready: visible && requirements.every(entry => entry.have >= entry.need), requirements }
}

/** Settle elapsed time before checking, so an expired life cannot be crowned.
 * @param {object} state
 * @param {number} nowMs
 * @returns {object}
 */
export function crown(state, nowMs) {
  decay(state, nowMs)
  if (state.dead === true || state.health <= 0) return { ok: false, reason: 'dead' }
  if (state.hatched !== true || !KING_STAGES.includes(lifeStageFor(state, nowMs).key)) return { ok: false, reason: 'not-adult' }
  if (state.finalForm === KING_FORM.key) return { ok: true }
  const view = coronationView(state, nowMs)
  if (!view.ready) return { ok: false, reason: 'coronation-ineligible', missing: view.requirements.filter(entry => entry.have < entry.need) }
  state.finalForm = KING_FORM.key
  remember(state, '加冕成为猪猪王，原有本事和生活继续。', nowMs)
  announce(state, 'coronation', '猪猪王加冕了！', nowMs)
  return { ok: true }
}

/** A crowned pig keeps the upstream growth and illness rules.
 * @param {object} state
 * @param {number} nowMs
 * @returns {import("../data/life.js").LifeStage}
 */
export function finalStageView(state, nowMs) {
  const life = lifeStageFor(state, nowMs)
  return KING_STAGES.includes(life.key) && state.finalForm === KING_FORM.key
    ? { ...life, label: KING_FORM.label, art: KING_FORM.art, line: KING_FORM.line } : life
}
