import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { DRAG_HEARTBEAT_TIMEOUT, dragHeartbeatExpired } from '../lib/drag-watchdog.js'

test('拖动心跳超过两秒才过期：页面忙一下不掐断拖动', () => {
  assert.equal(DRAG_HEARTBEAT_TIMEOUT, 2000)
  assert.equal(dragHeartbeatExpired(100, 2100), false)
  assert.equal(dragHeartbeatExpired(100, 2101), true)
})

test('渲染进程退出会停拖动；窗口失焦不停（Windows 上按住拖动时也可能失焦，停了猪就卡在原地）', () => {
  const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8')
  assert.doesNotMatch(main, /win\.on\('blur',\s*stopDrag\)/)
  assert.match(main, /win\.webContents\.on\('render-process-gone',\s*\([^)]*\)\s*=>\s*\{\s*stopDrag\(\)/)
})

test('拖动开始和结束都清掉面板打开时记下的原位，内容再变不会把猪拽回去', () => {
  const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8')
  const start = main.slice(main.indexOf("ipcMain.on('piggy:drag:start'"), main.indexOf("ipcMain.on('piggy:drag:heartbeat'"))
  const end = main.slice(main.indexOf("ipcMain.on('piggy:drag:end'"), main.indexOf("ipcMain.on('piggy:move'"))
  assert.match(start, /restingPigScreen = null/)
  assert.match(end, /restingPigScreen = null/)
})

test('心跳顺带挪窗口；拖动不写逐帧日志；旧游戏包的 moveBy 仍有主进程接口', () => {
  const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8')
  const beat = main.slice(main.indexOf("ipcMain.on('piggy:drag:heartbeat'"), main.indexOf("ipcMain.on('piggy:drag:end'"))
  assert.match(beat, /dragTick\(\)/)
  assert.match(main, /why !== 'drag'/)
  assert.doesNotMatch(main, /appendFileSync/)
  assert.match(main, /ipcMain\.on\('piggy:move'/)
})

test('窗口销毁后到达的页面消息不处理（Windows 上切换版本时弹过「Object has been destroyed」）', () => {
  const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8')
  assert.match(main, /function fromPage\(event\) \{\s*return !quitting && win !== null && !win\.isDestroyed\(\) && event\.sender === win\.webContents/)
  assert.doesNotMatch(main, /event\.sender !== win\.webContents/)
  // 只查 null 不查 isDestroyed 的地方都不该再有
  assert.doesNotMatch(main, /if \(win === null\) return/)
  assert.match(main, /function restartGame\(\) \{\s*quitting = true/)
  assert.match(main, /process\.on\('uncaughtException'/)
})
