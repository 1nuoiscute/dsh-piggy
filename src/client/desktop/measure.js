// @ts-check
/**
 * 桌面版：量「猪 + 面板 + 气泡」占多大、把整块内容钉在窗口锚边上（从桌面程序 renderer/shell.js 搬进游戏包）。
 *
 * 量框一律用布局盒（offsetLeft/offsetTop 累加），不用 getBoundingClientRect：呼吸、浮动动画只改
 * transform，rect 每帧都在抖。面板（.dp-card）自己裁掉溢出，只量面板本身，不进去量几百个子节点。
 */
import { PAD, STEP } from './geometry.js'
import { PANEL_MAX_HEIGHT } from '../constants.js'

/** 收起时猪头上方预留的气泡区：冒气泡只改可点区域，不改窗口大小。 */
const BUBBLE_ZONE = { width: 272, height: 104 }
/** 可点区域四周放宽几像素：礼包浮动、猪摇摆会越出布局盒一点。 */
const SHAPE_SLACK = 6
/** 面板打开时整块内容相对猪的外框，按朝向和猪大小记在本机；收起时窗口仍按它留位置。 */
const OPEN_BOX_KEY = 'dsh-piggy:desktop-open-box'
/** 面板上次朝哪边开：启动后第一次打开就按它留位置，不用先变一次窗口。 */
const SIDES_KEY = 'dsh-piggy:desktop-sides'

/** 收起时按需加回上次打开的面板范围；拖动时只保留本轮可见内容和气泡区。 */
export function reservedOutline(outline, saved, pigBox, compact) {
  if (compact || saved === undefined) return outline
  return outline.concat([{ x: pigBox.x + saved.l, y: pigBox.y + saved.t, r: pigBox.x + saved.r, b: pigBox.y + saved.b }])
}

/** 根据猪在工作区的位置选收起朝向；面板在上优先，两边都放不下就保留原朝向。 */
export function chooseCollapsedVertical(openBoxes, horizontal, width, pigTop, area, current) {
  if (area === null || area === undefined) return current
  const suffix = '|' + horizontal + '|' + Math.round(width)
  const above = openBoxes['bottom' + suffix]
  const below = openBoxes['top' + suffix]
  if (above !== undefined && pigTop + above.t - PAD >= area.y) return 'bottom'
  if (below !== undefined && pigTop + below.b + PAD <= area.y + area.height) return 'top'
  return current
}

/** @param {any} node */
export function layoutBox(node) {
  let x = 0
  let y = 0
  let walk = node
  while (walk !== null && walk !== undefined && walk !== document.body) {
    x += walk.offsetLeft || 0
    y += walk.offsetTop || 0
    walk = walk.offsetParent
  }
  return { x, y, width: node.offsetWidth || 0, height: node.offsetHeight || 0 }
}

/** @param {any} node */
function visible(node) {
  const style = getComputedStyle(node)
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.01
}

/**
 * @param {{ platform: string, geometry: () => any }} env
 */
