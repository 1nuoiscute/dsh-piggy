// @ts-check
/**
 * 番茄钟 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 *
 * 用户 2026-10-01：时长 15/25/45 分钟，休息 5 分钟；完成 +8 🪙、+6 心情，
 * 每天前 8 个给奖励，之后只计数；中途放弃不给。
 * @module dsh-piggy/data/pomodoro
 */

/** Offered focus lengths, in minutes. */
export const POMODORO_MINUTES = Object.freeze([15, 25, 45])

/** Rest after a finished pomodoro — shown by the app, skippable by starting another. */
export const POMODORO_BREAK_MINUTES = 5

/** One finished pomodoro pays this much. */
export const POMODORO_REWARD = Object.freeze({ coins: 8, happiness: 6 })

/** Only the first N of a day pay; the rest still count. */
export const POMODORO_REWARDED_PER_DAY = 8

/** Sanity bound for `ensurePomodoro` (a save written by a future build). */
export const POMODORO_MAX_MINUTES = 180
