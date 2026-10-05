import assert from 'node:assert/strict'
import { test } from 'node:test'

import { reservedOutline, chooseCollapsedVertical } from '../src/client/desktop/measure.js'

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
  assert.equal(chooseCollapsedVertical(boxes, 'right', 60, 600, area, 'top'), 'bottom')
  assert.equal(chooseCollapsedVertical(boxes, 'right', 60, 150, area, 'bottom'), 'top')
  assert.equal(chooseCollapsedVertical(boxes, 'right', 60, 450, area, 'bottom'), 'bottom')
  assert.equal(chooseCollapsedVertical({}, 'right', 60, 600, area, 'top'), 'top')
})
