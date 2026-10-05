// v0.30：扩展删除与在线下载（docs/design/extension-download.md）。
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { hatchEgg, removeExtension, installExtension, extensionOn } from '../core.js'
import { createStore } from '../store.js'
import { createExtRuntime, versionAtLeast } from '../store/ext-runtime.js'

const HOUR = 3_600_000
const sha = text => createHash('sha256').update(Buffer.from(text)).digest('hex')

/** 一个最小的下载扩展：存钱罐。存 10 块、拿回来、故意出错。 */
const PACKAGE = {
  'manifest.json': JSON.stringify({ key: 'piggybank', label: '存钱罐', emoji: '🏺', version: '1.0.0', app: { emoji: '🏺', label: '存钱罐' } }),
  'server.js': `export default {
    init() { return { saved: 0 } },
    actions: {
      save(data, payload, api) { if (!api.spend(10)) return { ok: false, reason: 'poor' }; data.saved += 10; api.say('存好了'); return { ok: true } },
      take(data, payload, api) { api.earn(data.saved); data.saved = 0; return { ok: true } },
      boom(data) { data.saved = 999; throw new Error('kaboom') },
    },
    view(data) { return { saved: data.saved } },
  }`,
  'client.js': 'window.dshPiggyExtensions && window.dshPiggyExtensions.register("piggybank", { render: function () {} })',
}

function setup({ minGame, corrupt, pkg = PACKAGE } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-piggy-ext-'))
  const seed = hatchEgg(Date.now() - 2 * HOUR)
  seed.coins = 100
  writeFileSync(join(dir, 'state.json'), JSON.stringify(seed))
  const store = createStore(join(dir, 'state.json'))
  const filesOf = () => Object.fromEntries(Object.entries(pkg).map(([name, text]) => [name, { url: 'https://example.test/' + name, sha256: sha(corrupt === name ? text + ' ' : text) }]))
  const files = filesOf()
  const registry = { version: 1, extensions: [
    { key: 'pomodoro', label: '番茄钟', emoji: '🍅', builtin: true },
    { key: 'fishing', label: '钓鱼', emoji: '🎣', builtin: true },
    { key: 'piggybank', label: '存钱罐', emoji: '🏺', version: '1.0.0', ...(minGame ? { minGame } : {}), files },
  ] }
  const fetch = async url => {
    if (url === 'https://example.test/registry.json') return { ok: true, status: 200, json: async () => registry }
    const name = url.replace('https://example.test/', '')
    if (pkg[name] === undefined) return { ok: false, status: 404 }
    return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(pkg[name]).buffer }
  }
  const runtime = createExtRuntime(store, { gameVersion: '0.30.0', fetch, registryUrl: 'https://example.test/registry.json' })
  store.ext = runtime
  /** 在假目录里「发布」新版本：pkg 已经改好，这里重算校验值、改版本号。 */
  const publish = version => { const entry = registry.extensions.find(e => e.key === 'piggybank'); entry.version = version; entry.files = filesOf() }
  return { dir, store, runtime, publish, done: () => { store.dispose(); rmSync(dir, { recursive: true, force: true }) } }
}

test('versions compare by number, ignoring a preview suffix', () => {
  assert.equal(versionAtLeast('0.30.0', '0.30.0'), true)
  assert.equal(versionAtLeast('0.30.0-rc.1', '0.29.9'), true)
  assert.equal(versionAtLeast('0.30.0', '0.31.0'), false)
  assert.equal(versionAtLeast('1.0.0', '0.99.9'), true)
})

test('removing fishing clears its data; reinstalling starts from zero', () => {
  const now = Date.now()
  const pig = hatchEgg(now - HOUR)
  pig.fishing = { pending: null, bag: [{ id: 'f1', key: 'fish_carp', sizeCm: 30, price: 12, caughtAt: now }], seq: 1, autoDay: '', autoTrips: 1 }
  pig.inventory = { ...(pig.inventory ?? {}), bait_worm: 5, apple: 2 }
  pig.dex = { ...(pig.dex ?? {}), fish: { fish_carp: { firstAt: now, count: 1, maxSizeCm: 30 } } }
  assert.equal(removeExtension(pig, 'fishing', now).ok, true)
  assert.equal(extensionOn(pig, 'fishing'), false)
  assert.deepEqual(pig.fishing.bag, [])
  assert.equal(pig.inventory.bait_worm, undefined, 'bait goes with it')
  assert.equal(pig.inventory.apple, 2, 'other things stay')
  assert.deepEqual(pig.dex.fish, {})
  assert.equal(removeExtension(pig, 'fishing', now).reason, 'not-installed')
  assert.equal(installExtension(pig, 'fishing').ok, true)
  assert.equal(extensionOn(pig, 'fishing'), true)
  assert.deepEqual(pig.fishing.bag, [])
})

