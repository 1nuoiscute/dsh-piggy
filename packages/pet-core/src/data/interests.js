// @ts-check
/**
 * 兴趣课与证书 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 *
 * B4（用户 2026-10-01 确认）：兴趣课保留，同一门上满 CERTIFICATE_AFTER 次拿证；
 * 摄影师、程序员、舞蹈家、教练这几份工作要凭证上岗。
 *
 * @module dsh-piggy/data/interests
 */

import { MINUTES } from './minutes.js'

/** 同一门兴趣课上满这么多次就拿到证书。 */
export const CERTIFICATE_AFTER = 5

export const INTERESTS = Object.freeze([
  Object.freeze({ key: 'photography', label: '摄影', emoji: '📷', trait: 'charm', minutes: MINUTES.half, cost: 40, gain: 2, certificate: '摄影证', blurb: '会拍照的猪，走到哪都上相' }),
  Object.freeze({ key: 'coding', label: '编程', emoji: '💻', trait: 'intel', minutes: MINUTES.hour, cost: 80, gain: 2, certificate: '编程证', blurb: '学会让别的猪干活' }),
  Object.freeze({ key: 'dancing', label: '跳舞', emoji: '💃', trait: 'charm', minutes: MINUTES.half, cost: 45, gain: 2, certificate: '跳舞证', blurb: '会跳舞的猪不怯场' }),
  Object.freeze({ key: 'fitness', label: '健身', emoji: '🏋', trait: 'strong', minutes: MINUTES.half, cost: 35, gain: 2, certificate: '健身证', blurb: '举得动更重的东西' }),
  // --- 2026-10-01 用户要求多一些：每一维各加四门，证书先当收藏，以后可以挂新职业 ---
  // 🧠 智力
  Object.freeze({ key: 'weiqi', label: '围棋', emoji: '♟️', trait: 'intel', minutes: MINUTES.half, cost: 45, gain: 2, certificate: '围棋证', blurb: '下棋的时候一动不动，像睡着了' }),
  Object.freeze({ key: 'english', label: '英语', emoji: '🔤', trait: 'intel', minutes: MINUTES.half, cost: 40, gain: 2, certificate: '英语证', blurb: 'Oink oink, hello' }),
  Object.freeze({ key: 'astronomy', label: '天文', emoji: '🔭', trait: 'intel', minutes: MINUTES.hour, cost: 90, gain: 2, certificate: '天文证', blurb: '认得出哪颗星星像猪鼻子' }),
  Object.freeze({ key: 'cube', label: '魔方', emoji: '🧩', trait: 'intel', minutes: MINUTES.half, cost: 35, gain: 2, certificate: '魔方证', blurb: '蹄子转得比手还快' }),
  // ✨ 魅力
  Object.freeze({ key: 'calligraphy', label: '书法', emoji: '🖌️', trait: 'charm', minutes: MINUTES.half, cost: 40, gain: 2, certificate: '书法证', blurb: '写的「猪」字特别有神' }),
  Object.freeze({ key: 'guitar', label: '吉他', emoji: '🎸', trait: 'charm', minutes: MINUTES.half, cost: 50, gain: 2, certificate: '吉他证', blurb: '会弹三个和弦就够用了' }),
  Object.freeze({ key: 'magic', label: '魔术', emoji: '🎩', trait: 'charm', minutes: MINUTES.hour, cost: 85, gain: 2, certificate: '魔术证', blurb: '能从帽子里变出一个苹果' }),
  Object.freeze({ key: 'ikebana', label: '插花', emoji: '💐', trait: 'charm', minutes: MINUTES.half, cost: 35, gain: 2, certificate: '插花证', blurb: '插着插着把花吃了' }),
  // 💪 武力
  Object.freeze({ key: 'swimming', label: '游泳', emoji: '🏊', trait: 'strong', minutes: MINUTES.half, cost: 40, gain: 2, certificate: '游泳证', blurb: '会狗刨，不对，猪刨' }),
  Object.freeze({ key: 'skating', label: '轮滑', emoji: '🛼', trait: 'strong', minutes: MINUTES.half, cost: 45, gain: 2, certificate: '轮滑证', blurb: '四只蹄子，四双鞋' }),
  Object.freeze({ key: 'climbing', label: '攀岩', emoji: '🧗', trait: 'strong', minutes: MINUTES.hour, cost: 90, gain: 2, certificate: '攀岩证', blurb: '爬得上去，下来要人抱' }),
  Object.freeze({ key: 'football', label: '足球', emoji: '⚽', trait: 'strong', minutes: MINUTES.half, cost: 35, gain: 2, certificate: '足球证', blurb: '最喜欢用头顶球' }),
])

export const interestByKey = key => INTERESTS.find(entry => entry.key === key) ?? null