export function createMeasure(env) {
  let openBoxes = {}
  try { openBoxes = JSON.parse(localStorage.getItem(OPEN_BOX_KEY) || '{}') || {} } catch { openBoxes = {} }
  const state = { vertical: 'bottom', horizontal: 'right', pinned: '', compact: false }
  try {
    const sides = JSON.parse(localStorage.getItem(SIDES_KEY) || 'null')
    if (sides && (sides.vertical === 'top' || sides.vertical === 'bottom')) state.vertical = sides.vertical
    if (sides && (sides.horizontal === 'left' || sides.horizontal === 'right')) state.horizontal = sides.horizontal
  } catch { /* 用默认的右下角 */ }
  const reserves = env.platform !== 'darwin'

  function openBoxKey(pigBox) { return state.vertical + '|' + state.horizontal + '|' + Math.round(pigBox.width) }

  /** @param {any} host */
  function boxes(host) {
    const nodes = [host]
    const all = host.querySelectorAll('*')
    for (let a = 0; a < all.length; a += 1) {
      const candidate = all[a]
      const inCard = candidate.closest('.dp-card')
      if ((inCard !== null && inCard !== candidate) || candidate.closest('.dp-fx') !== null) continue
      nodes.push(candidate)
    }
    const geometry = env.geometry()
    let rects = []
    // 气泡只进可点/可见区域，不进窗口外框：它的位置已经由下面的气泡预留区留好了。
    // 以前气泡会撑大外框，面板朝下开时一冒气泡整块内容就要挪，Windows 上会画出一帧重影
    // （用户 2026-10-05 录屏：右键开面板时猪下面多一只半透明的猪，气泡消失时往上闪）。
    const bubbleRects = []
    for (const node of nodes) {
      if (node.closest('[hidden]') !== null || !visible(node)) continue
      const bubble = node.closest('.dp-bubble')
      const box = layoutBox(node)
      if (box.width < 1 || box.height < 1) continue
      const rect = { x: box.x, y: box.y, r: box.x + box.width, b: box.y + box.height }
      if (bubble !== null) bubbleRects.push(rect)
      else rects.push(rect)
    }
    if (rects.length === 0) return null
    const hostBox = layoutBox(host)
    const pigNode = host.querySelector('.dp-pig')
    const pigBox = pigNode === null ? { x: 0, y: 0, width: 0, height: 0 } : layoutBox(pigNode)
    const open = host.getAttribute('data-open') === 'true'
    // 气泡预留区：收起、打开都留，气泡出现/消失不改外框。离屏幕顶边不够高就只留到顶边。
    let bubbleZone = null
    if (reserves && pigNode !== null) {
      const above = geometry === null ? BUBBLE_ZONE.height : geometry.window.y + pigBox.y - geometry.workArea.y - PAD
      const height = Math.max(0, Math.min(BUBBLE_ZONE.height, Math.round(above)))
      const zoneLeft = host.getAttribute('data-panel-side') === 'right' ? hostBox.x : hostBox.x + hostBox.width - BUBBLE_ZONE.width
      if (height > 0) bubbleZone = { x: zoneLeft, y: pigBox.y - height, r: zoneLeft + BUBBLE_ZONE.width, b: pigBox.y }
    }
    let zone = null
    let merged = true
    while (merged) {
      merged = false
      for (let p = 0; p < rects.length && !merged; p += 1) {
        for (let q = p + 1; q < rects.length; q += 1) {
          const one = rects[p]
          const two = rects[q]
          if (one.x <= two.r && two.x <= one.r && one.y <= two.b && two.y <= one.b) {
            rects[p] = { x: Math.min(one.x, two.x), y: Math.min(one.y, two.y), r: Math.max(one.r, two.r), b: Math.max(one.b, two.b) }
            rects.splice(q, 1)
            merged = true
            break
          }
        }
      }
    }
    // 面板打开时按它的最高高度留位置：切到内容少的 App 面板变矮，窗口不跟着缩。
    const card = /** @type {any} */ (host.querySelector('.dp-card'))
    if (reserves && open && card !== null && card.hidden !== true) {
      const cardBox = layoutBox(card)
      const maxHeight = Math.min(PANEL_MAX_HEIGHT, parseFloat(card.style.maxHeight) || 0)
      if (maxHeight > cardBox.height && cardBox.width > 0) {
        zone = cardBox.y > pigBox.y
          ? { x: cardBox.x, y: cardBox.y, r: cardBox.x + cardBox.width, b: cardBox.y + maxHeight }
          : { x: cardBox.x, y: cardBox.y + cardBox.height - maxHeight, r: cardBox.x + cardBox.width, b: cardBox.y + cardBox.height }
      }
    }
    let outline = rects.concat(zone === null ? [] : [zone], bubbleZone === null ? [] : [bubbleZone])
    if (reserves && pigNode !== null) {
      const key = openBoxKey(pigBox)
      if (open && card !== null && card.hidden !== true) {
        let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
        for (const o of outline) { l = Math.min(l, o.x); t = Math.min(t, o.y); r = Math.max(r, o.r); b = Math.max(b, o.b) }
        const rel = { l: Math.round(l - pigBox.x), t: Math.round(t - pigBox.y), r: Math.round(r - pigBox.x), b: Math.round(b - pigBox.y) }
        const old = openBoxes[key]
        if (old === undefined || old.l !== rel.l || old.t !== rel.t || old.r !== rel.r || old.b !== rel.b) {
          openBoxes[key] = rel
          try { localStorage.setItem(OPEN_BOX_KEY, JSON.stringify(openBoxes)) } catch { /* 存不下就每次启动重新量 */ }
        }
      } else if (!open) {
        outline = reservedOutline(outline, openBoxes[key], pigBox, state.compact)
      }
    }
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
    for (const o of outline) { left = Math.min(left, o.x); top = Math.min(top, o.y); right = Math.max(right, o.r); bottom = Math.max(bottom, o.b) }
    const content = { x: left - PAD, y: top - PAD,
      width: Math.ceil((right - left + PAD * 2) / STEP) * STEP, height: Math.ceil((bottom - top + PAD * 2) / STEP) * STEP }
    const pig = { x: pigBox.x - content.x, y: pigBox.y - content.y, width: pigBox.width, height: pigBox.height }
    const shape = rects.concat(bubbleRects).map(function (rect) {
      const x = Math.max(0, Math.floor(rect.x) - SHAPE_SLACK)
      const y = Math.max(0, Math.floor(rect.y) - SHAPE_SLACK)
      return { x, y, width: Math.ceil(rect.r) + SHAPE_SLACK - x, height: Math.ceil(rect.b) + SHAPE_SLACK - y }
    })
    // 摸猪冒的爱心从猪头往上飘约 56px：飘的时候这块也可见，不然被切掉一半。
    if (pigNode !== null && host.querySelector('.dp-fx') !== null) {
      const fx = { x: Math.max(0, Math.floor(pigBox.x - 36)), y: Math.max(0, Math.floor(pigBox.y - 84)) }
      shape.push({ x: fx.x, y: fx.y, width: Math.ceil(pigBox.x + pigBox.width + 36) - fx.x, height: Math.ceil(pigBox.y + 12) - fx.y })
    }
    return { content, shape, pig, hostBox, pigBox, contentBox: { left, top, right, bottom } }
  }

  /** 面板在猪哪一侧 → 整块内容钉在窗口哪两条边；收起时保持上一次。 @param {any} host */
  function sides(host) {
    const card = /** @type {any} */ (host.querySelector('.dp-card'))
    const pigNode = host.querySelector('.dp-pig')
    if (card === null || pigNode === null || card.hidden === true) return { vertical: state.vertical, horizontal: state.horizontal }
    const cardBox = layoutBox(card)
    const pigBox = layoutBox(pigNode)
    if (cardBox.width < 1 || cardBox.height < 1) return { vertical: state.vertical, horizontal: state.horizontal }
    const vertical = cardBox.y + cardBox.height / 2 < pigBox.y + pigBox.height / 2 ? 'bottom' : 'top'
    const horizontal = cardBox.x + cardBox.width / 2 < pigBox.x + pigBox.width / 2 ? 'right' : 'left'
    if (vertical !== state.vertical || horizontal !== state.horizontal) {
      try { localStorage.setItem(SIDES_KEY, JSON.stringify({ vertical, horizontal })) } catch { /* 下次启动从默认开始 */ }
    }
    state.vertical = vertical
    state.horizontal = horizontal
    return { vertical: state.vertical, horizontal: state.horizontal }
  }

  /** 松手时根据当前猪的位置更新收起朝向，下次打开面板沿这个方向。 */
  function collapsedSide(pigBox, info) {
    if (info === null || info.window === undefined || info.workArea === undefined) return
    const pigTop = info.window.y + pigBox.y
    const vertical = chooseCollapsedVertical(openBoxes, state.horizontal, pigBox.width, pigTop, info.workArea, state.vertical)
    if (vertical === state.vertical) return
    state.vertical = vertical
    try { localStorage.setItem(SIDES_KEY, JSON.stringify({ vertical, horizontal: state.horizontal })) } catch { /* 下次启动从默认朝向恢复 */ }
  }

  /** 让整块内容离窗口锚边正好 PAD。 @param {any} host */
  function pin(host, side, hostBox, contentBox) {
    const want = { left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' }
    if (side.horizontal === 'left') want.left = Math.round(hostBox.x - contentBox.left + PAD) + 'px'
    else want.right = Math.round(contentBox.right - hostBox.x - hostBox.width + PAD) + 'px'
    if (side.vertical === 'top') want.top = Math.round(hostBox.y - contentBox.top + PAD) + 'px'
    else want.bottom = Math.round(contentBox.bottom - hostBox.y - hostBox.height + PAD) + 'px'
    const key = [side.vertical, side.horizontal, want.left, want.right, want.top, want.bottom].join('|')
    if (key === state.pinned) return
    state.pinned = key
    host.style.left = want.left
    host.style.right = want.right
    host.style.top = want.top
    host.style.bottom = want.bottom
  }

  /** 变化判断用的 key：尺寸按 4px 一档，猪在窗口里的位置按 1px。 */
  function keyOf(next) {
    const head = [Math.floor(next.content.width / STEP), Math.floor(next.content.height / STEP),
      Math.floor(next.pig.x / STEP), Math.floor(next.pig.y / STEP), Math.floor(next.pigBox.x), Math.floor(next.pigBox.y)]
    const tail = []
    for (const s of next.shape) tail.push(s.x, s.y, s.width, s.height)
    return head.concat(tail.map(n => Math.floor(n / STEP))).join(',')
  }

  return { boxes, sides, collapsedSide, pin, keyOf, state }
}
