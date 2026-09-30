// @ts-check
/**
 * 兴趣课。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/interests
 */

import { INTERESTS, interestByKey } from '../data.js'
import { begin } from './activity.js'
import { TOO_WEAK_HEALTH } from './constants.js'
import { remember } from './effects.js'

/**
/**
 * 兴趣课的修读次数, per interest key.
 *
 * The point of 兴趣 is that it feeds an *existing* trait (智力/魅力/武力) — it
 * is not a fourth axis, so there is nothing else to track.
 */
export function interestView(state) {
  const out = {}
  for (const entry of INTERESTS) out[entry.key] = state.interests?.[entry.key] ?? 0
  return out
}

/**
 * 兴趣课 — like 上课, but outside the school ladder and repeatable.
 *
 * It pays into the same three traits (智力/魅力/武力); there is no separate
 * skill stat, because a skill stat would just be a second name for those three.
 */
export function startInterest(state, interestKey, nowMs) {
  const interest = interestByKey(interestKey)
  if (interest === null) return { ok: false, reason: 'unknown' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.health <= TOO_WEAK_HEALTH) return { ok: false, reason: 'weak' }
  if (state.coins < interest.cost) return { ok: false, reason: 'poor', price: interest.cost }
  if (state.satiety < 15) return { ok: false, reason: 'hungry' }

  state.coins -= interest.cost
  const result = begin(state, {
    kind: 'interest', key: interest.key,
    label: `兴趣·${interest.label}`, emoji: interest.emoji,
    minutes: interest.minutes, cost: interest.cost,
  }, nowMs)
  if (!result.ok) {
    state.coins += interest.cost
    return result
  }
  remember(state, `${interest.emoji} 去学${interest.label}（花了 ${interest.cost} 金币）`, nowMs)
  return result
}
