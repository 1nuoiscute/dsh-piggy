// @ts-check
/**
 * 兴趣课与证书 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 *
 * B4（用户 2026-10-01 确认）：兴趣课保留，同一门上满 CERTIFICATE_AFTER 次拿证；
 * 摄影师、程序员、舞蹈家、教练这几份工作要凭证上岗。
 *
 * @module dsh-pig/data/interests
 */

import { MINUTES } from './minutes.js'

/** 同一门兴趣课上满这么多次就拿到证书。 */
export const CERTIFICATE_AFTER = 5

export const INTERESTS = Object.freeze([
  Object.freeze({ key: 'photography', label: '摄影', emoji: '📷', trait: 'charm', minutes: MINUTES.half, cost: 40, gain: 2, certificate: '摄影证', blurb: '会拍照的猪，走到哪都上相' }),
  Object.freeze({ key: 'coding', label: '编程', emoji: '💻', trait: 'intel', minutes: MINUTES.hour, cost: 80, gain: 2, certificate: '编程证', blurb: '学会让别的猪干活' }),
  Object.freeze({ key: 'dancing', label: '跳舞', emoji: '💃', trait: 'charm', minutes: MINUTES.half, cost: 45, gain: 2, certificate: '跳舞证', blurb: '会跳舞的猪不怯场' }),
  Object.freeze({ key: 'fitness', label: '健身', emoji: '🏋', trait: 'strong', minutes: MINUTES.half, cost: 35, gain: 2, certificate: '健身证', blurb: '举得动更重的东西' }),
])

export const interestByKey = key => INTERESTS.find(entry => entry.key === key) ?? null
