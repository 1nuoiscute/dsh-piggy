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

test('开面板时的猪原位取「钉边之前」的实测值', () => {
  memory.clear()
  const place = createPlacement({ now: () => 0 })
  const win = { x: 1400, y: 300, width: 324, height: 692 }
  place.decide(report(), win, AREA)
  // 开面板：钉边（pin）会把猪在窗口里的 left/top 改掉，所以 pigNow 是钉边之后的。
  // 原位必须用钉边之前的 (250,610)，而不是钉边之后的 (262,604)——用后者记下来的原位
  // 天生差几像素，实测就是「开面板时猪稳定跳 3~4px」。
  const opened = place.decide(report({
    panelOpen: true, height: 900,
    pigBeforePin: { x: 250, y: 610 }, pigNow: { x: 262, y: 604 }, pigWindow: { x: 262, y: 604 },
  }), win, AREA)
  assert.notEqual(opened, null, '面板变大，窗口要跟着摆')
  assert.deepEqual(place.target(), { x: 1400 + 250, y: 300 + 610 }, '原位按钉边之前的实测值')
})

test('钉边之后的实测值不能污染原位（3~4px 跳动的回归）', () => {
  memory.clear()
  const place = createPlacement({ now: () => 0 })
  const win = { x: 1400, y: 300, width: 324, height: 692 }
  place.decide(report(), win, AREA)
  const anchor = { x: 250, y: 610 }
  const openWith = after => place.decide(report({
    panelOpen: true, height: 900, pigBeforePin: anchor, pigNow: after, pigWindow: after,
  }), win, AREA) && place.target()
  const first = openWith({ x: 262, y: 604 })
  place.dragStarted()
  place.decide(report(), win, AREA)
  const second = openWith({ x: 253, y: 613 })
  assert.deepEqual(first, second, '钉边之后量到多少都不影响原位')
  assert.deepEqual(first, { x: 1400 + anchor.x, y: 300 + anchor.y })
})

test('摆放的目标点可以被核对方取走并清掉', () => {
  memory.clear()
  const place = createPlacement({ now: () => 0 })
  assert.equal(place.target(), null, '还没摆过就没有目标')
  place.decide(report({ width: 400 }), { x: 1400, y: 300, width: 324, height: 692 }, AREA)
  assert.notEqual(place.target(), null)
  place.targetDone()
  assert.equal(place.target(), null, '核对过就清掉，避免重复修')
})

test('拖动开始会作废目标点（拖动由主进程摆，页面不再核对旧目标）', () => {
  memory.clear()
  const place = createPlacement({ now: () => 0 })
  place.decide(report({ width: 400 }), { x: 1400, y: 300, width: 324, height: 692 }, AREA)
  assert.notEqual(place.target(), null)
  place.dragStarted()
  assert.equal(place.target(), null)
})

test('位置存成「显示器 + 相对偏移」，不再存绝对屏幕坐标', () => {
  memory.clear()
  const place = createPlacement({ now: () => 0 })
  const areas = [{ x: 0, y: 0, width: 1920, height: 1040 }, { x: 0, y: 1080, width: 1920, height: 1080 }]
  const win = { x: 1400, y: 1300, width: 324, height: 692 }
  place.decide(report({ pigBeforePin: { x: 250, y: 610 } }), win, areas)
  place.remember(win, areas)
  const stored = JSON.parse(memory.get('dsh-piggy:desktop-pig'))
  assert.equal(stored.v, 2, '带存储版本')
  assert.deepEqual(stored.area, areas[1], '记下猪在哪块屏')
  assert.deepEqual({ x: stored.x, y: stored.y }, { x: win.x + 250 - areas[1].x, y: win.y + 610 - areas[1].y }, '存相对偏移')
})

