// @ts-check
/**
 * 日常：签到 12 天、在线礼包、宠物日记。
 *
 * 纯领域逻辑：时间由 nowMs 传入，随机走 `core/random.js`，不读文件、不碰 DOM。
 * 一天的边界是早上 06:00 —— `dayKeyFor()` 就在 clock.js，这里只是转出去，
 * 免得「一天从几点算起」有两份实现（见 docs/CONVENTIONS.md）。
 *
 * @module dsh-pig/core/daily
 */
import { SIGN_IN_CYCLE, SIGN_IN_REWARDS, itemByKey } from '../data.js'
import { dayKeyFor } from './clock.js'
import { announce } from './effects.js'
import { say } from './lines.js'

export { dayKeyFor }

/** 一份全新的日常状态：今天没签、没在线、没礼包。 */
export function emptyDaily() {
  return {
    signIn: { lastDay: null, index: 0, total: 0 },
    online: { day: null, onlineMs: 0, given: 0, unclaimed: 0 },
  }
}

/**
 * 补默认值。新字段不加 upgrades 级、不动 STATE_VERSION（那归 Claude）：
 * 缺什么补什么，坏值当没有（参考 core/lines.js 的 ensureDialogue）。
 * @param {object} state
 */
export function ensureDaily(state) {
  const raw = state.daily
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    state.daily = emptyDaily()
    return state.daily
  }
  const signIn = raw.signIn !== null && typeof raw.signIn === 'object' && !Array.isArray(raw.signIn) ? raw.signIn : {}
  const online = raw.online !== null && typeof raw.online === 'object' && !Array.isArray(raw.online) ? raw.online : {}
  const index = Number.isInteger(signIn.index) && signIn.index >= 0 ? signIn.index % SIGN_IN_CYCLE : 0
  state.daily = {
    signIn: {
      lastDay: typeof signIn.lastDay === 'string' && signIn.lastDay !== '' ? signIn.lastDay : null,
      index,
      total: Number.isInteger(signIn.total) && signIn.total >= 0 ? signIn.total : 0,
    },
    online: {
      day: typeof online.day === 'string' && online.day !== '' ? online.day : null,
      onlineMs: Number.isFinite(online.onlineMs) && online.onlineMs > 0 ? online.onlineMs : 0,
      given: Number.isInteger(online.given) && online.given >= 0 ? online.given : 0,
      unclaimed: Number.isInteger(online.unclaimed) && online.unclaimed >= 0 ? online.unclaimed : 0,
    },
  }
  return state.daily
}

/**
 * 把一份奖励记到账上。
 * @param {object} state
 * @param {{coins: number, items: ReadonlyArray<{key: string, count: number}>}} reward
 * @returns {string} 领到了什么（给公告用）
 */
export function grantReward(state, reward) {
  const parts = []
  if (reward.coins > 0) {
    state.coins += reward.coins
    parts.push(`🪙 ${reward.coins}`)
  }
  for (const entry of reward.items) {
    state.inventory = { ...(state.inventory ?? {}) }
    state.inventory[entry.key] = (state.inventory[entry.key] ?? 0) + entry.count
    const item = itemByKey(entry.key)
    // A key the shelf does not know yet (B3's medicine) still lands in the bag.
    parts.push(`${item === null ? '🎁' : item.emoji} ${item === null ? entry.key : item.label} ×${entry.count}`)
  }
  return parts.join(' + ')
}

/** 今天这一签领了没。 */
export function canSignIn(state, nowMs) {
  return ensureDaily(state).signIn.lastDay !== dayKeyFor(nowMs)
}

/**
 * 签到：发当天的礼包、推进一轮，写回今天是哪一天。
 *
 * 断签不清零（下次接着领下一天），12 天领完从头来；死了也能签 —— 墓碑也攒还魂丹。
 * @returns {{ ok: boolean, reason?: string, day?: number, reward?: string }}
 */
export function signIn(state, nowMs) {
  const daily = ensureDaily(state)
  const today = dayKeyFor(nowMs)
  if (daily.signIn.lastDay === today) return { ok: false, reason: 'signed' }
  const index = daily.signIn.index % SIGN_IN_CYCLE
  const text = grantReward(state, SIGN_IN_REWARDS[index])
  daily.signIn.lastDay = today
  daily.signIn.index = (index + 1) % SIGN_IN_CYCLE
  daily.signIn.total += 1
  announce(state, 'gift', `签到第 ${index + 1} 天：${text}`, nowMs)
  say(state, 'signIn', nowMs)
  return { ok: true, day: index + 1, reward: text }
}

/** 面板需要的那几个数。 */
export function dailyView(state, nowMs) {
  const daily = ensureDaily(state)
  return {
    canSignIn: daily.signIn.lastDay !== dayKeyFor(nowMs),
    signInDay: (daily.signIn.index % SIGN_IN_CYCLE) + 1,
    signInTotal: daily.signIn.total,
    cycle: SIGN_IN_CYCLE,
  }
}
