// @ts-check
/**
 * 兴趣课 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 * @module dsh-pig/data/interests
 */

import { MINUTES } from './minutes.js'

/**
 * 兴趣 — 学习页里「随时可以学」的一类课，不是第四条属性轴。
 *
 * 学一次直接把点数加进已有的 🧠 智力 / ✨ 魅力 / 💪 武力，重复学重复加。
 * 特意不做独立的技能等级、百分比或上限：那只是把三条属性又抄了一遍。
 */
export const INTERESTS = Object.freeze([
  Object.freeze({ key: 'photography', label: '摄影', emoji: '📷', trait: 'charm', minutes: MINUTES.half, cost: 40, gain: 2, blurb: '会拍照的猪，走到哪都上相' }),
  Object.freeze({ key: 'coding', label: '编程', emoji: '💻', trait: 'intel', minutes: MINUTES.hour, cost: 80, gain: 2, blurb: '学会让别的猪干活' }),
  Object.freeze({ key: 'dancing', label: '跳舞', emoji: '💃', trait: 'charm', minutes: MINUTES.half, cost: 45, gain: 2, blurb: '会跳舞的猪不怯场' }),
  Object.freeze({ key: 'fitness', label: '健身', emoji: '🏋', trait: 'strong', minutes: MINUTES.half, cost: 35, gain: 2, blurb: '举得动更重的东西' }),
])

export const interestByKey = key => INTERESTS.find(entry => entry.key === key) ?? null

// ---------------------------------------------------------------------------
// Study — the nine QQ Pet subjects, each tied to one of the three traits.
//
// The stages are a ladder, not a menu: QQ Pet starts every pet at 小学 and the
// higher stages sit behind it. `requires` is that gate — you must finish every
// subject once at the previous stage before the next one opens.
// ---------------------------------------------------------------------------
