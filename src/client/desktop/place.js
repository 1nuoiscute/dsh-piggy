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

/** @param {{ now?: () => number }} [options] */
export function createPlacement(options = {}) {
  const now = options.now ?? (() => Date.now())
  let lastContent = null
  let lastPigWindow = null
  let lastPigSize = { width: 56, height: 56 }
  let resting = null
  let saved = null
  /** 这次摆放想让猪落在的屏幕点：摆完用它核对（见 geometry.js 的 pigCorrection）。 */
  let lastTarget = null
  try {
    const raw = JSON.parse(localStorage.getItem(PIG_SCREEN_KEY) || 'null')
    if (raw !== null && Number.isFinite(raw.x) && Number.isFinite(raw.y)) saved = { x: raw.x, y: raw.y }
  } catch { saved = null }
  const startedAt = now()
  let stored = saved === null ? '' : saved.x + ',' + saved.y

  /**
   * @param {any} report 页面这一轮量到的：width/height/anchor/pig/pigWindow（改完窗口后的预测位置）/pigNow/panelOpen
   * @param {{x:number,y:number,width:number,height:number}} bounds 当前窗口
   * @param {Array<any>} areas 所有屏的工作区
   * @returns {{x:number,y:number,width:number,height:number}|null} 要改成的窗口；不用改就是 null
   */
  function decide(report, bounds, areas) {
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

  /** 记下猪在屏幕上的位置，下次启动按它摆。 */
  function remember(windowBounds) {
    // 启动复位还没完成时不记：那时页面可能还画着占位纸盒，记下来下次启动猪就被摆错位置。
    if (lastPigWindow === null || saved !== null) return
    const x = windowBounds.x + lastPigWindow.x
    const y = windowBounds.y + lastPigWindow.y
    const key = x + ',' + y
    if (key === stored) return
    stored = key
    try { localStorage.setItem(PIG_SCREEN_KEY, JSON.stringify({ x, y })) } catch { /* 存不下就按窗口位置恢复 */ }
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
