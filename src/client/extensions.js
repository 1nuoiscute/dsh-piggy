// @ts-check
/**
 * 扩展中心的客户端部分（设计见 docs/design/extension-center.md）。
 *
 * 宿主快照里带 extensions: [{ key, label, emoji, description, on, apps, dexSections, shopKinds }]。
 * 老宿主不发就当全部打开。关掉的扩展：主菜单格子、App 页、番茄钟角标、图鉴分区都不出现；
 * 商店里的相关商品由宿主直接撤下。
 */
import { arr, obj, str } from './values.js'

/** 老宿主没有扩展列表时，按「全部打开」处理。 */
const DEFAULTS = [
  { key: 'pomodoro', label: '番茄钟', emoji: '🍅', description: '', on: true, apps: ['pomodoro'], dexSections: [], shopKinds: [] },
  { key: 'fishing', label: '钓鱼', emoji: '🎣', description: '', on: true, apps: ['fishing'], dexSections: ['fish'], shopKinds: ['bait'] },
]

/** @param {unknown} raw */
export function normalizeExtensions(raw) {
  const list = arr(raw)
  if (list.length === 0) return DEFAULTS.map(entry => ({ ...entry }))
  return list.map(function (value) {
    const entry = obj(value)
    const strings = key => arr(entry[key]).filter(item => typeof item === 'string')
    return {
      key: str(entry.key, ''), label: str(entry.label, ''), emoji: str(entry.emoji, '🧩'),
      description: str(entry.description, ''), on: entry.on !== false,
      apps: strings('apps'), dexSections: strings('dexSections'), shopKinds: strings('shopKinds'),
    }
  }).filter(entry => entry.key !== '')
}

/** 关掉的扩展占的 App / 图鉴分区。 @param {any} view */
export function offParts(view) {
  const apps = new Set()
  const dexSections = new Set()
  for (const extension of arr(view?.extensions)) {
    if (extension.on) continue
    for (const app of extension.apps) apps.add(app)
    for (const section of extension.dexSections) dexSections.add(section)
  }
  return { apps, dexSections }
}

/**
 * 归一化之后再按扩展开关收一遍：番茄钟关了就当没有番茄钟（角标、提醒、状态页那一行都跟着消失）。
 * @param {any} view
 */
export function applyExtensions(view) {
  const off = offParts(view)
  if (off.apps.has('pomodoro')) view.pomodoro = null
  return view
}

/**
 * 主菜单 / 图标栏里还在的 App。正开着的 App 被关掉了就退回主菜单。
 * @param {any} ctx
 * @param {Array<{key:string}>} tabs
 */
export function enabledTabs(ctx, tabs) {
  const off = offParts(ctx.view)
  if (off.apps.has(ctx.tab)) ctx.tab = 'home'
  return tabs.filter(tab => !off.apps.has(tab.key))
}
