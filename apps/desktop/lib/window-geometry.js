// @ts-check
/**
 * 桌面版窗口几何（D1）：窗口只框住「猪 + 面板 + 气泡」的外接矩形，四周留 16px。
 *
 * 纯函数，不碰 Electron —— 这样多显示器、贴边、超大窗口这些情况都能跑测试。
 * 约定：窗口的**右下角**是猪的锚点，内容变大就往左上长。
 */

/** 四周留白：内容外接矩形之外再留这么多。 */
export const WINDOW_PADDING = 16

/** 窗口最小尺寸：小猪 + 留白，别缩成一条线。 */
export const MIN_WINDOW = Object.freeze({ width: 96, height: 96 })

/** 取整步长：动画抖几像素不算变化（渲染层用同一个数）。 */
export const QUANTIZE_STEP = 4

const round = value => Math.round(Number(value) || 0)
/** 向下取整到 4px 一档：只有真的挪了 4px 才会换档，边界不会来回跳。 */
const even = value => Math.floor(round(value) / QUANTIZE_STEP) * QUANTIZE_STEP

/**
 * 把窗口夹进工作区。比工作区还大的窗口不硬塞，贴左上就好。
 * @param {{x: number, y: number, width: number, height: number}} bounds
 * @param {{x: number, y: number, width: number, height: number}} area
 */
export function clampBounds(bounds, area) {
  const width = Math.max(MIN_WINDOW.width, round(bounds.width))
  const height = Math.max(MIN_WINDOW.height, round(bounds.height))
  const maxX = area.x + area.width - width
  const maxY = area.y + area.height - height
  return {
    x: Math.max(area.x, Math.min(round(bounds.x), maxX)),
    y: Math.max(area.y, Math.min(round(bounds.y), maxY)),
    width,
    height,
  }
}

/**
 * 内容尺寸变了：保持右下角不动，把窗口改成内容大小，再夹进工作区。
 * @param {{x: number, y: number, width: number, height: number}} windowBounds
 * @param {{width: number, height: number}} content - 已经含留白的窗口内容尺寸
 * @param {{x: number, y: number, width: number, height: number}} area
 */
export function contentBounds(windowBounds, content, area) {
  const width = Math.max(MIN_WINDOW.width, round(content.width))
  const height = Math.max(MIN_WINDOW.height, round(content.height))
  const right = round(windowBounds.x) + round(windowBounds.width)
  const bottom = round(windowBounds.y) + round(windowBounds.height)
  return clampBounds({ x: right - width, y: bottom - height, width, height }, area)
}

/**
 * 拖动：按屏幕增量平移，夹进当前那块屏的工作区。
 * @param {{x: number, y: number, width: number, height: number}} windowBounds
 * @param {number} dx
 * @param {number} dy
 * @param {{x: number, y: number, width: number, height: number}} area
 */
export function movedBounds(windowBounds, dx, dy, area) {
  return clampBounds({
    x: round(windowBounds.x) + round(dx),
    y: round(windowBounds.y) + round(dy),
    width: round(windowBounds.width),
    height: round(windowBounds.height),
  }, area)
}

/** 窗口的右下角：猪停在这儿。 */
export function anchorPoint(bounds) {
  return { x: round(bounds.x) + round(bounds.width), y: round(bounds.y) + round(bounds.height) }
}

/** 内容框（含留白）换算成窗口坐标下的可点区域。 */
export function shapeRects(content, boxes) {
  const left = round(content.x) - WINDOW_PADDING
  const top = round(content.y) - WINDOW_PADDING
  return boxes.map(box => ({
    x: Math.max(0, even(box.x - left)),
    y: Math.max(0, even(box.y - top)),
    width: Math.max(0, even(box.width)),
    height: Math.max(0, even(box.height)),
  }))
}

/** 变化判断用的 key：4px 一档，动画级抖动落在同一档里。 */
export function quantizeKey(box) {
  return [even(box.x), even(box.y), even(box.width), even(box.height)].join(',')
}
