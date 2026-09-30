// @ts-check
/**
 * 存档安全。
 *
 * 这里守的是一个真实踩过的坑：`load()` 原先用一个裸 `catch { return null }`，
 * 存档一旦损坏，猪就**静默消失**，而下一次写入还会把坏文件覆盖掉。
 * 现在的要求是：日志说清楚、现场留一份、原文件不动。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { hatchEgg, STATE_VERSION } from '../core.js'
import { createStore } from '../store.js'

const makeDir = () => mkdtempSync(join(tmpdir(), 'dsh-pig-store-'))

/** Run `body` with console.warn captured, returning what it logged. */
function collectWarnings(body) {
  const warnings = []
  const original = console.warn
  console.warn = (...args) => { warnings.push(args.map(String).join(' ')) }
  try {
    body()
  } finally {
    console.warn = original
  }
  return warnings
}

test('a corrupt save is preserved instead of silently becoming no pig', () => {
  const dir = makeDir()
  try {
    const statePath = join(dir, 'state.json')
    const broken = '{ this is not json'
    writeFileSync(statePath, broken)

    let store
    const warnings = collectWarnings(() => { store = createStore(statePath) })

    assert.equal(store.state, null, 'the pig stays absent rather than half-loaded')
    const backups = readdirSync(dir).filter(name => name.startsWith('state.json.corrupt-'))
    assert.equal(backups.length, 1, 'the unusable save is copied aside')
    assert.equal(readFileSync(join(dir, backups[0]), 'utf8'), broken)
    assert.equal(readFileSync(statePath, 'utf8'), broken, 'and the original is left untouched')
    assert.ok(
      warnings.some(line => line.includes('unusable') && line.includes('invalid JSON')),
      `expected a loud warning, got: ${warnings.join(' | ')}`,
    )
    store.dispose()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a save that migrate() cannot use is preserved too', () => {
  const dir = makeDir()
  try {
    const statePath = join(dir, 'state.json')
    // Valid JSON, unusable shape: an array is not a pig.
    const unusable = '[1, 2, 3]'
    writeFileSync(statePath, unusable)

    let store
    const warnings = collectWarnings(() => { store = createStore(statePath) })

    assert.equal(store.state, null)
    const backups = readdirSync(dir).filter(name => name.startsWith('state.json.corrupt-'))
    assert.equal(backups.length, 1)
    assert.equal(readFileSync(statePath, 'utf8'), unusable)
    assert.ok(warnings.some(line => line.includes('migrate() rejected')), warnings.join(' | '))
    store.dispose()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a missing save is a normal first run, not a warning', () => {
  const dir = makeDir()
  try {
    const statePath = join(dir, 'state.json')
    let store
    const warnings = collectWarnings(() => { store = createStore(statePath) })
    assert.equal(store.state, null)
    assert.deepEqual(warnings, [], 'no save yet is expected, not an error')
    store.dispose()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a healthy save loads as-is, with nothing copied aside', () => {
  const dir = makeDir()
  try {
    const statePath = join(dir, 'state.json')
    const pig = hatchEgg(1_700_000_000_000)
    writeFileSync(statePath, JSON.stringify(pig))

    let store
    const warnings = collectWarnings(() => { store = createStore(statePath) })
    assert.notEqual(store.state, null)
    assert.equal(store.state.version, STATE_VERSION)
    assert.deepEqual(warnings, [])
    assert.deepEqual(readdirSync(dir).filter(name => name.includes('corrupt')), [])
    store.dispose()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a mutation is written through a temp file and leaves no debris', () => {
  const dir = makeDir()
  try {
    const statePath = join(dir, 'state.json')
    // Run the throttled save immediately instead of waiting on a timer.
    const flushNow = fn => { fn(); return { unref() {} } }
    const store = createStore(statePath, { setTimer: flushNow })
    assert.equal(store.hatch(), true)

    const saved = JSON.parse(readFileSync(statePath, 'utf8'))
    assert.equal(saved.hatched, true, 'the save is on disk, complete')
    assert.deepEqual(readdirSync(dir).filter(name => name.endsWith('.tmp')), [], 'the temp file is renamed, not left behind')
    store.dispose()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a mutation that throws halfway is rolled back and never written', () => {
  const dir = makeDir()
  try {
    const statePath = join(dir, 'state.json')
    const pig = hatchEgg(1_700_000_000_000)
    pig.satiety = 70
    writeFileSync(statePath, JSON.stringify(pig))
    const store = createStore(statePath, { setTimer: fn => { fn(); return { unref() {} } } })
    assert.equal(store.state.satiety, 70)

    // applyDevPatch reads the patch field by field: this one mutates satiety and
    // then throws while reading the next field, leaving the state half-applied.
    const patch = { satiety: 11 }
    Object.defineProperty(patch, 'traits', { get() { throw new Error('boom') }, enumerable: true })

    assert.equal(store.dev(patch), false, 'the caller is told it failed')
    assert.equal(store.state.satiety, 70, 'the half-applied change is rolled back')
    store.dispose()
    assert.equal(JSON.parse(readFileSync(statePath, 'utf8')).satiety, 70, 'and nothing was written')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
