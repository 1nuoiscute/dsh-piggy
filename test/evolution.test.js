import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { adopt, callOffActivity, coronationView, crown, decay, finalStageView, hatchEgg, lifeStageFor, migrate, revive, startWork, STATE_VERSION } from '../core.js'
import { createStore } from '../store.js'
const NOW = 1_800_000_000_000
const DAY = 86_400_000
function adult(days = 90) {
  const state = hatchEgg(NOW)
  Object.assign(state, { ageMs: days * DAY, traits: { intel: 20, charm: 20, strong: 20 } })
  state.stats.jobs = 10
  return state
}

test('coronation starts at adulthood; eligibility never crowns automatically', () => {
  for (const days of [89, 90, 179, 180, 239]) {
    const state = adult(days)
    assert.equal(coronationView(state, NOW).ready, days >= 90)
    assert.equal(state.finalForm, null)
    assert.equal(finalStageView(state, NOW).art, lifeStageFor(state, NOW).art)
    assert.equal(crown(state, NOW).ok, days >= 90)
  }
})

test('all three traits and completed jobs are independent boundaries', () => {
  for (const key of ['intel', 'charm', 'strong', 'jobs']) {
    const state = adult()
    if (key === 'jobs') state.stats.jobs = 9
    else state.traits[key] = 19
    assert.equal(crown(state, NOW).ok, false, key)
    assert.equal(state.finalForm, null)
  }
})

test('an elder can fill a missing condition later; crowning is idempotent and free', () => {
  const state = adult(180)
  state.traits.strong = 19
  assert.equal(crown(state, NOW).ok, false)
  state.traits.strong = 20
  state.health = 1
  state.coins = 0
  const before = { xp: state.xp, ageMs: state.ageMs, stats: { ...state.stats } }
  assert.equal(crown(state, NOW).ok, true)
  const count = state.pending.length
  assert.equal(crown(state, NOW).ok, true)
  assert.equal(state.pending.length, count)
  assert.equal(state.coins, 0)
  assert.equal(state.xp, before.xp)
  assert.equal(state.ageMs, before.ageMs)
  assert.deepEqual(state.stats, before.stats)
  assert.equal(lifeStageFor(state, NOW).key, 'elder')
  assert.equal(finalStageView(state, NOW).art, 'pig-king')
})

test('work only counts when completed, including the tenth job at coronation', () => {
  const state = adult()
  state.stats.jobs = 9
  assert.equal(startWork(state, 'odd', NOW).ok, true)
  assert.equal(callOffActivity(state, NOW).ok, true)
  assert.equal(state.stats.jobs, 9)
  assert.equal(startWork(state, 'odd', NOW).ok, true)
  const ended = state.activity.endsAt
  assert.equal(crown(state, ended).ok, true)
  assert.equal(state.stats.jobs, 10)
})

test('old saves default to ordinary forms; unknown forms and job counts are sanitized', () => {
  const raw = adult(180)
  delete raw.finalForm
  raw.version = 7
  const state = migrate(raw, NOW)
  assert.equal(state.version, STATE_VERSION)
  assert.equal(state.finalForm, null)
  assert.equal(coronationView(state, NOW).ready, true)
  assert.equal(migrate({ ...raw, finalForm: 'other', stats: { jobs: '10' } }, NOW).stats.jobs, 0)
  assert.equal(migrate({ ...raw, finalForm: 'other' }, NOW).finalForm, null)
})

test('king still dies; death cannot be crowned; revival preserves form and adoption resets it', () => {
  const state = adult(239)
  crown(state, NOW)
  state.timeScale = DAY / 60_000
  decay(state, NOW + 60_000)
  assert.equal(state.dead, true)
  assert.equal(finalStageView(state, NOW + 60_000).key, 'grave')
  assert.equal(crown(state, NOW + 60_000).ok, false)
  revive(state, NOW + 60_000)
  assert.equal(state.finalForm, 'king')
  state.dead = true
  const fresh = adopt(state, NOW + 60_000)
  assert.equal(fresh.finalForm, null)
  assert.equal(fresh.stats.jobs, 0)
  assert.deepEqual(fresh.traits, { intel: 20, charm: 20, strong: 20 })
})

test('chosen form survives an actual save and reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'king-save-'))
  const path = join(dir, 'state.json')
  let store
  try {
    writeFileSync(path, JSON.stringify(adult()))
    store = createStore(path, { now: () => NOW })
    assert.equal(store.crown().ok, true)
    store.dispose()
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).finalForm, 'king')
    store = createStore(path, { now: () => NOW })
    assert.equal(store.state.finalForm, 'king')
    assert.equal(finalStageView(store.state, NOW).label, '猪猪王')
  } finally { store?.dispose(); rmSync(dir, { recursive: true, force: true }) }
})
