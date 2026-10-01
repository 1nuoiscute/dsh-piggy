// @ts-check
/**
 * 形态：长成之后换一身样子（data/evolution.js）。两条入口，同一套条件：
 *   - 加冕 `crown()`  —— 出现在「加冕」App 里，由主人点；
 *   - 签约 `signContract()` —— 不进加冕 App，靠商店的契约道具在背包里使用。
 * 加冕是给王的动词，所以 `crown()` 只认 `via: 'coronation'` 的形态，别的会诚实拒绝。
 * 达标不会自动换，不加钱、不改成长和疾病规则。复活保留形态，领养的新猪从头来。
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

/**
 * How each entry point talks. `reason` is what a refusal to *this* door is called,
 * so the panel can say 「加冕条件还没补齐」 or 「契约还没生效」 instead of one flat message.
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
 * The shared last mile: check this form's conditions, then change into it.
 * Both doors go through here so they cannot drift apart.
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
 * now. `via` is carried through because only 加冕 forms belong in the 加冕 App —
 * the 签约 form is discovered in the shop instead.
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
        key: form.key, via: form.via, label: form.label, emoji: form.emoji, art: form.art,
        // C1 debug buttons need the stage's starting level.
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
 *
 * Only `via: 'coronation'` forms answer here: a form that is obtained some other
 * way must not be reachable by pressing the crown button (or by POSTing `crown`).
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
  // Already that shape wins over "wrong door": a crowned devil asking for the
  // devil should hear "已是", not "这一种要签约".
  if (state.form === form.key) return { ok: true, form: form.key }
  if (form.via !== 'coronation') return { ok: false, reason: 'needs-contract', form: form.key }
  return transform(state, form, nowMs, WAYS.coronation)
}

/**
 * 签约 —— the contract door, spent by using the item in the bag.
 *
 * Same conditions as 加冕, different verb: 加冕是给王的，恶魔只能签。Refusals are
 * honest and typed, and the caller must leave the item in the bag when this fails.
 * @param {object} state
 * @param {string} formKey  the form the contract grants (`data/shop.js`: item.form)
 * @param {number} nowMs
 */
export function signContract(state, formKey, nowMs) {
  if (state === null) return { ok: false, reason: 'absent' }
  const form = formByKey(formKey)
  if (form === null) return { ok: false, reason: 'unknown' }
  if (form.via !== 'contract') return { ok: false, reason: 'not-a-contract', form: form.key }
  if (state.hatched !== true) return { ok: false, reason: 'box' }
  decay(state, nowMs)
  if (state.dead === true) return { ok: false, reason: 'dead' }
  // Already this shape: don't burn a 6666-coin contract to tell the player so.
  if (state.form === form.key) return { ok: false, reason: 'already', form: form.key }
  return transform(state, form, nowMs, WAYS.contract)
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
