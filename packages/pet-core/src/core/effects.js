// @ts-check
/**
 * 记忆、公告与属性结算。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-piggy/core/effects
 */

import { MAX } from '../data.js'
import { MEMORY_LIMIT, PENDING_LIMIT } from './constants.js'
import { updateBodyWeight } from './weight.js'

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const clamp100 = value => clamp(value, 0, 100)

// ---------------------------------------------------------------------------
// Life — the pig is measured in days, not in points
//
// QQ Pet's pets hatch, grow up and eventually die; nothing in it is a level to
// grind. This is that idea, on a clock the pig can actually be watched against.
// XP still accumulates from real work, but it feeds *weight*: a fatter pig, not
// a higher one.
// ---------------------------------------------------------------------------

export function clock(nowMs) {
  const d = new Date(nowMs)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function remember(state, text, nowMs) {
  state.memories.push(`[${clock(nowMs)}] ${text}`)
  if (state.memories.length > MEMORY_LIMIT) state.memories.splice(0, state.memories.length - MEMORY_LIMIT)
}

/**
 * Queue a message for the panel.
 *
 * Every message gets an `id` from a counter that only goes up, so the panel
 * can tell two messages from the same instant apart — keying on `at` showed
 * only the first of "病情加重" + "走了" and lost the second.
 * @param {object} state
 * @param {string} kind
 * @param {string} text
 * @param {number} nowMs
 * @param {Record<string, unknown>} [extra] - kind-specific fields, e.g. a line's replies.
 * @returns {{id: number, kind: string, text: string, at: number}}
 */
export function announce(state, kind, text, nowMs, extra = {}) {
  state.pending = Array.isArray(state.pending) ? state.pending : []
  const id = (Number.isInteger(state.pendingSeq) && state.pendingSeq >= 0 ? state.pendingSeq : 0) + 1
  state.pendingSeq = id
  const message = { ...extra, id, kind, text, at: nowMs }
  state.pending.push(message)
  if (state.pending.length > PENDING_LIMIT) state.pending.splice(0, state.pending.length - PENDING_LIMIT)
  return message
}

export function takePending(state) {
  const out = Array.isArray(state.pending) ? state.pending.slice() : []
  state.pending = []
  return out
}

/** Take and clear the queued announcements. */
export function drainPending(state) {
  return takePending(state)
}

/**
 * Apply bar, weight and health changes. Growth is not an effect: it goes
 * through growth.js `grow()`, which is what announces level-ups.
 */
export function applyEffects(state, effects, nowMs) {
  if (effects.satiety) state.satiety = clamp100(state.satiety + effects.satiety)
  if (effects.happiness) state.happiness = clamp100(state.happiness + effects.happiness)
  if (effects.cleanliness) state.cleanliness = clamp100(state.cleanliness + effects.cleanliness)
  if (effects.weightG) state.weightG = Math.max(400, state.weightG + effects.weightG)
  if (effects.health) state.health = clamp(Math.round(state.health + effects.health), 0, MAX.health)
  state.lastActiveAt = nowMs
  updateBodyWeight(state)
}

// ---------------------------------------------------------------------------
// Passive diet
// ---------------------------------------------------------------------------
