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
