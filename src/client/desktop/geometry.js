// @ts-check
/**
 * 桌面版窗口几何（纯函数，从桌面程序 lib/window-geometry.js 搬进游戏包）。
 * 窗口摆哪、多大由游戏包算好，桌面程序只照做；以后调整这些规则只发游戏包。
 */

/** 内容外接框四周留白。 */
export const PAD = 16
/** 尺寸取整步长：动画抖几像素不算变化。 */
export const STEP = 4
/** 窗口最小尺寸。 */
export const MIN_WINDOW = Object.freeze({ width: 96, height: 96 })

const round = value => Math.round(Number(value) || 0)

/**
 * 内容变了：按「猪在屏幕上的目标位置」一次算出窗口位置和大小。
 * 面板收起时透明留白可以越出工作区；面板打开时两边都放不下面板才挪猪。
 * @param {{width:number,height:number,pigWindow:{x:number,y:number,width:number,height:number},panelOpen?:boolean,allowPanelOverflow?:boolean}} content
 * @param {{x:number,y:number}} targetPigScreen
 * @param {{x:number,y:number,width:number,height:number}} area
 */
export function contentBoundsForPig(content, targetPigScreen, area) {
  const width = Math.max(MIN_WINDOW.width, round(content.width))
  const height = Math.max(MIN_WINDOW.height, round(content.height))
  const pig = content.pigWindow
  function axis(target, pigOffset, pigSize, windowSize, areaStart, areaSize) {
    const desired = round(target) - round(pigOffset)
    if (!content.panelOpen) return desired
    if (content.allowPanelOverflow) {
      const minStart = round(areaStart) - round(pigOffset)
      const maxStart = round(areaStart + areaSize) - round(pigOffset) - round(pigSize)
      return Math.max(minStart, Math.min(desired, maxStart))
    }
    const before = round(pigOffset)
    const after = windowSize - before - round(pigSize)
    const availableBefore = round(target) - round(areaStart)
    const availableAfter = round(areaStart + areaSize - target - pigSize)
    const chosenFits = availableBefore >= before && availableAfter >= after
    const otherFits = availableBefore >= after && availableAfter >= before
    if (chosenFits || otherFits) return desired
    const lastStart = round(areaStart + areaSize - windowSize)
    return Math.max(round(areaStart), Math.min(desired, lastStart))
  }
  return {
    x: axis(targetPigScreen.x, pig.x, pig.width, width, area.x, area.width),
    y: axis(targetPigScreen.y, pig.y, pig.height, height, area.y, area.height),
    width,
    height,
  }
}

/** 猪换大小时保持脚底中心不动。 */
export function resizedPigScreenPoint(point, before, after) {
  return {
    x: round(point.x + (before.width - after.width) / 2),
    y: round(point.y + before.height - after.height),
  }
}

/**
 * 离某个点最近的屏幕工作区（点在哪块屏里就用哪块，都不在就取最近的）。
 * @param {{x:number,y:number}} point
 * @param {Array<{x:number,y:number,width:number,height:number}>} areas
 */
export function nearestArea(point, areas) {
  let best = null
  let bestDistance = Infinity
  for (const area of areas) {
    const dx = Math.max(area.x - point.x, 0, point.x - (area.x + area.width))
    const dy = Math.max(area.y - point.y, 0, point.y - (area.y + area.height))
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) { best = area; bestDistance = distance }
  }
  return best
}

/** 两个矩形每一项都差 tolerance 以内就算一样。 */
export function sameBounds(a, b, tolerance) {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance
    && Math.abs(a.width - b.width) <= tolerance && Math.abs(a.height - b.height) <= tolerance
}
