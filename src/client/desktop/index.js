// @ts-check
/**
 * 桌面版的页面逻辑（游戏包自带，外壳 0.3.0 起由 renderer/loader.js 调用）。
 *
 * 以前这些都在桌面程序里（renderer/shell.js + main.js），改一点就得让玩家重装桌面程序。
 * 现在桌面程序只提供基础动作（piggyShell.place / setHit / beginDrag …），量尺寸、钉位置、
 * 窗口摆哪、哪里可点都在这里，跟着游戏包热更新。
 */
import { sameBounds } from './geometry.js'
import { createMeasure, layoutBox } from './measure.js'
import { createPlacement } from './place.js'

/** 页面 ↔ 桌面程序的约定版本：以后桌面程序加新的基础动作时加一。 */
export const DESKTOP_VERSION = 2

const FONT_STACK = 'Nunito,"Noto Sans SC",-apple-system,"PingFang SC","Hiragino Sans GB",sans-serif'
/** 桌面版专用样式：内置 emoji 字体栈；投影不越出可见区域；面板底栏限高。 */
const DESKTOP_CSS = [
  `[data-dsh-pig][data-dsh-pig]{--ac-font:"Piggy Emoji",${FONT_STACK}}`,
  `[data-dsh-pig][data-dsh-pig][data-emoji="system"]{--ac-font:${FONT_STACK}}`,
  '[data-dsh-pig][data-open="false"] .dp-pig{filter:none!important}',
  '[data-dsh-pig] .dp-pig-img,[data-dsh-pig] .dp-pig-emoji{filter:none!important}',
  '[data-dsh-pig] .dp-card{box-shadow:inset 0 1px 2px rgba(61,52,40,.09)!important}',
  '[data-dsh-pig] .dp-panel-footer{max-height:270px!important}',
].join('\n')

/** 非拖动时窗口差这么多以内就不改（Windows 分数缩放下读回来常差 1px）。 */
const TOLERANCE = 2

let bridge = /** @type {any} */ (null)
let measure = /** @type {any} */ (null)
let placement = /** @type {any} */ (null)
let lastKey = null
let closedRoom = null
let hitRects = []
let lastHit = null
let mouse = { x: -1, y: -1 }
let scheduled = false

function host() { return /** @type {any} */ (document.querySelector('[data-dsh-pig]')) }
function geometry() { return typeof bridge.geometry === 'function' ? bridge.geometry() : null }
function dragging() {
  const scene = document.querySelector('[data-dsh-pig] .dp-scene')
  return scene !== null && scene.getAttribute('data-dragging') === 'true'
}

/** 猪在屏幕上的位置与四周可用空间：面板按这个决定朝哪边开。 */
function room() {
  const h = host()
  if (h !== null && h.getAttribute('data-open') === 'true' && closedRoom !== null) return closedRoom
  const info = geometry()
  if (info === null || h === null) return null
  const pigNode = h.querySelector('.dp-pig')
  if (pigNode === null) return null
  const box = layoutBox(pigNode)
  const left = info.window.x + box.x
  const top = info.window.y + box.y
  const result = {
    above: Math.round(top - info.workArea.y),
    below: Math.round(info.workArea.y + info.workArea.height - (top + box.height)),
    left: Math.round(left - info.workArea.x),
    right: Math.round(info.workArea.x + info.workArea.width - (left + box.width)),
    width: info.workArea.width,
    height: info.workArea.height,
  }
  if (h.getAttribute('data-open') === 'false') closedRoom = result
  return result
}

function updateHit(x, y) {
  mouse = { x, y }
  if (typeof bridge.setHit !== 'function') return
  let inside = dragging()
  for (let i = 0; !inside && i < hitRects.length; i += 1) {
    const r = hitRects[i]
    inside = x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height
  }
  if (inside === lastHit) return
  lastHit = inside
  bridge.setHit(inside)
}

function tick() {
  const h = host()
  if (h === null) return
  let next = measure.boxes(h)
  if (next === null) return
  const side = measure.sides(h)
  measure.pin(h, side, next.hostBox, next.contentBox)
  next = measure.boxes(h)
  if (next === null) return

  hitRects = next.shape
  if (mouse.x >= 0) updateHit(mouse.x, mouse.y)
  const key = measure.keyOf(next)
  if (key === lastKey) return
  lastKey = key
  const info = geometry()
  // 还没拿到窗口在哪：先不摆（以前按 (0,0) 算，启动时会把窗口摆错一次）。几何一到会再量。
  if (info === null || !info.window) { lastKey = null; return }
  const bounds = info.window
  const grownX = side.horizontal === 'right' ? next.content.width - bounds.width : 0
  const grownY = side.vertical === 'bottom' ? next.content.height - bounds.height : 0
  const want = placement.decide({
    width: next.content.width, height: next.content.height, anchor: side, pig: next.pig,
    pigWindow: { x: next.pigBox.x + grownX, y: next.pigBox.y + grownY },
    pigNow: { x: next.pigBox.x, y: next.pigBox.y },
    panelOpen: h.getAttribute('data-open') === 'true',
  }, bounds, info?.workAreas ?? (info ? [info.workArea] : []))
  const request = { shape: next.shape, bounds: want !== null && !sameBounds(want, bounds, TOLERANCE) ? want : undefined }
  // 每次要挪窗口都写进桌面程序日志（piggy.log）：平时开关面板、摸猪不会挪窗口，所以很少写；
  // 万一玩家看到「整块跳一下」，日志里就能看出是哪次、为什么挪。
  if (request.bounds !== undefined) {
    console.warn('[piggy-desktop] move ' + JSON.stringify({ open: h.getAttribute('data-open'), side, from: bounds, to: want,
      content: { w: next.content.width, h: next.content.height }, pigBox: next.pigBox, ghosts: h.querySelectorAll('[data-ghost]').length }))
  }
  const after = bridge.place(request)
  if (after && after.window) placement.remember(after.window)
}

