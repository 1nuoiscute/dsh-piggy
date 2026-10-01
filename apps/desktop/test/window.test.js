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

import { WINDOW_PADDING, clampBounds, contentBounds, movedBounds, quantizeKey } from '../lib/window-geometry.js'

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
  const scene = new Node('div', { className: 'dp-scene', left: 700, top: 500, width: 80, height: 80 })
  scene.offsetParent = body
  host.appendChild(scene)
  const pig = new Node('div', { className: 'dp-pig', left: 706, top: 512, width: 66, height: 66 })
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
    },
    addEventListener: (name, fn) => { (listeners[name] ??= []).push(fn) },
    removeEventListener: (name, fn) => { listeners[name] = (listeners[name] ?? []).filter(entry => entry !== fn) },
  }
  const head = new Node('head')
  // shell.js 会往 head 里塞 <script src=client.js>；这里模拟「客户端加载完成」。
  head.appendChild = function (child) {
    child.parentNode = head
    head.children.push(child)
    if (child.nodeName === 'script' && typeof child.onload === 'function') {
      window.__ModuleLoader__.load({ factory: () => ({ apply: () => {} }) })
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
    window, document, body, host, scene, pig, card, listeners,
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

test('拖猪：窗口跟着走，页面上不再自己挪位置', () => {
  const page = fakePage()
  page.run()
  page.tick(false)
  page.window.__shellCalls.move.length = 0

  // 外壳的拖动通道：pointerdown 之后 pointermove 的增量交给主进程。
  page.fire('pointerdown', { button: 0, clientX: 100, clientY: 100, pointerId: 1, target: page.pig })
  page.fire('pointermove', { clientX: 130, clientY: 90, pointerId: 1 })
  page.fire('pointerup', { pointerId: 1 })

  assert.equal(page.window.__shellCalls.move.length, 1, '拖动要通知主进程移动窗口')
  assert.deepEqual(page.window.__shellCalls.move[0], { dx: 30, dy: -10 })
})

// ---------------------------------------------------------------------------
// 几何：窗口锚在猪的右下角，永远待在 workArea 里
// ---------------------------------------------------------------------------

const AREA = { x: 0, y: 0, width: 1920, height: 1040 }

test('内容变大时以右下角为锚往外长', () => {
  const win = { x: 1500, y: 700, width: 100, height: 120 }
  const grown = contentBounds(win, { width: 324, height: 520 }, AREA)
  assert.equal(grown.x + grown.width, win.x + win.width, '右边缘不动')
  assert.equal(grown.y + grown.height, win.y + win.height, '下边缘不动')
  assert.deepEqual({ width: grown.width, height: grown.height }, { width: 324, height: 520 })
})

test('窗口不会伸出 workArea：贴边时朝里收', () => {
  const win = { x: 1900, y: 1030, width: 20, height: 10 }
  const grown = contentBounds(win, { width: 324, height: 520 }, AREA)
  assert.ok(grown.x >= AREA.x && grown.y >= AREA.y, '左上不能负')
  assert.ok(grown.x + grown.width <= AREA.x + AREA.width, '右边不能超出')
  assert.ok(grown.y + grown.height <= AREA.y + AREA.height, '下边不能超出')
})

test('拖到屏幕外时夹回 workArea（多显示器：按那块屏算）', () => {
  const second = { x: 1920, y: 0, width: 1280, height: 1024 }
  assert.deepEqual(movedBounds({ x: 2000, y: 100, width: 100, height: 100 }, 50, -200, second), { x: 2050, y: 0, width: 100, height: 100 })
  assert.deepEqual(movedBounds({ x: 1930, y: 100, width: 100, height: 100 }, -500, 0, second), { x: 1920, y: 100, width: 100, height: 100 })
  // 比屏幕还大的窗口：贴左上，不硬塞。
  assert.deepEqual(clampBounds({ x: -50, y: -50, width: 4000, height: 3000 }, AREA), { x: 0, y: 0, width: 4000, height: 3000 })
})

test('4px 取整：动画级别的抖动不产生新 key，真变化仍然能看出来', () => {
  const base = { x: 700, y: 500, width: 100, height: 120 }
  assert.equal(quantizeKey(base), quantizeKey({ x: 702, y: 501, width: 102, height: 121 }), '3px 内的抖动要算同一帧')
  assert.notEqual(quantizeKey(base), quantizeKey({ x: 708, y: 500, width: 100, height: 120 }), '真挪了位置要能看出来')
  assert.equal(WINDOW_PADDING, 16, '四周留 16px')
})
