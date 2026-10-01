// @ts-check
/**
 * D1 桌面版窗口：窗口要缩到猪身上，而且不能被动画带着每秒改一次形状。
 *
 * 这里守两件事（卡上 D1 的验收）：
 * 1. 猪闲着 10 秒内 setContent/setShape 调用 **0 次** —— 呼吸/浮动动画只改 transform，
 *    量框必须用布局盒，取整到 4px 再比较。
 * 2. 拖猪的时候窗口跟着走（屏幕坐标）。
 *
 * 测试用假 DOM 跑真实的 renderer/shell.js：getBoundingClientRect 会像动画那样抖，
 * 布局盒（offsetLeft/offsetTop/offsetWidth/offsetHeight）是稳的 —— 正好区分两种量法。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { ANCHOR_TOLERANCE, WINDOW_PADDING, anchorCorrection, clampBounds, contentBounds, movedBounds, quantizeKey } from '../lib/window-geometry.js'

const SHELL = readFileSync(new URL('../renderer/shell.js', import.meta.url), 'utf8')

/** 一个只够跑 shell.js 的假页面：猪 + 一块面板。 */
function fakePage(options = {}) {
  const jitter = options.jitter ?? 0
  let phase = 0

  class Node {
    constructor(name, spec = {}) {
      this.nodeName = name
      this.className = spec.className ?? ''
      this.hidden = spec.hidden ?? false
      this.attributes = {}
      this.children = []
      this.parentNode = null
      this.style = {}
      this.offsetLeft = spec.left ?? 0
      this.offsetTop = spec.top ?? 0
      this.offsetWidth = spec.width ?? 0
      this.offsetHeight = spec.height ?? 0
      this.offsetParent = null
      this.rect = { left: spec.left ?? 0, top: spec.top ?? 0, width: spec.width ?? 0, height: spec.height ?? 0 }
    }

    setAttribute(name, value) { this.attributes[name] = String(value) }
    getAttribute(name) { return this.attributes[name] ?? null }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child }
    querySelectorAll(selector) {
      const out = []
      const walk = node => { for (const child of node.children) { if (matches(child, selector)) out.push(child); walk(child) } }
      walk(this)
      return out
    }
    querySelector(selector) {
      if (matches(this, selector)) return this
      return this.querySelectorAll(selector)[0] ?? null
    }
    closest(selector) {
      let node = this
      while (node !== null) { if (matches(node, selector)) return node; node = node.parentNode }
      return null
    }
    /** 动画让 rect 一直抖，布局盒不动。 */
    getBoundingClientRect() {
      const wobble = jitter === 0 ? 0 : Math.round(Math.sin(phase) * jitter)
      return { left: this.rect.left + wobble, top: this.rect.top + wobble, width: this.rect.width, height: this.rect.height,
        right: this.rect.left + wobble + this.rect.width, bottom: this.rect.top + wobble + this.rect.height }
    }
  }

  const matches = (node, selector) => selector.split(',').some(part => {
    const text = part.trim()
    if (text === '*') return true
    if (text === '[hidden]') return node.hidden === true
    if (text.startsWith('[data-dsh-pig]')) return node.attributes['data-dsh-pig'] !== undefined
    if (text.startsWith('.')) return typeof node.className === 'string' && node.className.split(/\s+/).includes(text.slice(1))
    return false
  })

  const body = new Node('body')
  const host = new Node('div', { className: '', left: 700, top: 500, width: 100, height: 120 })
  host.setAttribute('data-dsh-pig', '')
  body.appendChild(host)
  const scene = new Node('div', { className: 'dp-scene', left: 0, top: 0, width: 80, height: 80 })
  scene.offsetParent = host
  scene.offsetLeft = 0
  scene.offsetTop = 0
  host.appendChild(scene)
  const pig = new Node('div', { className: 'dp-pig', left: 6, top: 12, width: 66, height: 66 })
  pig.offsetParent = scene
  pig.rect = { left: 706, top: 512, width: 66, height: 66 }
  scene.appendChild(pig)
  const card = new Node('div', { className: 'dp-card', left: 488, top: 300, width: 292, height: 200 })
  card.hidden = true
  card.offsetParent = host
  host.appendChild(card)

  const timers = []
  const listeners = {}
  const window = {
    __ModuleLoader__: { load() {} },
    __shellCalls: { content: [], shape: [], move: [], bounds: [] },
    piggyShell: {
      setContent: box => window.__shellCalls.content.push(box),
      setShape: rects => window.__shellCalls.shape.push(rects),
      moveBy: (dx, dy) => window.__shellCalls.move.push({ dx, dy }),
      setBounds: bounds => window.__shellCalls.bounds.push(bounds),
      onGeometry: () => {},
      askGeometry: () => { window.__shellCalls.asked = (window.__shellCalls.asked || 0) + 1 },
    },
    addEventListener: (name, fn) => { (listeners[name] ??= []).push(fn) },
    removeEventListener: (name, fn) => { listeners[name] = (listeners[name] ?? []).filter(entry => entry !== fn) },
  }
  const head = new Node('head')
  // shell.js 会往 head 里塞 <script src=client.js>；这里模拟「客户端加载完成」。
  // shellAtLoad 记下 client 挂载那一刻外壳在不在 —— 真实顺序就是这样，晚一步桌面版
  // 就会被当成网页版（拖动只挪页面里的猪）。
  const order = { shellAtLoad: null }
  head.appendChild = function (child) {
    child.parentNode = head
    head.children.push(child)
    if (child.nodeName === 'script' && typeof child.onload === 'function') {
      order.shellAtLoad = typeof window.__dshPiggyShell
      window.__ModuleLoader__.load({
        factory: () => ({
          apply: () => { order.shellAtApply = typeof window.__dshPiggyShell },
        }),
      })
      child.onload()
    }
    return child
  }
  const document = {
    body,
    documentElement: body,
    head,
    createElement: name => new Node(name),
    querySelector: selector => body.querySelector(selector),
    addEventListener: (name, fn) => { (listeners[name] ??= []).push(fn) },
    removeEventListener: (name, fn) => { listeners[name] = (listeners[name] ?? []).filter(entry => entry !== fn) },
  }
  const styleOf = () => ({ display: 'block', visibility: 'visible', opacity: '1' })

  return {
    window, document, body, host, scene, pig, card, listeners, order,
    /** 跑一遍真实 shell.js。 */
    run() {
      const factory = new Function('window', 'document', 'getComputedStyle', 'setInterval', 'requestAnimationFrame', SHELL)
      factory(window, document, styleOf,
        fn => { timers.push(fn); return timers.length },
        () => 0)
      // 让动画抖动往后走几个相位。
      return () => { phase += 0.7 }
    },
    timers,
    tick(advance = true) { if (advance) phase += 0.7; for (const fn of timers) fn() },
    fire(name, event = {}) { for (const fn of listeners[name] ?? []) fn(event) },
  }
}

