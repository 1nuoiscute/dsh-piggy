// @ts-check
/**
 * 形态：长成之后换一身样子。王冠和契约都从商店购买，在背包使用；
 * 加冕 App 和 /pig crown 也走同一个王冠使用入口。
 * 达标不会自动换，不加钱、不改成长和疾病规则。复活保留形态，领养的新猪从头来。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入（见 docs/CONVENTIONS.md）。
 * @module dsh-piggy/core/evolution
 */

import { DEFAULT_FORM, FORMS, LIFE_STAGES, TRAITS, formByKey, itemByKey, lifeStageByKey } from '../data.js'
import { levelFor, lifeStageFor } from './clock.js'
import { announce, remember } from './effects.js'
import { decay } from './settlement.js'
import { weightStageView } from './weight.js'

/** The level a stage starts at (成年猪 → 40). */
function stageLevel(stageKey) {
  return LIFE_STAGES.find(stage => stage.key === stageKey)?.fromLevel ?? 0
}

const REQUIREMENT_LABELS = Object.freeze({ jobs: '打工', plays: '本代玩耍' })

/**
 * Item-specific words stay in one place while the checks and consumption are shared.
 */
const WAYS = Object.freeze({
  coronation: Object.freeze({ verb: '加冕', emoji: '👑', kind: 'coronation', reason: 'coronation-ineligible' }),
  contract: Object.freeze({ verb: '签约', emoji: '😈', kind: 'contract', reason: 'contract-ineligible' }),
})

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
 * Check this form's conditions, then change into it.
 * @param {object} state
 * @param {object} form
 * @param {number} nowMs
 * @param {{verb: string, emoji: string, kind: string, reason: string}} way
 */
function transform(state, form, nowMs, way) {
  const missing = requirementsFor(state, form).filter(row => !row.met)
  if (missing.length > 0) return { ok: false, reason: way.reason, missing }
  state.form = form.key
  remember(state, `${way.emoji} ${way.verb}成为${form.label}，本事和生活都照旧`, nowMs)
  announce(state, way.kind, `${state.name} ${way.verb}成为${form.label}！`, nowMs)
  return { ok: true, form: form.key }
}

/**
 * Every form and how close the pig is to it. `ready` means its own door would work
 * now. The required item is reported separately from the progress requirements.
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
        key: form.key, via: form.via, item: form.item, label: form.label, emoji: form.emoji, art: form.art,
        hasItem: (state.inventory?.[form.item] ?? 0) > 0,
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
 * Spend the matching promotion item only after all conditions pass.
 * @param {object} state
 * @param {string} itemKey
 * @param {number} nowMs
 */
export function useFormItem(state, itemKey, nowMs) {
  if (state === null) return { ok: false, reason: 'absent' }
  const item = itemByKey(itemKey)
  if (item === null || item.kind !== 'promotion') return { ok: false, reason: 'unknown' }
  const form = formByKey(item.form)
  if (form === null || form.item !== itemKey) return { ok: false, reason: 'unknown' }
  if (state.hatched !== true) return { ok: false, reason: 'box' }
  decay(state, nowMs)
  if (state.dead === true) return { ok: false, reason: 'dead' }
  if (state.form === form.key) return { ok: false, reason: 'already', form: form.key }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  const have = state.inventory?.[itemKey] ?? 0
  if (have <= 0) return { ok: false, reason: 'needs-item', item: itemKey }
  const way = itemKey === 'crown' ? WAYS.coronation : WAYS.contract
  const result = transform(state, form, nowMs, way)
  if (!result.ok) return result
  state.inventory[itemKey] = have - 1
  return { ...result, item }
}

/**
 * The old crown action remains for the App and slash command, using the crown item.
 * @param {object} state
 * @param {number} nowMs
 * @param {string} [formKey]
 */
export function crown(state, nowMs, formKey = DEFAULT_FORM) {
  const form = formByKey(formKey)
  if (form === null) return { ok: false, reason: 'unknown' }
  if (form.item !== 'crown') return { ok: false, reason: 'needs-contract', form: form.key }
  return useFormItem(state, form.item, nowMs)
}

/** Keep the PR #3 API while requiring an owned contract. */
export function signContract(state, formKey, nowMs) {
  const form = formByKey(formKey)
  if (form === null) return { ok: false, reason: 'unknown' }
  if (form.item !== 'contract') return { ok: false, reason: 'not-a-contract', form: form.key }
  return useFormItem(state, form.item, nowMs)
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
  if (form === null || life.key !== form.stage) return weightStageView(state, { ...life, actionArt: false, hides: [] }, nowMs)
  return { ...life, label: form.label, art: form.art, line: form.line, actionArt: form.actionArt, hides: [...form.hides] }
}
