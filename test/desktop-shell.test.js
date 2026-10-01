/**
 * D1 桌面版接缝：网页版没变，桌面版把位置和面板挑边交给外壳。
 *
 * 假的外壳（window.__dshPiggyShell）模拟「窗口贴着猪、屏幕还有多少地方」，
 * 这里验证：
 * 1. 外壳在时，拖猪只发窗口增量，不写 localStorage 的坐标；
 * 2. 面板朝屏幕里侧开（用外壳报的屏幕空间，而不是小窗口的 innerWidth）；
 * 3. 网页版（没有外壳）行为不变：坐标照旧写盘、面板照旧按视口挑边。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { SNAPSHOT, fakeDom, contentOf, findByAttr, findByClass, hostOf, mount, openPanel, sceneOf, settle } from './helpers/bundle.js'

const SHELL_SRC = readFileSync(new URL('../apps/desktop/renderer/shell.js', import.meta.url), 'utf8')

/** 外壳：屏幕 1920x1040，猪停在右下角，上方空间 900、下方 100。 */
function fakeShell(room) {
  const calls = { move: [], bounds: [] }
  return {
    calls,
    shell: {
      moveBy: (dx, dy) => calls.move.push({ dx, dy }),
      room: () => room,
    },
  }
}

test('桌面版：拖猪只把增量交给窗口，不写页面坐标', async () => {
  const { shell, calls } = fakeShell({ above: 900, below: 100, width: 1920, height: 1040 })
  const { dom, store } = await mount({ windowExtra: { __dshPiggyShell: shell } })
  openPanel(dom, 'status')

  const scene = sceneOf(dom)
  const offsetBefore = hostOf(dom).style.right
  scene.fire('pointerdown', { button: 0, clientX: 100, clientY: 100, screenX: 1000, screenY: 900, pointerId: 1 })
  scene.fire('pointermove', { clientX: 130, clientY: 90, screenX: 1030, screenY: 890, pointerId: 1 })
  scene.fire('pointermove', { clientX: 150, clientY: 60, screenX: 1050, screenY: 860, pointerId: 1 })
  scene.fire('pointerup', { pointerId: 1 })

  assert.deepEqual(calls.move, [{ dx: 30, dy: -10 }, { dx: 20, dy: -30 }], '两次移动都要转给窗口')
  assert.equal(store.get('dsh-piggy:position'), undefined, '桌面版不写页面坐标')
  assert.equal(hostOf(dom).style.right, offsetBefore, '拖动不改页面里的位置（位置归窗口）')
})

test('桌面版：面板按屏幕空间朝上开（小窗口的 innerWidth 不算数）', async () => {
  const { shell } = fakeShell({ above: 900, below: 100, width: 1920, height: 1040 })
  const { dom } = await mount({ windowExtra: { __dshPiggyShell: shell } })
  openPanel(dom, 'status')
  const card = hostOf(dom).children[0]
  assert.ok(String(card.style.bottom).includes('100%'), `该朝上开：${card.style.bottom}`)
  assert.equal(card.style.right, '0px', '桌面版窗口会自己长，不横向挪')
  assert.equal(card.style.maxWidth, '292px')
})

test('桌面版：拖动增量按屏幕坐标算（窗口自己在动，clientX 会算错）', async () => {
  const { shell, calls } = fakeShell({ above: 900, below: 100, left: 900, right: 900, width: 1920, height: 1040 })
  const { dom } = await mount({ windowExtra: { __dshPiggyShell: shell } })
  openPanel(dom, 'status')

  const scene = sceneOf(dom)
  scene.fire('pointerdown', { button: 0, clientX: 100, clientY: 100, screenX: 1000, screenY: 800, pointerId: 1 })
  // 窗口跟着挪了 40px：clientX 只涨了 20，屏幕坐标老老实实涨了 40。
  scene.fire('pointermove', { clientX: 120, clientY: 100, screenX: 1040, screenY: 760, pointerId: 1 })
  scene.fire('pointerup', { pointerId: 1 })

  assert.deepEqual(calls.move, [{ dx: 40, dy: -40 }], '要按屏幕坐标算增量，不是 clientX')
})