// ---------------------------------------------------------------------------
// 渲染层：量框不被动画带着走
// ---------------------------------------------------------------------------

test('猪闲着 10 秒：setShape/setContent 一次都不调（动画只改 transform）', () => {
  const page = fakePage({ jitter: 7 })
  const advance = page.run()
  // 头一帧把当前框报上去是应该的；之后 10 秒（120ms 一次 ≈ 83 次）必须一动不动。
  page.tick(false)
  const after = page.window.__shellCalls.content.length + page.window.__shellCalls.shape.length
  for (let i = 0; i < 83; i += 1) { advance(); page.tick() }
  const later = page.window.__shellCalls.content.length + page.window.__shellCalls.shape.length
  assert.equal(later - after, 0, `动画抖动不该触发上报，实际多调了 ${later - after} 次`)
})

test('面板展开 / 收起：内容框变了才上报', () => {
  const page = fakePage()
  page.run()
  page.tick(false)
  const before = page.window.__shellCalls.content.length
  assert.ok(before >= 1, '第一帧要上报一次')

  page.card.hidden = false
  page.card.offsetTop = 200
  page.card.offsetHeight = 300
  page.card.rect = { left: 488, top: 200, width: 292, height: 300 }
  page.tick()
  assert.ok(page.window.__shellCalls.content.length > before, '面板出来要上报新尺寸')
  const box = page.window.__shellCalls.content.at(-1)
  assert.ok(box.height >= 300, `内容框要包住面板：${JSON.stringify(box)}`)
})

