import assert from 'node:assert/strict'
import { test } from 'node:test'
import { absoluteDragBounds } from '../lib/window-geometry.js'

const leftScreen = { x: 0, y: 0, width: 1920, height: 1080 }
const rightScreen = { x: 1920, y: 0, width: 1920, height: 1080 }
const startBounds = { x: 900, y: 400, width: 400, height: 440 }
const startCursor = { x: 1250, y: 650 }
const pig = { x: 300, y: 250, width: 80, height: 80 }

test('F9 drag uses the initial window and cursor, so clamping never accumulates a lost delta', () => {
  const blocked = absoluteDragBounds(startBounds, startCursor, { x: -200, y: 650 }, pig, leftScreen)
  assert.equal(blocked.x + pig.x, 0, 'pig reaches screen edge even when the panel hangs outside')
  const returned = absoluteDragBounds(startBounds, startCursor, { x: 400, y: 650 }, pig, leftScreen)
  assert.equal(returned.x, 50, 'returning to the screen follows the original pointer offset')
  assert.equal(returned.width, startBounds.width)
})

test('F9 clamps only the pig on all four sides, not the full open panel', () => {
  const topLeft = absoluteDragBounds(startBounds, startCursor, { x: -200, y: -200 }, pig, leftScreen)
  assert.deepEqual({ x: topLeft.x + pig.x, y: topLeft.y + pig.y }, { x: 0, y: 0 })
  assert.ok(topLeft.x < 0 && topLeft.y < 0, 'panel may extend past the screen during dragging')
  const bottomRight = absoluteDragBounds(startBounds, startCursor, { x: 3000, y: 2000 }, pig, leftScreen)
  assert.deepEqual({ x: bottomRight.x + pig.x + pig.width, y: bottomRight.y + pig.y + pig.height }, { x: 1920, y: 1080 })
})

test('F9 follows the work area under the pointer across displays', () => {
  const onRight = absoluteDragBounds(startBounds, startCursor, { x: 2400, y: 650 }, pig, rightScreen)
  assert.equal(onRight.x + pig.x, 2350)
  assert.ok(onRight.x + pig.x >= rightScreen.x)
})
