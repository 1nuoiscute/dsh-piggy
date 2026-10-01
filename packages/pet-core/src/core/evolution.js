// @ts-check
/**
 * 加冕：长成之后由主人选一种形态（data/evolution.js）。达标不会自动加冕，
 * 不加钱、不改成长和疾病规则，只换样子。复活保留形态，领养的新猪从头来。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入（见 docs/CONVENTIONS.md）。
 * @module dsh-piggy/core/evolution
 */

import { DEFAULT_FORM, FORMS, LIFE_STAGES, TRAITS, formByKey, lifeStageByKey } from '../data.js'
import { levelFor, lifeStageFor } from './clock.js'
import { announce, remember } from './effects.js'
import { decay } from './settlement.js'

/** The level a stage starts at (成年猪 → 40). */
function stageLevel(stageKey) {
  return LIFE_STAGES.find(stage => stage.key === stageKey)?.fromLevel ?? 0
}

const REQUIREMENT_LABELS = Object.freeze({ jobs: '打工', plays: '本代玩耍' })

/** One form's conditions, each with what the pig has now. */
function requirementsFor(state, form) {
  const rows = [{ key: 'level', label: '等级', have: levelFor(state.xp), need: stageLevel(form.stage) }]
  for (const [key, need] of Object.entries(form.requires)) {
    rows.push({
      key,
      label: REQUIREMENT_LABELS[key] ?? TRAITS[key]?.label ?? key,
      have: key === 'jobs' || key === 'plays' ? (state.stats?.[key] ?? 0) : (state.traits?.[key] ?? 0),
      need,
    })
  }
  return rows.map(row => ({ ...row, met: row.have >= row.need }))
}

/**
 * Every form and how close the pig is to it. `ready` means 加冕 would work now.
 * @param {object} state
 * @returns {{ current: string | null, forms: object[] } | null}
 */
export function formsView(state) {
  if (state === null) return null
  // 纸盒也把形态表发下来（C1）：调试页要能显示"先孵化"，加冕页也要能说清条件；
  // `ready` 在没孵化时恒为 false。
  const alive = state.hatched === true && state.dead !== true
  return {
    current: formByKey(state.form)?.key ?? null,
    forms: FORMS.map(form => {
      const requirements = requirementsFor(state, form)
      return {
        key: form.key, label: form.label, emoji: form.emoji, art: form.art,
        // 这一形态挂在哪个人生阶段、那个阶段几级开始（调试页要按它拉等级）。
        stage: form.stage,
        fromLevel: lifeStageByKey(form.stage)?.fromLevel ?? 1,
        current: state.form === form.key,
        ready: alive && state.form !== form.key && requirements.every(row => row.met),
        requirements,
      }
    }),
  }
}

/**
 * 加冕. Settles elapsed time first, so a pig that died while the panel was
 * closed cannot be crowned. Crowning into the form it already has is a no-op.
 * @param {object} state
 * @param {number} nowMs
 * @param {string} [formKey]
 */
export function crown(state, nowMs, formKey = DEFAULT_FORM) {
  if (state === null) return { ok: false, reason: 'absent' }
  const form = formByKey(formKey)
  if (form === null) return { ok: false, reason: 'unknown' }
  if (state.hatched !== true) return { ok: false, reason: 'box' }
  decay(state, nowMs)
  if (state.dead === true) return { ok: false, reason: 'dead' }
  if (state.form === form.key) return { ok: true, form: form.key }
  const missing = requirementsFor(state, form).filter(row => !row.met)
  if (missing.length > 0) return { ok: false, reason: 'coronation-ineligible', missing }
  state.form = form.key
  remember(state, `👑 加冕成为${form.label}，本事和生活都照旧`, nowMs)
  announce(state, 'coronation', `${state.name} 加冕成为${form.label}！`, nowMs)
  return { ok: true, form: form.key }
}

/**
 * The life stage with the chosen form laid over it: same key and size, the
 * form's name, line and sprite. The grave and earlier stages are untouched.
 * @param {object} state
 * @param {number} nowMs
 */
export function formStageView(state, nowMs) {
  const life = lifeStageFor(state, nowMs)
  const form = state === null ? null : formByKey(state.form)
  if (form === null || life.key !== form.stage) return { ...life, actionArt: false, hides: [] }
  return { ...life, label: form.label, art: form.art, line: form.line, actionArt: form.actionArt, hides: [...form.hides] }
}