test('上报要带猪在窗口坐标里的位置（主进程第二步收敛靠它）', () => {
  const page = fakePage()
  page.run()
  page.tick(false)
  const box = page.window.__shellCalls.content.at(-1)
  assert.equal(typeof box.pigWindow?.x, 'number', '要报 pigWindow.x')
  assert.equal(typeof box.pigWindow?.y, 'number', '要报 pigWindow.y')
})

test('外壳要订阅几何并主动问一次（不然 room() 永远是 null）', () => {
  const page = fakePage()
  page.run()
  assert.equal(page.window.__shellCalls.asked, 1, '挂载时要主动要一次几何')
})

test('真实加载顺序：client 挂载时外壳已经挂好了（拖动才不会当网页版）', () => {
  const page = fakePage()
  page.run()
  assert.equal(page.order.shellAtLoad, 'object', 'shell.js 要在加载 client 之前挂上 __dshPiggyShell')
  assert.equal(page.order.shellAtApply, 'object', 'apply() 里读的时候也得在')
  assert.equal(typeof page.window.__dshPiggyShell.moveBy, 'function')
})

test('面板把场景撑宽后，猪离窗口锚边仍然是 16px（钉的是猪不是 host）', () => {
  const page = fakePage()
  page.run()
  page.tick(false)
  // 面板打开：host/场景变宽，猪在 host 内部被挤到一边（真实布局就是这样）
  page.host.offsetWidth = 292
  page.pig.offsetLeft = 120
  page.scene.offsetWidth = 292
  page.tick()
  // 猪被挤到 host 右边 → 外壳钉右边，并把 host 的右边距补偿成「猪离右边 16px」：
  // innerRight = 292 - 120 - 66 = 106 → right = 16 - 106 = -90
  const right = Number(String(page.host.style.right).replace('px', ''))
  assert.equal(right, 16 - (292 - 120 - 66), `host 右边距要补偿猪的内部偏移：${page.host.style.right}`)
  assert.equal(page.host.style.left, 'auto', '钉右边时左边是 auto')
})

test('上报里带着猪在内容框里的位置（主进程靠它让猪不动）', () => {
  const page = fakePage()
  page.run()
  page.tick(false)
  const box = page.window.__shellCalls.content.at(-1)
  assert.notEqual(box.pig, undefined, '要报猪在内容框里的位置')
  assert.equal(typeof box.pig.x, 'number')
  assert.equal(typeof box.pig.y, 'number')
  assert.ok(box.pig.width > 0 && box.pig.height > 0, `尺寸也要报：${JSON.stringify(box.pig)}`)
  assert.ok(box.pig.x >= 0 && box.pig.x + box.pig.width <= box.width, '猪要在内容框里')
})

