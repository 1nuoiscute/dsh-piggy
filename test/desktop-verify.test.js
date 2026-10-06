// 摆放的闭环：摆完要用回读的窗口 + 实测的猪本地框核对一次猪的屏幕坐标。
// 这是 2026-10-06「更新后右键就偏移、偏了还一直在那儿」的根治点：
// 之前是开环预测，系统取整 / 夹取 / DPI 缩放造成的偏差没人回读，会被下一次计算继承。
import assert from 'node:assert/strict'
import { test } from 'node:test'

const { pigCorrection } = await import('../src/client/desktop/geometry.js')

const WINDOW = { x: 1400, y: 300, width: 324, height: 692 }
const PIG_LOCAL = { x: 250, y: 610 }

test('差在容忍内不修正：不许每次内容变化都多一次 setBounds', () => {
  const target = { x: 1650, y: 910 }
  assert.equal(pigCorrection(WINDOW, PIG_LOCAL, target, 1), null)
  assert.equal(pigCorrection({ ...WINDOW, x: 1401 }, PIG_LOCAL, target, 1), null, '1px 取整放过去')
})

test('窗口被系统取整：把猪拉回目标点，且只差多少补多少', () => {
  // 请求 1400 落到 1404（Windows 分数缩放下 setBounds 取整到物理像素）
  const target = { x: 1650, y: 910 }
  const fixed = pigCorrection({ ...WINDOW, x: 1404, y: 303 }, PIG_LOCAL, target, 1)
  assert.notEqual(fixed, null)
  assert.equal(fixed.dx, 4)
  assert.equal(fixed.dy, 3)
  assert.equal(fixed.bounds.x + PIG_LOCAL.x, target.x, '修正后猪正好落在目标上')
  assert.equal(fixed.bounds.y + PIG_LOCAL.y, target.y)
  assert.equal(fixed.bounds.width, WINDOW.width, '只挪位置，不改大小')
  assert.equal(fixed.bounds.height, WINDOW.height)
})

test('面板把窗口夹住导致的偏差也能修回来', () => {
  const target = { x: 1650, y: 910 }
  const clamped = { x: 1200, y: 300, width: 324, height: 692 }
  const fixed = pigCorrection(clamped, PIG_LOCAL, target, 1)
  assert.equal(fixed.dx, 1200 + 250 - 1650, '-200：夹住让猪少走了 200px')
  assert.equal(fixed.bounds.x + PIG_LOCAL.x, target.x)
})

test('修正之后的窗口再核对一次就该通过（不会来回抖）', () => {
  const target = { x: 1650, y: 910 }
  const off = { ...WINDOW, x: 1407, y: 296 }
  const fixed = pigCorrection(off, PIG_LOCAL, target, 1)
  assert.notEqual(fixed, null)
  // 系统把修正值又取整 1px：还在容忍内，不再动。
  assert.equal(pigCorrection({ ...fixed.bounds, x: fixed.bounds.x + 1 }, PIG_LOCAL, target, 1), null)
})

test('猪在窗口里的本地位置变了（钉边换边）也按实测值核对', () => {
  const target = { x: 1650, y: 910 }
  // 窗口没动，但猪在窗口里挪了 12px：这就是「预测的本地框和实测不一致」那一类。
  const fixed = pigCorrection(WINDOW, { x: PIG_LOCAL.x + 12, y: PIG_LOCAL.y }, target, 1)
  assert.equal(fixed.dx, 12)
  assert.equal(fixed.bounds.x, WINDOW.x - 12)
})