test('重启后按「显示器相对」换算回绝对坐标（同一套屏幕排列）', () => {
  memory.clear()
  memory.set('dsh-piggy:desktop-pig', JSON.stringify({ v: 2, area: { x: 0, y: 1080, width: 1920, height: 1080 }, x: 1650, y: 830 }))
  const place = createPlacement({ now: () => 0 })
  const areas = [{ x: 0, y: 0, width: 1920, height: 1040 }, { x: 0, y: 1080, width: 1920, height: 1080 }]
  const next = place.decide(report(), { x: 100, y: 100, width: 98, height: 139 }, areas)
  assert.equal(next.x + 250, 1650, 'x = 屏原点 + 相对偏移')
  assert.equal(next.y + 610, 1910)
})

test('显示器拔掉：按最近的那块屏落地，不留在一块不存在的屏上', () => {
  memory.clear()
  memory.set('dsh-piggy:desktop-pig', JSON.stringify({ v: 2, area: { x: 0, y: 1080, width: 1920, height: 1080 }, x: 1650, y: 830 }))
  const place = createPlacement({ now: () => 0 })
  const only = [{ x: 0, y: 0, width: 1920, height: 1040 }]
  const next = place.decide(report(), { x: 100, y: 100, width: 98, height: 139 }, only)
  assert.equal(next.y + 610, 830, '下屏拔了就落在剩下的屏上（用户 2026-10-06 确认这是预期行为）')
  assert.ok(next.y + 610 <= 1040)
})

test('旧格式（绝对屏幕坐标）还能用，启动复位结束后写入自动升级成 v2', () => {
  memory.clear()
  memory.set('dsh-piggy:desktop-pig', JSON.stringify({ x: 1700, y: 900 }))
  let clock = 0
  const place = createPlacement({ now: () => clock })
  const win = { x: 100, y: 100, width: 98, height: 139 }
  const next = place.decide(report({ pigBeforePin: { x: 250, y: 610 } }), win, AREA)
  assert.equal(next.x + 250, 1700, '旧位置照用')
  // 启动复位期间不写盘（怕把占位纸盒的位置记下来）；过了 4 秒才允许记。
  place.remember({ x: next.x, y: next.y, width: 324, height: 692 }, AREA)
  assert.equal(memory.get('dsh-piggy:desktop-pig'), JSON.stringify({ x: 1700, y: 900 }), '复位期间不覆盖')
  clock = 5000
  place.decide(report({ pigBeforePin: { x: 250, y: 610 }, width: 340 }), win, AREA)
  place.remember({ x: 1650, y: 900, width: 340, height: 692 }, AREA)
  const stored = JSON.parse(memory.get('dsh-piggy:desktop-pig'))
  assert.equal(stored.v, 2, '下次写入升级成 v2')
  assert.deepEqual(stored.area, AREA[0])
})

test('游戏包导出桌面模块；更新页只推荐正式版、测试版折叠，可选的外壳更新不再红字', () => {
  const index = readFileSync(new URL('../src/client/index.js', import.meta.url), 'utf8')
  assert.match(index, /exports\.desktop = desktop/)
  const update = readFileSync(new URL('../src/client/tabs/update.js', import.meta.url), 'utf8')
  // G 批次：测试版收进对应正式版下面、默认折叠；只推荐正式版。
  assert.match(update, /var eligible = function \(r\) \{ return !r\.prerelease \}/)
  assert.match(update, /测试版 ' \+ group\.previews\.length \+ ' 个 · 手动安装/)
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

test('气泡不进窗口外框，猪头上方一直留气泡位置（面板朝下开时冒气泡会让整块内容挪一下，Windows 上出重影）', () => {
  const src = readFileSync(new URL('../src/client/desktop/measure.js', import.meta.url), 'utf8')
  assert.match(src, /if \(bubble !== null\) bubbleRects\.push\(rect\)/)
  assert.match(src, /let outline = rects\.concat\(zone === null \? \[\] : \[zone\], bubbleZone === null \? \[\] : \[bubbleZone\]\)/)
  assert.match(src, /const shape = rects\.concat\(bubbleRects\)/)
  assert.match(src, /dsh-piggy:desktop-sides/)
})
