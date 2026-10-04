import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findByAttr, hostOf, mount, openPanel } from './helpers/bundle.js'
import { pigSize, setPigSize } from '../src/client/pig-size.js'

test('F12 pig size is a device preference with a 56px default and four allowed values', () => {
  const storage = new Map()
  globalThis.window = { localStorage: { getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value) } }
  assert.equal(pigSize(), 56)
  for (const size of [48, 56, 72, 96]) {
    setPigSize(size)
    assert.equal(pigSize(), size)
  }
  setPigSize(999)
  assert.equal(pigSize(), 56)
  assert.equal(storage.get('dsh-piggy:pig-size'), '56')
})

test('F12 settings exposes four sizes and saves selection locally', async () => {
  const { dom, store } = await mount({ store: { 'dsh-piggy:pig-size': '72' } })
  openPanel(dom, 'settings')
  const host = hostOf(dom)
  assert.equal(host.style.getPropertyValue('--pig-size'), '72px')
  for (const size of [48, 56, 72, 96]) assert.ok(findByAttr(host, 'data-pig-size', String(size)))
  assert.equal(findByAttr(host, 'data-pig-size', '72').disabled, true)
  findByAttr(host, 'data-pig-size', '96').fire('click')
  assert.equal(store.get('dsh-piggy:pig-size'), '96')
  assert.equal(host.style.getPropertyValue('--pig-size'), '96px')
  assert.equal(findByAttr(host, 'data-pig-size', '96').disabled, true)
})
