import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { dragHeartbeatExpired } from '../lib/drag-watchdog.js'

test('拖动心跳超过一秒就过期，恰好一秒仍有效', () => {
  assert.equal(dragHeartbeatExpired(100, 1100), false)
  assert.equal(dragHeartbeatExpired(100, 1101), true)
})

test('主进程把失焦和渲染进程退出都接到 stopDrag', () => {
  const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8')
  assert.match(main, /win\.on\('blur',\s*stopDrag\)/)
  assert.match(main, /win\.webContents\.on\('render-process-gone',\s*\([^)]*\)\s*=>\s*\{\s*stopDrag\(\)/)
})
