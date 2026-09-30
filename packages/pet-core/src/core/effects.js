// @ts-check
/**
 * 记忆、公告与属性结算。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/effects
 */

import { MAX } from '../data.js'
import { MEMORY_LIMIT, PENDING_LIMIT } from './constants.js'

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

export function announce(state, kind, text, nowMs) {
  state.pending = Array.isArray(state.pending) ? state.pending : []
  state.pending.push({ kind, text, at: nowMs })
  if (state.pending.length > PENDING_LIMIT) state.pending.splice(0, state.pending.length - PENDING_LIMIT)
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

export function applyEffects(state, effects, nowMs) {
  if (effects.xp) state.xp += effects.xp
  if (effects.satiety) state.satiety = clamp100(state.satiety + effects.satiety)
  if (effects.happiness) state.happiness = clamp100(state.happiness + effects.happiness)
  if (effects.cleanliness) state.cleanliness = clamp100(state.cleanliness + effects.cleanliness)
  if (effects.weightG) state.weightG = Math.max(400, state.weightG + effects.weightG)
  if (effects.health) state.health = clamp(Math.round(state.health + effects.health), 0, MAX.health)
  state.lastActiveAt = nowMs
}

// ---------------------------------------------------------------------------
// Passive diet
// ---------------------------------------------------------------------------
