import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

const memory = new Map()
globalThis.localStorage = {
  getItem: key => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => { memory.set(key, String(value)) },
  removeItem: key => { memory.delete(key) },
}
const { createPlacement } = await import('../src/client/desktop/place.js')

const AREA = [{ x: 0, y: 0, width: 1920, height: 1040 }]
const report = (over = {}) => ({
  width: 324, height: 692, anchor: { vertical: 'bottom', horizontal: 'right' },
  pig: { x: 250, y: 610, width: 54, height: 54 }, pigWindow: { x: 250, y: 610 }, pigNow: { x: 250, y: 610 },
  panelOpen: false, ...over,
})

test('游戏包里的摆放规则：开关面板本身不挪窗口', () => {
  memory.clear()
  const place = createPlacement({ now: () => 0 })
  const win = { x: 1400, y: 300, width: 324, height: 692 }
  place.decide(report(), win, AREA)
  assert.equal(place.decide(report({ panelOpen: true }), win, AREA), null)
  assert.equal(place.decide(report({ panelOpen: false }), win, AREA), null)
})

test('猪换大小保持脚底中心；拖动后原位作废', () => {
  memory.clear()
  const place = createPlacement({ now: () => 0 })
  const win = { x: 1400, y: 300, width: 324, height: 692 }
  place.decide(report(), win, AREA)
  const bigger = place.decide(report({ pig: { x: 240, y: 590, width: 92, height: 92 }, pigWindow: { x: 240, y: 590 } }), win, AREA)
  // 原来脚底中心 (1400+250+27, 300+610+54) = (1677, 964)
  assert.equal(bigger.x + 240 + 46, 1677)
  assert.equal(bigger.y + 590 + 92, 964)
  place.dragStarted()
})

test('启动时按存下的猪位置摆（不按窗口），记住的位置跟着更新', () => {
  memory.clear()
  memory.set('dsh-piggy:desktop-pig', JSON.stringify({ x: 1700, y: 900 }))
  const place = createPlacement({ now: () => 0 })
  const next = place.decide(report(), { x: 100, y: 100, width: 98, height: 139 }, AREA)
  assert.equal(next.x + 250, 1700)
  assert.equal(next.y + 610, 900)
  place.remember({ x: next.x, y: next.y, width: 324, height: 692 })
  assert.deepEqual(JSON.parse(memory.get('dsh-piggy:desktop-pig')), { x: 1700, y: 900 })
})

test('游戏包导出桌面模块；更新页只给普通玩家看正式版，可选的外壳更新不再红字', () => {
  const index = readFileSync(new URL('../src/client/index.js', import.meta.url), 'utf8')
  assert.match(index, /exports\.desktop = desktop/)
  const update = readFileSync(new URL('../src/client/tabs/update.js', import.meta.url), 'utf8')
  assert.match(update, /renderList\(ui, state\.list\.filter\(eligible\)\)/)
  assert.match(update, /required \? 'dp-req' : 'dp-dim'/)
})

test('启动复位完成之前不记猪的位置（占位纸盒阶段记下来会让下次启动摆错）', () => {
  memory.clear()
  memory.set('dsh-piggy:desktop-pig', JSON.stringify({ x: 1700, y: 900 }))
  const place = createPlacement({ now: () => 0 })
  place.decide(report({ pig: { x: 219, y: 78, width: 73, height: 58 }, pigWindow: { x: 219, y: 78 }, pigNow: { x: 219, y: 78 } }), { x: 1400, y: 300, width: 336, height: 736 }, AREA)
  place.remember({ x: 1462, y: 810, width: 336, height: 736 })
  assert.deepEqual(JSON.parse(memory.get('dsh-piggy:desktop-pig')), { x: 1700, y: 900 })
})