test('桌面版：四个角挑边，host 上写 data-panel-side（猪才能待在对应那端）', async () => {
  const corners = [
    { name: '左上', room: { above: 40, below: 887, left: 28, right: 1819, width: 1920, height: 985 }, side: 'right' },
    { name: '右上', room: { above: 40, below: 887, left: 1819, right: 28, width: 1920, height: 985 }, side: 'left' },
    { name: '左下', room: { above: 887, below: 40, left: 28, right: 1819, width: 1920, height: 985 }, side: 'right' },
    { name: '右下', room: { above: 887, below: 40, left: 1819, right: 28, width: 1920, height: 985 }, side: 'left' },
  ]
  for (const corner of corners) {
    const { shell } = fakeShell(corner.room)
    const { dom } = await mount({ windowExtra: { __dshPiggyShell: shell } })
    const host = hostOf(dom)
    assert.equal(host.getAttribute('data-panel-side'), null, `${corner.name}：没开面板不该写属性`)
    openPanel(dom, 'status')
    assert.equal(host.getAttribute('data-panel-side'), corner.side, `${corner.name}：面板该朝${corner.side === 'right' ? '右' : '左'}开`)
    const card = host.children[0]
    if (corner.side === 'right') {
      assert.equal(card.style.left, '0px', `${corner.name}：面板贴猪右边`)
      assert.equal(card.style.right, 'auto')
    } else {
      assert.equal(card.style.right, '0px', `${corner.name}：面板在猪左边`)
    }
    // 朝右开时猪在场景左端：HUD 挪到猪右边（不然压在猪身上）；朝左开时照旧从 9px 起
    const hud = findByClass(host, 'dp-hud')
    assert.ok(hud !== undefined, 'HUD 要在')
    if (corner.side === 'right') {
      const pig = findByClass(host, 'dp-pig')
      const want = Math.round((pig.offsetLeft || 0) + (pig.offsetWidth || 0) + 8) + 'px'
      assert.equal(hud.style.left, want, `${corner.name}：HUD 在猪右边`)
    } else {
      assert.equal(hud.style.left, '9px', `${corner.name}：HUD 从场景左边起`)
    }
    // 纵向：上方有地方就朝上开
    const above = corner.room.above > corner.room.below
    assert.ok(String(card.style.bottom).includes('100%') === above, `${corner.name}：纵向挑边`)
  }
})

test('网页版：没有外壳时行为不变（坐标写盘、面板按视口挑边）', async () => {
  const { dom, store } = await mount()
  openPanel(dom, 'status')
  const scene = sceneOf(dom)
  scene.fire('pointerdown', { button: 0, clientX: 100, clientY: 100, screenX: 800, screenY: 600, pointerId: 1 })
  scene.fire('pointermove', { clientX: 130, clientY: 90, screenX: 830, screenY: 590, pointerId: 1 })
  scene.fire('pointerup', { pointerId: 1 })
  await settle()
  assert.notEqual(store.get('dsh-piggy:position'), undefined, '网页版照旧记住位置')
  assert.notEqual(hostOf(dom).style.right, undefined, '网页版自己挪位置')
})

// ---------------------------------------------------------------------------
// 真实加载顺序：renderer 先跑 shell.js，再由它加载 client.js
// ---------------------------------------------------------------------------

/** 极简选择器：够 shell.js 用（[data-dsh-pig]、.dp-scene、.dp-pig）。 */
function find(root, selector) {
  const parts = selector.trim().split(/\s+/)
  let nodes = [root]
  for (const part of parts) {
    const next = []
    const match = node => part === '[data-dsh-pig]' ? node.attributes?.['data-dsh-pig'] !== undefined
      : part.startsWith('.') ? String(node.className ?? '').split(/\s+/).includes(part.slice(1))
        : false
    for (const node of nodes) {
      const walk = child => { for (const kid of child.children ?? []) { if (match(kid)) next.push(kid); walk(kid) } }
      walk(node)
    }
    nodes = next
  }
  return nodes[0] ?? null
}

