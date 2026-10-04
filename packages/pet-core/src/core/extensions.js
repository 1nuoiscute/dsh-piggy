// @ts-check
/**
 * 扩展开关（存在存档里：state.extensions = { pomodoro: true, fishing: false, … }）。
 * 老存档补成全部打开；认不出的 key 原样保留（以后降级再升级不丢开关）。不升存档版本。
 */
import { EXTENSIONS, extensionByKey } from '../data/extensions.js'
import { abandonPomodoro, ensurePomodoro } from './pomodoro.js'
import { ensureFishing, keepFish } from './fishing.js'
import { callOffActivity } from './activity.js'

/** @param {any} state */
export function ensureExtensions(state) {
  const raw = state.extensions !== null && typeof state.extensions === 'object' && !Array.isArray(state.extensions) ? state.extensions : {}
  const next = { ...raw }
  for (const extension of EXTENSIONS) {
    if (typeof next[extension.key] !== 'boolean') next[extension.key] = extension.defaultOn
  }
  state.extensions = next
  return next
}

/** @param {any} state @param {string} key */
export function extensionOn(state, key) {
  if (state === null || state === undefined) return true
  const value = state.extensions?.[key]
  if (typeof value === 'boolean') return value
  return extensionByKey(key)?.defaultOn ?? true
}

/**
 * 打开或关闭一个扩展。关闭时把进行中的收尾（用户 2026-10-05 定的：进行中也能关）：
 *   番茄钟专注中 → 放弃这一个（不给奖励，恢复免打扰设置）；
 *   猪在外面自动钓鱼 → 召回并退还鱼饵；已经钓上来还没收的鱼 → 收进鱼篓；检定中 → 算失败。
 * @param {any} state @param {string} key @param {boolean} on @param {number} nowMs
 */
export function setExtension(state, key, on, nowMs) {
  if (state === null) return { ok: false, reason: 'absent' }
  const extension = extensionByKey(key)
  if (extension === null) return { ok: false, reason: 'unknown-extension' }
  const flags = ensureExtensions(state)
  const wanted = on === true
  if (flags[key] === wanted) return { ok: true, key, on: wanted, changed: false }
  const wrapped = []
  if (!wanted && key === 'pomodoro' && ensurePomodoro(state).startedAt !== null) {
    const result = abandonPomodoro(state, nowMs)
    if (result.ok) wrapped.push(result.abandoned ? 'pomodoro-abandoned' : 'pomodoro-finished')
  }
  if (!wanted && key === 'fishing') {
    const fishing = ensureFishing(state)
    if (fishing.pending !== null && fishing.pending.phase === 'caught' && keepFish(state, nowMs).ok) wrapped.push('fish-kept')
    fishing.pending = null
    if (state.activity?.kind === 'fishing') {
      const result = callOffActivity(state, nowMs)
      if (result.ok) wrapped.push('fishing-recalled')
    }
  }
  flags[key] = wanted
  return { ok: true, key, on: wanted, changed: true, wrapped }
}

/**
 * 扩展中心要显示的：每个扩展的名称、说明、开没开。
 * @param {any} state
 */
export function extensionsView(state) {
  return EXTENSIONS.map(extension => ({
    key: extension.key,
    label: extension.label,
    emoji: extension.emoji,
    description: extension.description,
    on: extensionOn(state, extension.key),
    apps: [...extension.apps],
    dexSections: [...extension.dexSections],
    shopKinds: [...extension.shopKinds],
  }))
}

/** 关掉的扩展占用的商品种类 / 图鉴分区 / App：快照和客户端按它们过滤。 @param {any} state */
export function disabledParts(state) {
  const parts = { apps: new Set(), dexSections: new Set(), shopKinds: new Set() }
  for (const extension of EXTENSIONS) {
    if (extensionOn(state, extension.key)) continue
    for (const app of extension.apps) parts.apps.add(app)
    for (const section of extension.dexSections) parts.dexSections.add(section)
    for (const kind of extension.shopKinds) parts.shopKinds.add(kind)
  }
  return parts
}
