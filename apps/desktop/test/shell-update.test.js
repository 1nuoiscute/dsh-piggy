import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'

import { createShellUpdates, shellUpdateMode } from '../lib/shell-update.js'

test('only installed Windows and writable AppImage builds offer in-app shell updates', () => {
  assert.equal(shellUpdateMode({ platform: 'win32', packaged: true }), 'automatic')
  assert.equal(shellUpdateMode({ platform: 'win32', packaged: true, portable: true }), 'portable')
  assert.equal(shellUpdateMode({ platform: 'linux', packaged: true, appImage: '/tmp/pig.AppImage' }), 'automatic')
  assert.equal(shellUpdateMode({ platform: 'linux', packaged: true }), 'manual')
  assert.equal(shellUpdateMode({ platform: 'darwin', packaged: true }), 'unsigned-mac')
  assert.equal(shellUpdateMode({ platform: 'win32', packaged: false }), 'development')
})

test('shell update checks the target shell version, downloads, and waits for restart', async () => {
  const updater = new EventEmitter()
  const calls = []
  updater.checkForUpdates = async () => { calls.push('check'); return { updateInfo: { version: '0.2.0' } } }
  updater.downloadUpdate = async () => { calls.push('download'); updater.emit('download-progress', { percent: 75 }) }
  updater.quitAndInstall = () => calls.push('restart')
  const progress = []
  const updates = createShellUpdates({ mode: 'automatic', currentVersion: '0.1.3', updater, onProgress: value => progress.push(value) })
  assert.deepEqual(await updates.download('0.2.0'), { ok: true, version: '0.2.0' })
  assert.deepEqual(calls, ['check', 'download'])
  assert.deepEqual(progress, [0.75])
  assert.equal(updater.autoDownload, false)
  assert.equal(updater.autoInstallOnAppQuit, false)
  assert.deepEqual(updates.status(), { mode: 'automatic', currentVersion: '0.1.3', readyVersion: '0.2.0' })
  assert.deepEqual(updates.install(), { ok: true })
  assert.deepEqual(calls, ['check', 'download', 'restart'])
})

test('a different published shell version never installs behind the requested release', async () => {
  const updater = new EventEmitter()
  updater.checkForUpdates = async () => ({ updateInfo: { version: '0.3.0' } })
  updater.downloadUpdate = async () => assert.fail('must not download the wrong release')
  const updates = createShellUpdates({ mode: 'automatic', currentVersion: '0.1.3', updater })
  assert.equal((await updates.download('0.2.0')).ok, false)
  assert.equal(updates.status().readyVersion, null)
})

test('portable and unsigned macOS remain download-only without loading an updater', async () => {
  for (const mode of ['portable', 'unsigned-mac', 'manual', 'development']) {
    const updates = createShellUpdates({ mode, currentVersion: '0.1.3' })
    assert.equal(updates.status().mode, mode)
    assert.equal((await updates.download('0.2.0')).ok, false)
    assert.equal(updates.install().ok, false)
  }
})