test('真实顺序（shell.js → client.js）：按住猪拖，窗口跟着走，页面里猪不动', async () => {
  const dom = fakeDom()
  const calls = { move: [], content: [], shape: [] }
  const store = new Map()
  const winListeners = {}
  const timers = []

  globalThis.window = {
    __ModuleLoader__: { load: () => {} },
    piggyShell: {
      setContent: box => calls.content.push(box),
      setShape: rects => calls.shape.push(rects),
      moveBy: (dx, dy) => calls.move.push({ dx, dy }),
      geometry: () => ({ window: { x: 1500, y: 700, width: 240, height: 220 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }),
      onGeometry: () => {},
    },
    localStorage: {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => { store.set(key, String(value)) },
    },
    setInterval: fn => { timers.push(fn); return timers.length },
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    innerWidth: 240,
    innerHeight: 220,
    addEventListener: (name, fn) => { (winListeners[name] ??= []).push(fn) },
    removeEventListener: () => {},
  }
  // 元素补上 shell 要用的 closest（假 DOM 里没实现）。
  const makeElement = tag => {
    const node = dom.document.createElement(tag)
    // 假 DOM 只记了 tagName，shell.js 按 nodeName 认脚本。
    node.nodeName = tag
    node.closest = () => null
    // 假 DOM 缺的两个接口（真浏览器里永远有）。
    node.querySelectorAll = () => []
    node.offsetParent = null
    node.offsetLeft = 0
    node.offsetTop = 0
    node.offsetWidth = 0
    node.offsetHeight = 0
    return node
  }
  globalThis.document = {
    ...dom.document,
    createElement: makeElement,
    createElementNS: (ns, tag) => makeElement(tag),
    querySelector: selector => find(dom.body, selector),
  }
  globalThis.window.document = globalThis.document
  globalThis.getComputedStyle = () => ({ display: 'block', visibility: 'visible', opacity: '1' })
  globalThis.fetch = async () => ({ ok: true, status: 200, async json() { return SNAPSHOT } })

  // 真实的加载顺序：先 shell.js（它挂 __dshPiggyShell，再把 client.js 塞进 head）。
  const head = dom.document.head
  let loading = Promise.resolve()
  head.appendChild = child => {
    child.parentNode = head
    head.children.push(child)
    if (child.nodeName === 'script' && typeof child.onload === 'function') {
      const url = new URL('../client.js', import.meta.url)
      url.searchParams.set('t', 'shell-order')
      loading = import(url.href).then(() => { child.onload(); return child })
      return child
    }
    return child
  }
  const runShell = new Function('window', 'document', 'getComputedStyle', 'setInterval', SHELL_SRC)
  runShell(globalThis.window, globalThis.document, globalThis.getComputedStyle, globalThis.window.setInterval)
  await loading
  await settle()

  const host = hostOf(dom)
  assert.notEqual(host, undefined, 'client 要挂上猪')
  const scene = find(dom.body, '[data-dsh-pig] .dp-scene')
  assert.notEqual(scene, null, '要能找到场景')
  const before = { right: host.style.right, bottom: host.style.bottom, top: host.style.top, left: host.style.left }

  scene.fire('pointerdown', { button: 0, clientX: 60, clientY: 60, screenX: 1560, screenY: 760, pointerId: 1 })
  scene.fire('pointermove', { clientX: 70, clientY: 60, screenX: 1570, screenY: 760, pointerId: 1 })
  scene.fire('pointermove', { clientX: 110, clientY: 40, screenX: 1610, screenY: 740, pointerId: 1 })
  scene.fire('pointerup', { clientX: 110, clientY: 40, screenX: 1610, screenY: 740, pointerId: 1 })

  const total = calls.move.reduce((sum, step) => ({ dx: sum.dx + step.dx, dy: sum.dy + step.dy }), { dx: 0, dy: 0 })
  assert.equal(calls.move.length > 0, true, '桌面版拖动必须调 moveBy（这次就是没调）')
  assert.deepEqual(total, { dx: 50, dy: -20 }, '累计位移要等于鼠标的屏幕位移')
  assert.deepEqual(
    { right: host.style.right, bottom: host.style.bottom, top: host.style.top, left: host.style.left },
    before,
    '页面里猪的位置不能在拖动时变',
  )
  assert.equal(store.get('dsh-piggy:position'), undefined, '桌面版不写网页版的 POSITION_KEY')
})

test('CSS：朝右开时场景改左对齐，气泡/道具跟着镜像（网页版不受影响）', async () => {
  const { dom } = await mount()
  const css = String(dom.document.head.children.map(node => node.textContent ?? '').join('\n'))
  assert.match(css, /\[data-dsh-pig\]\[data-panel-side="right"\] \.dp-scene\{[^}]*justify-content:flex-start/,
    '朝右开时猪要待在场景左端（不然面板一开猪从右端跑到左端，位移 207px）')
  assert.match(css, /\[data-dsh-pig\]\[data-panel-side="right"\] \.dp-bubble\{[^}]*left:8px/,
    '气泡要跟着猪挪到左边')
  assert.match(css, /\[data-dsh-pig\]\[data-panel-side="right"\] \.dp-work\{margin:0 0 6px 2px\}/,
    '打工道具的间距也要镜像')
  // 网页版没有这个属性，规则不会命中
  assert.ok(!/\[data-panel-side/.test(css.replace(/\[data-dsh-pig\]\[data-panel-side/g, '')), '规则都要挂在 data-dsh-pig 上')
})
