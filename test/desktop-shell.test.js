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
import { test } from 'node:test'

import { SNAPSHOT, contentOf, findByAttr, hostOf, mount, openPanel, sceneOf, settle } from './helpers/bundle.js'

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
  scene.fire('pointerdown', { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
  scene.fire('pointermove', { clientX: 130, clientY: 90, pointerId: 1 })
  scene.fire('pointermove', { clientX: 150, clientY: 60, pointerId: 1 })
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

test('网页版：没有外壳时行为不变（坐标写盘、面板按视口挑边）', async () => {
  const { dom, store } = await mount()
  openPanel(dom, 'status')
  const scene = sceneOf(dom)
  scene.fire('pointerdown', { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
  scene.fire('pointermove', { clientX: 130, clientY: 90, pointerId: 1 })
  scene.fire('pointerup', { pointerId: 1 })
  await settle()
  assert.notEqual(store.get('dsh-piggy:position'), undefined, '网页版照旧记住位置')
  assert.notEqual(hostOf(dom).style.right, undefined, '网页版自己挪位置')
})
