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

    if (saved !== null) {
      const settled = bounds.width === Math.max(MIN_WINDOW.width, Math.round(width))
        && bounds.height === Math.max(MIN_WINDOW.height, Math.round(height))
        && Math.abs(bounds.x + pigNow.x - saved.x) <= 1 && Math.abs(bounds.y + pigNow.y - saved.y) <= 1
      if (settled || panelOpen || now() - startedAt > STARTUP_MS) saved = null
    }
    if (panelOpen && lastContent?.panelOpen !== true) {
      const base = lastPigWindow ?? pigWindow
      resting = saved ?? { x: bounds.x + base.x, y: bounds.y + base.y }
    }
    let next = null
    if (changed) {
      const before = lastPigWindow ?? pigNow
      const pigBefore = saved ?? { x: bounds.x + before.x, y: bounds.y + before.y }
      // 启动时先画的是占位纸盒，换成真猪的尺寸变化不按脚底中心挪，直接摆回存下的位置。
      const target = saved !== null ? saved
        : sizeChanged ? resizedPigScreenPoint(resting ?? pigBefore, lastPigSize, pigSize) : (resting ?? pigBefore)
      if (sizeChanged && resting !== null) resting = target
      const area = nearestArea(target, areas) ?? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      next = contentBoundsForPig({ width, height, pigWindow: { ...pigWindow, ...pigSize }, panelOpen, allowPanelOverflow: sizeChanged }, target, area)
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
  }

  /** 记下猪在屏幕上的位置，下次启动按它摆。 */
  function remember(windowBounds) {
    if (lastPigWindow === null) return
    const x = windowBounds.x + lastPigWindow.x
    const y = windowBounds.y + lastPigWindow.y
    const key = x + ',' + y
    if (key === stored) return
    stored = key
    try { localStorage.setItem(PIG_SCREEN_KEY, JSON.stringify({ x, y })) } catch { /* 存不下就按窗口位置恢复 */ }
  }

  return { decide, dragStarted, remember, pigWindow: () => lastPigWindow, pigSize: () => lastPigSize }
}