test('a downloaded extension installs after its files check out, runs its actions, and can be removed', async () => {
  const { dir, store, runtime, done } = setup()
  try {
    const online = await runtime.onlineView()
    assert.equal(online.entries.find(entry => entry.key === 'piggybank').installed, false)
    const installed = await runtime.install('piggybank')
    assert.equal(installed.ok, true, JSON.stringify(installed))
    assert.ok(existsSync(join(dir, 'extensions', 'piggybank', 'server.js')))
    assert.deepEqual(store.state.extData.piggybank, { saved: 0 })
    assert.equal(runtime.list(store.state)[0].app.label, '存钱罐')

    assert.equal(runtime.act('piggybank', 'save', {}).ok, true)
    assert.equal(store.state.coins, 90)
    assert.deepEqual(runtime.views(store.state).piggybank, { saved: 10 })
    assert.ok(store.state.pending.some(entry => entry.kind === 'line' && entry.text === '存好了'))

    // 扩展抛错：它自己的数据不变，猪照常。
    const boom = runtime.act('piggybank', 'boom', {})
    assert.equal(boom.ok, false)
    assert.equal(boom.reason, 'extension-error')
    assert.equal(store.state.extData.piggybank.saved, 10)

    assert.match(runtime.clientScript('piggybank'), /register\("piggybank"/)
    assert.equal(runtime.remove('piggybank').ok, true)
    assert.equal(store.state.extData.piggybank, undefined)
    assert.equal(existsSync(join(dir, 'extensions', 'piggybank')), false)
  } finally { done() }
})

test('a file that does not match its checksum, or a game that is too old, is refused', async () => {
  const bad = setup({ corrupt: 'server.js' })
  try {
    const result = await bad.runtime.install('piggybank')
    assert.equal(result.reason, 'download-failed')
    assert.match(result.message, /校验不对/)
    assert.equal(existsSync(join(bad.dir, 'extensions', 'piggybank')), false)
  } finally { bad.done() }
  const old = setup({ minGame: '0.31.0' })
  try {
    assert.equal((await old.runtime.onlineView()).entries.find(entry => entry.key === 'piggybank').blocked, 'game-too-old')
    assert.equal((await old.runtime.install('piggybank')).reason, 'game-too-old')
  } finally { old.done() }
})

test('an installed extension updates in place: new code, same data', async () => {
  const pkg = { ...PACKAGE }
  const { store, runtime, publish, done } = setup({ pkg })
  try {
    assert.equal((await runtime.install('piggybank')).ok, true)
    assert.equal(runtime.act('piggybank', 'save', {}).ok, true)
    assert.deepEqual(store.state.extData.piggybank, { saved: 10 })
    // 目录里发了 1.1.0：server.js 多了一个「翻倍」动作。
    pkg['server.js'] = pkg['server.js'].replace('boom(data)', 'double(data) { data.saved *= 2; return { ok: true } },\n      boom(data)')
    pkg['manifest.json'] = pkg['manifest.json'].replace('"1.0.0"', '"1.1.0"')
    publish('1.1.0')
    const entry = (await runtime.onlineView(true)).entries.find(e => e.key === 'piggybank')
    assert.equal(entry.update, true, JSON.stringify(entry))
    assert.equal(entry.local, '1.0.0')
    assert.equal((await runtime.install('piggybank')).ok, true)
    assert.deepEqual(store.state.extData.piggybank, { saved: 10 }, 'data kept')
    assert.equal(runtime.act('piggybank', 'double', {}).ok, true)
    assert.equal(store.state.extData.piggybank.saved, 20)
    assert.equal((await runtime.onlineView(true)).entries.find(e => e.key === 'piggybank').update, false)
  } finally { done() }
})