function schedule() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(function () {
    scheduled = false
    if (!dragging()) tick()
  })
}

/** loader.js 在挂载游戏之前调用：挂上 __dshPiggyShell，客户端挂载时就按桌面版走。 */
export function install(shell) {
  bridge = shell
  measure = createMeasure({ platform: shell.platform || '', geometry })
  placement = createPlacement()
  const style = document.createElement('style')
  style.setAttribute('data-piggy-desktop-style', '')
  style.textContent = DESKTOP_CSS
  document.head.appendChild(style)
  if (typeof shell.onGeometry === 'function') shell.onGeometry(function (info) {
    if (info && info.window && !dragging()) placement.remember(info.window)
    schedule()
  })
  if (typeof shell.askGeometry === 'function') shell.askGeometry()
  ;/** @type {any} */ (window).__dshPiggyShell = {
    room,
    refreshRoom: function () { closedRoom = null },
    beginDrag: function () {
      placement.dragStarted()
      const h = host()
      if (h !== null && h.getAttribute('data-open') === 'false') {
        measure.state.compact = true
        tick()
        const pigNode = h.querySelector('.dp-pig')
        if (pigNode !== null) {
          const pigBox = layoutBox(pigNode)
          shell.beginDrag({ x: pigBox.x, y: pigBox.y, width: pigBox.width, height: pigBox.height })
          return
        }
      }
      const pig = placement.pigWindow()
      const size = placement.pigSize()
      shell.beginDrag(pig === null ? null : { x: pig.x, y: pig.y, width: size.width, height: size.height })
    },
    dragHeartbeat: function () { if (typeof shell.dragHeartbeat === 'function') shell.dragHeartbeat() },
    endDrag: function () {
      shell.endDrag()
      if (!measure.state.compact) return
      measure.state.compact = false
      const h = host()
      const pigNode = h?.querySelector('.dp-pig')
      // 拖动结束和同步读几何按 IPC 顺序处理，避免用到最后一帧之前的窗口位置。
      const info = shell.place({})
      if (pigNode !== null && pigNode !== undefined) measure.collapsedSide(layoutBox(pigNode), info)
      tick()
    },
    syncGeometry: function () { tick() },
    // 桌面散步（G 批次）：用外壳本来就有的 moveBy 挪窗口，新位置由主进程推回来的几何记住。
    moveBy: typeof shell.moveBy === 'function' ? function (dx, dy) { shell.moveBy(dx, dy) } : undefined,
  }
  // 系统原生的 title 小提示在 Windows 透明置顶窗口上会画坏：鼠标移上去时改成 aria-label。
  document.addEventListener('mouseover', function (event) {
    const target = /** @type {any} */ (event.target)
    const titled = target !== null && typeof target.closest === 'function' ? target.closest('[title]') : null
    if (titled === null) return
    if (!titled.getAttribute('aria-label')) titled.setAttribute('aria-label', titled.getAttribute('title'))
    titled.removeAttribute('title')
  }, true)
  document.addEventListener('mousemove', function (event) { updateHit(event.clientX, event.clientY) }, true)
  document.documentElement.addEventListener('mouseleave', function () {
    if (dragging()) return
    mouse = { x: -1, y: -1 }
    lastHit = false
    if (typeof shell.setHit === 'function') shell.setHit(false)
  })
}

/** 游戏挂载之后调用：只在内容真的变了时量（DOM 变化、窗口改大小、松手），另有 1 秒兜底。 */
export function start() {
  const h = host()
  if (h !== null && typeof MutationObserver === 'function') {
    new MutationObserver(schedule).observe(h, { subtree: true, childList: true, attributes: true, characterData: true })
  }
  window.addEventListener('resize', schedule)
  window.addEventListener('pointerup', schedule)
  setInterval(function () { if (!dragging()) tick() }, 1000)
  tick()
}

export const desktop = { version: DESKTOP_VERSION, install, start }
