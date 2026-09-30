// @ts-check
/**
 * 三维属性 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 * @module dsh-pig/data/traits
 */

/**
 * Extra pay per trait point, as a fraction: 150 points doubles the wage.
 *
 * Was 1/15 when a lesson gave one point. Since B4 a subject taken to 大学 is
 * worth ~90 points of its trait, and 1/15 hit the ×3 cap in the first month
 * (on top of halved shifts, about 6× the pay on the job sheet). Cut to a tenth
 * on 2026-10-01 at the owner's request.
 */
export const TRAIT_PAY_PER_POINT = 1 / 150

/** ...but a pig that studied everything still only triples the wage, or the
 *  late game has no shape left. */
export const TRAIT_PAY_CAP = 3

/** Shorter shift per trait point. 0 since 2026-10-01: traits pay more, shifts stay as long as the job table says. */
export const TRAIT_SPEED_PER_POINT = 0

export const TRAIT_SPEED_CAP = 0.5

/** What one trait point buys on a given job. */
export function traitBonus(traitKey, points) {
  const n = Number.isFinite(points) ? Math.max(0, points) : 0
  return {
    pay: Math.min(TRAIT_PAY_CAP, 1 + n * TRAIT_PAY_PER_POINT),
    minutes: Math.max(1 - TRAIT_SPEED_CAP, 1 - n * TRAIT_SPEED_PER_POINT),
  }
}

/** The three traits QQ Pet tracks alongside growth. */
export const TRAITS = Object.freeze({
  intel: Object.freeze({ key: 'intel', label: '智力', emoji: '🧠' }),
  charm: Object.freeze({ key: 'charm', label: '魅力', emoji: '✨' }),
  strong: Object.freeze({ key: 'strong', label: '武力', emoji: '💪' }),
})

export const TRAIT_ORDER = Object.freeze(['intel', 'charm', 'strong'])
