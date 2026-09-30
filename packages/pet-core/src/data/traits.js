// @ts-check
/**
 * 三维属性 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 * @module dsh-pig/data/traits
 */

/** Extra pay per trait point, as a fraction. 15 points doubles the wage. */
export const TRAIT_PAY_PER_POINT = 1 / 15

/** ...but a pig that studied everything still only triples the wage, or the
 *  late game has no shape left. */
export const TRAIT_PAY_CAP = 3

/** Shorter shift per trait point, capped so a job never vanishes. */
export const TRAIT_SPEED_PER_POINT = 0.04

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
