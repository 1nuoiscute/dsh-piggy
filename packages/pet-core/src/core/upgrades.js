// @ts-check
/**
 * 存档的逐级升级：每改一次存档结构，就在 UPGRADES 末尾加一级。
 *
 * migrate() 先按版本号把原始存档一级一级升到最新，再做字段清洗。
 * 一级只做一件事、只认上一级的形状，这样老存档跨多个版本升级时，
 * 每一步都和当初写它的时候一样确定。
 *
 * 加一级的步骤：
 *   1. 在 UPGRADES 末尾追加 `{ to: N, why, up(raw) }`，`up` 返回新对象，不改入参
 *   2. STATE_VERSION 改成 N（constants.js）
 *   3. 补一条迁移测试，用升级前的真实形状做样本
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/upgrades
 */

/**
 * @typedef {object} Upgrade
 * @property {number} to - 升级后的版本号
 * @property {string} why - 这一级改了什么，写给以后读代码的人
 * @property {(raw: Record<string, unknown>, nowMs: number) => Record<string, unknown>} up
 */

import { roll } from './random.js'

/*
 * The curves below are frozen copies of what each version used. An upgrade
 * must keep meaning what it meant when it was written, even after the live
 * tables in data/ change again.
 */
const v8LevelFloor = level => (level <= 1 ? 0 : 20 * level * (level - 1))
const v9LevelFloor = level => (level <= 1 ? 0 : 122 * level * level)
const V9_MAX_LEVEL = 60

function levelOnCurve(xp, floorOf, cap) {
  let level = 1
  while (level < cap && xp >= floorOf(level + 1)) level += 1
  return level
}

/**
 * Carry an old xp total onto the v9 growth curve: same level, same fraction of
 * the way to the next one. Lv8 at 40% stays Lv8 at 40%.
 */
function growthFromV8Xp(xp) {
  const value = Number.isFinite(xp) && xp > 0 ? xp : 0
  const level = levelOnCurve(value, v8LevelFloor, 999)
  if (level >= V9_MAX_LEVEL) return v9LevelFloor(V9_MAX_LEVEL)
  const floor = v8LevelFloor(level)
  const fraction = Math.min(1, (value - floor) / Math.max(1, v8LevelFloor(level + 1) - floor))
  const nextFloor = v9LevelFloor(level + 1)
  return Math.round(v9LevelFloor(level) + fraction * (nextFloor - v9LevelFloor(level)))
}

/** The v9 body for a level: 幼年 from Lv1, 青年 from Lv10, 成年 from Lv40. */
const v9StageFor = level => (level >= 40 ? 'middle' : level >= 10 ? 'young' : 'piglet')

/** @type {ReadonlyArray<Upgrade>} */
export const UPGRADES = Object.freeze([
  Object.freeze({
    to: 8,
    why: 'hatched 不再由 xp 推断：没拆的纸盒也会吃到经验，重启后会被误当成已孵化',
    up(raw) {
      // Only saves from before the flag existed get the old inference; a save
      // that recorded `hatched: false` meant it, whatever its xp says.
      if (typeof raw.hatched === 'boolean') return { ...raw, version: 8 }
      return { ...raw, version: 8, hatched: typeof raw.xp === 'number' && raw.xp > 0 }
    },
  }),
  Object.freeze({
    to: 9,
    why: 'B2 成长：xp 改为成长值、按新曲线折算（等级和进度不变）；形态改由等级决定、去掉老年；补性别',
    up(raw) {
      const next = { ...raw, version: 9, xp: growthFromV8Xp(raw.xp) }
      if (next.hatched === true && next.dead !== true) {
        next.stage = v9StageFor(levelOnCurve(next.xp, v9LevelFloor, V9_MAX_LEVEL))
      } else if (next.stage === 'elder') {
        next.stage = 'middle'
      }
      if (next.hatched === true && next.sex !== 'boy' && next.sex !== 'girl') {
        next.sex = roll(next) < 0.5 ? 'boy' : 'girl'
      }
      return next
    },
  }),
])

/** The oldest version the step table starts from; earlier saves are cleaned by migrate() alone. */
export const FIRST_UPGRADE_FROM = 7

/**
 * Run every upgrade the save has not had yet.
 * @param {Record<string, unknown>} raw
 * @param {number} nowMs
 * @returns {Record<string, unknown>}
 */
export function applyUpgrades(raw, nowMs) {
  const onDisk = typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 0
  // Saves older than the table were shaped by migrate()'s field cleaning; they
  // enter the table as if they were the version it starts from.
  let current = onDisk < FIRST_UPGRADE_FROM ? { ...raw, version: FIRST_UPGRADE_FROM } : raw
  for (const upgrade of UPGRADES) {
    if (/** @type {number} */ (current.version) < upgrade.to) current = upgrade.up(current, nowMs)
  }
  return current
}
