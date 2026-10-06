// @ts-check
/**
 * 桌面版：内容变了以后窗口摆哪（从桌面程序 main.js 的 piggy:content 搬进游戏包）。
 *
 * 规矩：
 *   - 猪在屏幕上一像素都不动；窗口按「猪的目标位置 − 猪在窗口里的位置」一次摆好。
 *   - 开、关面板本身不挪窗口（收起时窗口按打开时的范围留着位置）；只在打开那一刻记下猪的原位，
 *     面板开着时内容变化要按它摆回。
 *   - 拖动开始后原位作废。
 *   - 启动时按上次存下的猪位置摆，直到页面量到的实际位置和它对上（最多管几秒）。
 *   - 猪换大小时保持脚底中心不动。
 */
import { MIN_WINDOW, contentBoundsForPig, nearestArea, resizedPigScreenPoint } from './geometry.js'

const PIG_SCREEN_KEY = 'dsh-piggy:desktop-pig'
const STARTUP_MS = 4000

/** @param {{ now?: () => number, platform?: string }} [options] */
export function createPlacement(options = {}) {
  const now = options.now ?? (() => Date.now())
  let lastContent = null
  let lastPigWindow = null
  let lastMeasuredPig = null
  let lastPigSize = { width: 56, height: 56 }
  let resting = null
  let saved = null
  /** 这次摆放想让猪落在的屏幕点：摆完用它核对（见 geometry.js 的 pigCorrection）。 */
  let lastTarget = null
  const startedAt = now()
  let stored = ''
  let loaded = false

  /**
   * 位置存「哪块显示器 + 相对它工作区的偏移」，不存绝对屏幕坐标。
   * 绝对坐标在换分辨率、换显示器排列、拔掉一块屏之后就失去意义了（旧格式就是这么烂掉的）。
   * 认显示器用工作区矩形：矩形一样就是同一块（Electron 的 workArea 在同一排列下是稳定的）。
   * @param {Array<{x:number,y:number,width:number,height:number}>} areas
   */
  function readSaved(areas) {
    let raw = null
    try { raw = JSON.parse(localStorage.getItem(PIG_SCREEN_KEY) || 'null') } catch { return null }
    if (raw === null || typeof raw !== 'object') return null
    if (raw.v === 2 && Number.isFinite(raw.x) && Number.isFinite(raw.y)) {
      const list = Array.isArray(areas) ? areas : []
      const same = raw.area === null || raw.area === undefined ? null
        : list.find(area => area.x === raw.area.x && area.y === raw.area.y && area.width === raw.area.width && area.height === raw.area.height) ?? null
      const area = same ?? areaOf({ x: (raw.area?.x ?? 0) + raw.x, y: (raw.area?.y ?? 0) + raw.y }, list)
      // 显示器拔了：按最近的那块屏重新落地（用户 2026-10-06 确认这是预期行为）。
      return area === null ? { x: raw.x, y: raw.y } : { x: Math.round(area.x + raw.x), y: Math.round(area.y + raw.y) }
    }
    // 旧格式（绝对屏幕坐标）：能用就先用，下次写入自动升级成 v2。
    return Number.isFinite(raw.x) && Number.isFinite(raw.y) ? { x: raw.x, y: raw.y } : null
  }

  /** 点落在哪块屏的工作区里；都不在就取最近的。 */
  function areaOf(point, areas) {
    if (!Array.isArray(areas) || areas.length === 0) return null
    let best = null
    let bestDistance = Infinity
    for (const area of areas) {
      const inside = point.x >= area.x && point.x < area.x + area.width && point.y >= area.y && point.y < area.y + area.height
      const dx = Math.max(area.x - point.x, 0, point.x - (area.x + area.width))
      const dy = Math.max(area.y - point.y, 0, point.y - (area.y + area.height))
      const distance = inside ? -1 : dx * dx + dy * dy
      if (distance < bestDistance) { best = area; bestDistance = distance }
    }
    return best
  }


  /**
   * @param {any} report 页面这一轮量到的：width/height/anchor/pig/pigWindow（改完窗口后的预测位置）/pigNow/panelOpen
   * @param {{x:number,y:number,width:number,height:number}} bounds 当前窗口
   * @param {Array<any>} areas 所有屏的工作区
   * @returns {{x:number,y:number,width:number,height:number}|null} 要改成的窗口；不用改就是 null
   */
  function decide(report, bounds, areas) {
    // 存档要等拿到显示器列表才能换算成绝对坐标（v2 存的是显示器相对位置）。
    if (!loaded) { loaded = true; saved = readSaved(areas); stored = saved === null ? '' : JSON.stringify({ x: saved.x, y: saved.y }) }
    const width = report.width
    const height = report.height
    const anchor = report.anchor
    const pigWindow = report.pigWindow
    const pigNow = report.pigNow
    const pigSize = report.pig.width > 0 && report.pig.height > 0 ? { width: report.pig.width, height: report.pig.height } : lastPigSize
    const panelOpen = report.panelOpen === true
    const sizeChanged = lastPigWindow !== null && (lastPigSize.width !== pigSize.width || lastPigSize.height !== pigSize.height)
    const changed = lastContent === null
      || lastContent.width !== width || lastContent.height !== height
      || lastContent.anchor.vertical !== anchor.vertical || lastContent.anchor.horizontal !== anchor.horizontal
      || sizeChanged
      || (lastPigWindow !== null && (pigWindow.x !== lastPigWindow.x || pigWindow.y !== lastPigWindow.y))

    // 「猪现在在哪」一律用实测值（这一轮钉边之前量到的本地框），不用上一次的预测值。
    // 预测值（lastPigWindow）是「按新的窗口尺寸推出来的」，和真实布局差 3~4px；
    // 开关面板两个方向各用一个基准，就会看到猪稳定跳一下（2026-10-06 实测）。
    const measuredPig = Number.isFinite(report.pigBeforePin?.x) && Number.isFinite(report.pigBeforePin?.y)
      ? report.pigBeforePin : null
    if (measuredPig !== null) lastMeasuredPig = measuredPig

    if (saved !== null) {
      const nowPig = measuredPig ?? pigNow
      const settled = bounds.width === Math.max(MIN_WINDOW.width, Math.round(width))
        && bounds.height === Math.max(MIN_WINDOW.height, Math.round(height))
        && Math.abs(bounds.x + nowPig.x - saved.x) <= 1 && Math.abs(bounds.y + nowPig.y - saved.y) <= 1
      if (settled || panelOpen || now() - startedAt > STARTUP_MS) saved = null
    }
    if (panelOpen && lastContent?.panelOpen !== true) {
      // 开面板那一刻记下猪的原位：用钉边之前的实测值，面板开着期间不再变。
      const base = measuredPig ?? lastPigWindow ?? pigWindow
      resting = saved ?? { x: bounds.x + base.x, y: bounds.y + base.y }
    }
    let next = null
    if (changed) {
      const before = measuredPig ?? lastPigWindow ?? pigNow
      const pigBefore = saved ?? { x: bounds.x + before.x, y: bounds.y + before.y }
      // 启动时先画的是占位纸盒，换成真猪的尺寸变化不按脚底中心挪，直接摆回存下的位置。
      const target = saved !== null ? saved
        : sizeChanged ? resizedPigScreenPoint(resting ?? pigBefore, lastPigSize, pigSize) : (resting ?? pigBefore)
      if (sizeChanged && resting !== null) resting = target
      const area = nearestArea(target, areas) ?? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      next = contentBoundsForPig({ width, height, pigWindow: { ...pigWindow, ...pigSize }, panelOpen, allowPanelOverflow: sizeChanged }, target, area)
      // macOS：Electron 会把 y 小于托盘高度（20~40px，随系统版本变）的窗口**静默**夹到托盘下沿，
      // 模型算出来的位置永远到不了。自己先按工作区上沿夹一下，免得闭环核对一直追一个到不了的目标。
      if (options.platform === 'darwin') next.y = Math.max(next.y, area.y)
      lastTarget = target
    }
    if (!panelOpen) resting = null
    lastContent = { width, height, anchor, panelOpen }
    lastPigWindow = pigWindow
    lastPigSize = pigSize
    return next
  }

  /** 拖动开始：原位、启动位置都作废。 */
  function dragStarted() {
    resting = null
    saved = null
    lastTarget = null
  }

  /**
   * 记下猪在屏幕上的位置，下次启动按它摆。
   * 存「哪块显示器 + 相对偏移」，而且用**实测**的猪本地框（以前存的是预测值，
   * 偏差会被存下来当成下次启动的位置）。@param {Array<object>} [areas] */
  function remember(windowBounds, areas) {
    // 启动复位还没完成时不记：那时页面可能还画着占位纸盒，记下来下次启动猪就被摆错位置。
    if (lastMeasuredPig === null || saved !== null) return
    const x = windowBounds.x + lastMeasuredPig.x
    const y = windowBounds.y + lastMeasuredPig.y
    const area = areaOf({ x, y }, areas)
    const payload = area === null
      ? { v: 2, area: null, x, y }
      : { v: 2, area: { x: area.x, y: area.y, width: area.width, height: area.height }, x: x - area.x, y: y - area.y }
    const key = JSON.stringify(payload)
    if (key === stored) return
    stored = key
    try { localStorage.setItem(PIG_SCREEN_KEY, key) } catch { /* 存不下就按窗口位置恢复 */ }
  }

  return {
    decide, dragStarted, remember,
    pigWindow: () => lastPigWindow,
    pigSize: () => lastPigSize,
    /** 上一次 decide 想让猪落在哪；没有待核对的摆放时是 null。 */
    target: () => lastTarget,
    /** 核对通过（或放弃）以后清掉，避免重复修。 */
    targetDone: () => { lastTarget = null },
  }
}
