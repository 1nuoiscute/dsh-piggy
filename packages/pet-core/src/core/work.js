// @ts-check
/**
 * 打工。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/work
 */

import { TRAITS, jobByKey, jobRequirement, traitBonus } from '../data.js'
import { begin } from './activity.js'
import { TOO_WEAK_HEALTH } from './constants.js'
import { remember } from './effects.js'

export function startWork(state, jobKey, nowMs) {
  const job = jobByKey(jobKey)
  if (job === null) return { ok: false, reason: 'unknown' }
  if (state.hatched !== true) return { ok: false, reason: 'box' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.health <= TOO_WEAK_HEALTH) return { ok: false, reason: 'weak' }
  // The gate is checked before the pig walks out: an unqualified job is refused
  // with the exact axes it is short on, so the panel can point at 学习.
  const gate = jobRequirement(job, state.traits)
  if (gate !== null && !gate.ok) {
    return { ok: false, reason: 'underqualified', missing: gate.missing, job: job.key }
  }
  if (state.satiety < 15) return { ok: false, reason: 'hungry' }
  // The pig's trait shortens the shift; the pay bonus is applied on the way out.
  const points = state.traits?.[job.trait] ?? 0
  const bonus = traitBonus(job.trait, points)
  const minutes = Math.max(1, Math.round(job.minutes * bonus.minutes))
  const result = begin(state, {
    kind: 'work', key: job.key, label: job.label, emoji: job.emoji, minutes, cost: 0,
    trait: job.trait ?? null,
  }, nowMs)
  if (result.ok) {
    const saved = job.minutes - minutes
    remember(state, `${job.emoji} 出门${job.label}去了${saved > 0 ? `（${TRAITS[job.trait].label} ${points}，省了 ${saved} 分钟）` : ''}`, nowMs)
  }
  return result
}
