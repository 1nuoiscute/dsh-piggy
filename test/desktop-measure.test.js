import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createMeasure, reservedOutline, chooseCollapsedVertical, validOpenBox } from '../src/client/desktop/measure.js'

test('紧凑拖动不加收起面板的预留框，气泡预留区仍保留', () => {
  const content = { x: 20, y: 80, r: 90, b: 140 }
  const bubble = { x: 10, y: 10, r: 110, b: 80 }
  const saved = { l: -20, t: -400, r: 100, b: 60 }
  const pig = { x: 30, y: 90 }
  assert.deepEqual(reservedOutline([content, bubble], saved, pig, true), [content, bubble])
  assert.deepEqual(reservedOutline([content, bubble], saved, pig, false),
    [content, bubble, { x: 10, y: -310, r: 130, b: 150 }])
})

test('松手按猪的屏幕位置选收起朝向：上方优先，否则下方，都不够则保持', () => {
  const boxes = {
    'bottom|right|60': { l: -200, t: -420, r: 60, b: 60 },
    'top|right|60': { l: -200, t: -100, r: 60, b: 460 },
  }
  const area = { x: 0, y: 100, width: 1200, height: 800 }
  assert.equal(chooseCollapsedVertical(boxes, 'right', 60, 54, 600, area, 'top'), 'bottom')
  assert.equal(chooseCollapsedVertical(boxes, 'right', 60, 54, 150, area, 'bottom'), 'top')
  assert.equal(chooseCollapsedVertical(boxes, 'right', 60, 54, 450, area, 'bottom'), 'bottom')
  assert.equal(chooseCollapsedVertical({}, 'right', 60, 54, 600, area, 'top'), 'top')
})

test('旧存档里 top 名下的面板在上数据无效，不能据此选朝向或撑大收起窗口', () => {
  const wrong = { l: -232, t: -594, r: 60, b: 66 }
  const boxes = { 'top|right|54': wrong, 'bottom|right|54': { ...wrong } }
  const pig = { x: 250, y: 610, width: 54, height: 54 }
  const area = { x: 0, y: 0, width: 1920, height: 1080 }
  assert.equal(validOpenBox(boxes, 'top', 'right', pig), undefined)
  assert.deepEqual(validOpenBox(boxes, 'bottom', 'right', pig), wrong)
  assert.equal(chooseCollapsedVertical(boxes, 'right', 54, 54, 50, area, 'bottom'), 'bottom')
  assert.equal(chooseCollapsedVertical(boxes, 'right', 54, 54, 50, area, 'top'), 'top')

  const oldStorage = globalThis.localStorage
  const oldDocument = globalThis.document
  const oldStyle = globalThis.getComputedStyle
  const memory = new Map([
    ['dsh-piggy:desktop-open-box', JSON.stringify(boxes)],
    ['dsh-piggy:desktop-sides', JSON.stringify({ vertical: 'top', horizontal: 'right' })],
  ])
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
  globalThis.document = { body: {} }
  globalThis.getComputedStyle = () => ({ display: 'block', visibility: 'visible', opacity: '1' })
  const pigNode = { offsetLeft: 250, offsetTop: 610, offsetWidth: 54, offsetHeight: 54, offsetParent: document.body,
    closest: () => null }
  const host = { offsetLeft: 0, offsetTop: 0, offsetWidth: 320, offsetHeight: 680, offsetParent: document.body,
    closest: () => null, getAttribute: key => key === 'data-open' ? 'false' : '',
    querySelectorAll: () => [pigNode], querySelector: key => key === '.dp-pig' ? pigNode : null }
  try {
    const dirty = createMeasure({ platform: 'linux', geometry: () => null }).boxes(host)
    memory.set('dsh-piggy:desktop-open-box', '{}')
    const clean = createMeasure({ platform: 'linux', geometry: () => null }).boxes(host)
    assert.deepEqual(dirty?.content, clean?.content)
  } finally {
    globalThis.localStorage = oldStorage
    globalThis.document = oldDocument
    globalThis.getComputedStyle = oldStyle
  }
})

test('打开面板第一轮按实际卡片位置存范围，不沿用上一次朝向', () => {
  const oldStorage = globalThis.localStorage
  const oldDocument = globalThis.document
  const oldStyle = globalThis.getComputedStyle
  const memory = new Map([['dsh-piggy:desktop-sides', JSON.stringify({ vertical: 'top', horizontal: 'right' })]])
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
  globalThis.document = { body: {} }
  globalThis.getComputedStyle = () => ({ display: 'block', visibility: 'visible', opacity: '1' })
  const pig = { offsetLeft: 250, offsetTop: 610, offsetWidth: 54, offsetHeight: 54, offsetParent: document.body,
    hidden: false, closest: () => null }
  const card = { offsetLeft: 0, offsetTop: 0, offsetWidth: 300, offsetHeight: 570, offsetParent: document.body,
    hidden: false, style: { maxHeight: '570px' }, closest: key => key === '.dp-card' ? card : null }
  const host = { offsetLeft: 0, offsetTop: 0, offsetWidth: 320, offsetHeight: 680, offsetParent: document.body,
    closest: () => null, getAttribute: key => key === 'data-open' ? 'true' : '',
    querySelectorAll: () => [card, pig], querySelector: key => key === '.dp-pig' ? pig : key === '.dp-card' ? card : null }
  try {
    createMeasure({ platform: 'linux', geometry: () => null }).boxes(host)
    const stored = JSON.parse(memory.get('dsh-piggy:desktop-open-box'))
    assert.ok(stored['bottom|right|54'])
    assert.equal(stored['top|right|54'], undefined)
  } finally {
    globalThis.localStorage = oldStorage
    globalThis.document = oldDocument
    globalThis.getComputedStyle = oldStyle
  }
})