test('窗口移动只由页面里的猪负责发（外壳自己不重复发）', () => {
  const page = fakePage()
  page.run()
  page.tick(false)
  // 外壳自己监听鼠标再发一次的话，会和 client 的拖动叠成两倍位移。
  page.fire('pointerdown', { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
  page.fire('pointermove', { clientX: 160, clientY: 130, pointerId: 1, screenX: 460, screenY: 330 })
  page.fire('pointerup', { pointerId: 1 })
  assert.deepEqual(page.window.__shellCalls.move, [], '外壳不该自己发 moveBy')
})

test('拖猪：外壳把移动通道开给页面里的猪使用', () => {
  const page = fakePage()
  page.run()
  page.tick(false)
  // 页面的猪抓着鼠标时调 window.__dshPiggyShell.moveBy，外壳转给主进程。
  assert.equal(typeof page.window.__dshPiggyShell?.moveBy, 'function', '要开一条移动通道')
  page.window.__dshPiggyShell.moveBy(30, -10)
  assert.deepEqual(page.window.__shellCalls.move, [{ dx: 30, dy: -10 }])
})

// ---------------------------------------------------------------------------
// 几何：窗口锚在猪的右下角，永远待在 workArea 里
// ---------------------------------------------------------------------------

const AREA = { x: 0, y: 0, width: 1920, height: 1040 }

test('窗口盯住猪贴的那两条边：锚边不动，另一边长', () => {
  const win = { x: 1500, y: 700, width: 100, height: 120 }
  // 面板朝上开 → 猪贴底、贴右：下边和右边不动
  const up = contentBounds(win, { width: 324, height: 320, anchor: { vertical: 'bottom', horizontal: 'right' } }, AREA)
  assert.deepEqual({ x: up.x, y: up.y }, { x: 1600 - 324, y: 820 - 320 })
  // 面板朝下开 → 猪贴顶、贴左：上边和左边不动
  const down = contentBounds(win, { width: 324, height: 200, anchor: { vertical: 'top', horizontal: 'left' } }, AREA)
  assert.deepEqual({ x: down.x, y: down.y }, { x: 1500, y: 700 })
  // 面板朝下 + 朝左 → 上边和右边不动
  const mix = contentBounds(win, { width: 324, height: 200, anchor: { vertical: 'top', horizontal: 'right' } }, AREA)
  assert.deepEqual({ x: mix.x, y: mix.y }, { x: 1600 - 324, y: 700 })
})

test('窗口不会伸出 workArea：贴边时朝里收', () => {
  const win = { x: 1900, y: 1030, width: 20, height: 10 }
  const open = { width: 324, height: 520, anchor: { vertical: 'bottom', horizontal: 'right' } }
  const grown = contentBounds(win, open, AREA)
  assert.ok(grown.x >= AREA.x && grown.y >= AREA.y, '左上不能负')
  assert.ok(grown.x + grown.width <= AREA.x + AREA.width, '右边不能超出')
  assert.ok(grown.y + grown.height <= AREA.y + AREA.height, '下边不能超出')
})

// ---------------------------------------------------------------------------
// 返工（Claude 验收）：面板朝哪边开，锚点就跟到哪边；猪一像素都不许动
// ---------------------------------------------------------------------------

const PIG = { width: 85, height: 82 }
const PANEL = { width: 292, height: 379 }
const GAP = 8

/** 收起态的内容框：猪 + 四周 16px 留白。 */
function collapsedContent() {
  return { width: PIG.width + WINDOW_PADDING * 2, height: PIG.height + WINDOW_PADDING * 2, pig: { x: WINDOW_PADDING, y: WINDOW_PADDING }, anchor: { vertical: 'bottom', horizontal: 'right' } }
}

/** 猪贴哪两条边（页面钉猪用的就是这个）。 */
function anchorOf(vertical, horizontal) {
  return { vertical: vertical === 'below' ? 'top' : 'bottom', horizontal: horizontal === 'right' ? 'left' : 'right' }
}

/**
 * 展开态：面板在猪的上方或下方、左边或右边。
 * 页面就是这么挑的：哪边有地方往哪边开（横向也是），这样窗口才长得下。
 */
function openedContent(vertical, horizontal) {
  const wide = PIG.width + PANEL.width + GAP
  const tall = PIG.height + GAP + PANEL.height
  const width = (horizontal === 'right' ? wide : wide) + WINDOW_PADDING * 2
  const height = tall + WINDOW_PADDING * 2
  // 横向：'left' = 面板在猪左边（猪靠右），'right' = 面板在猪右边（猪靠左）
  const pigX = horizontal === 'right' ? WINDOW_PADDING : WINDOW_PADDING + PANEL.width + GAP
  const pigY = vertical === 'below' ? WINDOW_PADDING : WINDOW_PADDING + PANEL.height + GAP
  const panel = {
    x: horizontal === 'right' ? WINDOW_PADDING + PIG.width + GAP : WINDOW_PADDING,
    y: vertical === 'below' ? WINDOW_PADDING + PIG.height + GAP : WINDOW_PADDING,
    width: PANEL.width,
    height: PANEL.height,
  }
  return { width, height, pig: { x: pigX, y: pigY, width: PIG.width, height: PIG.height }, anchor: anchorOf(vertical, horizontal), panel }
}

/** 屏幕四角各放一次猪（留出 18px 边距，跟启动位置一致）。 */
function cornerStarts() {
  const corners = []
  for (const vertical of ['top', 'bottom']) {
    for (const horizontal of ['left', 'right']) {
      const collapsed = collapsedContent()
      const width = collapsed.width
      const height = collapsed.height
      const x = horizontal === 'left' ? AREA.x + 18 : AREA.x + AREA.width - width - 18
      const y = vertical === 'top' ? AREA.y + 18 : AREA.y + AREA.height - height - 18
      corners.push({ name: `${vertical}-${horizontal}`, collapsed, start: { x, y, width, height } })
    }
  }
  return corners
}

test('四个角展开/收起：猪不动、面板在窗口里、窗口在 workArea 里、收起回原位', () => {
  for (const corner of cornerStarts()) {
    // 页面按「哪边有地方」挑边：上边靠顶就往下开，左边靠墙就往右开。
    const vertical = corner.name.startsWith('top') ? 'below' : 'above'
    const horizontal = corner.name.endsWith('left') ? 'right' : 'left'
    const open = openedContent(vertical, horizontal)
    const grown = contentBounds(corner.start, open, AREA)
    const label = `${corner.name} / 面板朝${vertical === 'below' ? '下' : '上'}${horizontal === 'right' ? '右' : '左'}`

    // 1) 猪的屏幕坐标前后一致
    assert.equal(grown.x + open.pig.x, corner.start.x + corner.collapsed.pig.x, `${label}：猪的横坐标动了`)
    assert.equal(grown.y + open.pig.y, corner.start.y + corner.collapsed.pig.y, `${label}：猪的纵坐标动了`)

    // 2) 面板完全在窗口里
    const panel = { x: grown.x + open.panel.x, y: grown.y + open.panel.y, width: open.panel.width, height: open.panel.height }
    assert.ok(panel.x >= grown.x && panel.y >= grown.y, `${label}：面板跑到窗口左上外面了`)
    assert.ok(panel.x + panel.width <= grown.x + grown.width, `${label}：面板超出窗口右边`)
    assert.ok(panel.y + panel.height <= grown.y + grown.height, `${label}：面板超出窗口下边`)

    // 3) 窗口完全在 workArea 里
    assert.ok(grown.x >= AREA.x && grown.y >= AREA.y, `${label}：窗口超出左上`)
    assert.ok(grown.x + grown.width <= AREA.x + AREA.width, `${label}：窗口超出右边`)
    assert.ok(grown.y + grown.height <= AREA.y + AREA.height, `${label}：窗口超出下边`)

    // 4) 收起后回到原位（收起时锚边不变，只是窗口缩小）
    const back = contentBounds(grown, { ...corner.collapsed, anchor: open.anchor }, AREA)
    assert.deepEqual(back, corner.start, `${label}：收起后没回到原来的位置`)
  }
})

test('复现 Claude 的 bug：猪在屏幕顶上、面板朝下开时面板必须在窗口里', () => {
  // 窗口 y=0、高 552，面板 544–923 在窗口外 —— 因为旧实现一律锚右下角。
  const collapsed = collapsedContent()
  const start = clampBounds({ x: 1200, y: AREA.y, ...collapsed, width: collapsed.width, height: collapsed.height }, AREA)
  const open = openedContent('below', 'left')
  const grown = contentBounds(start, open, AREA)
  assert.equal(grown.y, start.y, '猪在窗口顶部：窗口该往下长，上边缘别动')
  assert.equal(grown.y + open.pig.y, start.y + collapsed.pig.y, '猪不动')
  assert.ok(grown.y + grown.height >= grown.y + open.panel.y + open.panel.height, '面板要整个在窗口里')
  assert.ok(grown.y + grown.height <= AREA.y + AREA.height, '窗口别伸出屏幕')
})

test('4px 取整：动画级别的抖动不产生新 key，真变化仍然能看出来', () => {
  const base = { x: 700, y: 500, width: 100, height: 120 }
  assert.equal(quantizeKey(base), quantizeKey({ x: 702, y: 501, width: 102, height: 121 }), '3px 内的抖动要算同一帧')
  assert.notEqual(quantizeKey(base), quantizeKey({ x: 708, y: 500, width: 100, height: 120 }), '真挪了位置要能看出来')
  assert.equal(WINDOW_PADDING, 16, '四周留 16px')
})

// ---------------------------------------------------------------------------
// 两步收敛：面板展开/收起后，猪的屏幕坐标差 ≤ 4px（Claude 的 D1 返工 2）
// ---------------------------------------------------------------------------

/** 模拟页面布局：猪被钉在窗口的哪两条边（16px）。 */
function pigWindowBox(windowSize, vertical, horizontal, pigSize = { width: 76, height: 61 }) {
  return {
    x: horizontal === 'left' ? WINDOW_PADDING : windowSize.width - WINDOW_PADDING - pigSize.width,
    y: vertical === 'top' ? WINDOW_PADDING : windowSize.height - WINDOW_PADDING - pigSize.height,
  }
}

test('四个角展开/收起：两步收敛后猪的屏幕坐标差 ≤ 4px', () => {
  for (const corner of cornerStarts()) {
    const vertical = corner.name.startsWith('top') ? 'below' : 'above'   // 面板朝哪边开
    const horizontal = corner.name.endsWith('left') ? 'right' : 'left'
    const open = openedContent(vertical, horizontal)
    const openAnchor = { vertical: vertical === 'below' ? 'top' : 'bottom', horizontal: horizontal === 'right' ? 'left' : 'right' }
    // 收起态：猪钉在右下角（外壳启动时的钉法）
    const collapsedPigWindow = pigWindowBox(corner.start, 'bottom', 'right')
    const target = { x: corner.start.x + collapsedPigWindow.x, y: corner.start.y + collapsedPigWindow.y }
    const label = `${corner.name} / 面板朝${vertical === 'below' ? '下' : '上'}${horizontal === 'right' ? '右' : '左'}`

    // 第一步：只改大小
    const sized = contentBounds(corner.start, open, AREA)
    assert.deepEqual({ width: sized.width, height: sized.height }, { width: open.width, height: open.height }, `${label}：大小要对`)
    // 第二步：页面量到猪在窗口里的真实位置 → 平移一次
    const openedPigWindow = pigWindowBox(sized, openAnchor.vertical, openAnchor.horizontal)
    // 锚边没翻的时候本来就不用补（返回 null 就是「不动」）
    const fixed = anchorCorrection(sized, openedPigWindow, target, AREA) ?? sized
    const pigAfterOpen = { x: fixed.x + openedPigWindow.x, y: fixed.y + openedPigWindow.y }
    assert.ok(Math.abs(pigAfterOpen.x - target.x) <= 4, `${label}：横坐标差 ${pigAfterOpen.x - target.x}`)
    assert.ok(Math.abs(pigAfterOpen.y - target.y) <= 4, `${label}：纵坐标差 ${pigAfterOpen.y - target.y}`)
    assert.ok(fixed.x >= AREA.x && fixed.y >= AREA.y && fixed.x + fixed.width <= AREA.x + AREA.width && fixed.y + fixed.height <= AREA.y + AREA.height, `${label}：窗口别出界`)

    // 收起：同理反着来一次，回到原来的位置
    const collapsedContentAgain = { ...corner.collapsed, anchor: open.anchor }
    const sizedBack = contentBounds(fixed, collapsedContentAgain, AREA)
    const collapsedPigWindowAgain = pigWindowBox(sizedBack, 'bottom', 'right')
    const fixedBack = anchorCorrection(sizedBack, collapsedPigWindowAgain, pigAfterOpen, AREA)
    const pigAfterClose = { x: (fixedBack ?? sizedBack).x + collapsedPigWindowAgain.x, y: (fixedBack ?? sizedBack).y + collapsedPigWindowAgain.y }
    assert.ok(Math.abs(pigAfterClose.x - target.x) <= 4, `${label}：收起后横坐标差 ${pigAfterClose.x - target.x}`)
    assert.ok(Math.abs(pigAfterClose.y - target.y) <= 4, `${label}：收起后纵坐标差 ${pigAfterClose.y - target.y}`)
  }
})

test('收敛不折腾：差值在容差内就不动窗口', () => {
  const win = { x: 500, y: 300, width: 324, height: 271 }
  assert.equal(anchorCorrection(win, { x: 16, y: 16 }, { x: 516, y: 316 }, AREA), null)
  assert.equal(ANCHOR_TOLERANCE, 1)
  // 差 10px 才动，且正好补掉差值
  const fixed = anchorCorrection(win, { x: 26, y: 16 }, { x: 516, y: 316 }, AREA)
  assert.deepEqual({ x: fixed.x, y: fixed.y }, { x: 490, y: 300 })
})
