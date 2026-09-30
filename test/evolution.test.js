import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { adopt, callOffActivity, coronationView, crown, decay, finalStageView, hatchEgg, lifeStageFor, levelFor, migrate, revive, startWork, STATE_VERSION } from '../core.js'
import { xpForLevel } from '../data.js'
import { createStore } from '../store.js'
const NOW = 1_800_000_000_000
const DAY = 86_400_000
function adult(level = 40) {
  const state = hatchEgg(NOW)
  Object.assign(state, { xp: xpForLevel(level), traits: { intel: 20, charm: 20, strong: 20 } })
  state.stats.jobs = 10
  return state
}

test('coronation starts at level 40, independent of age; qualifying alone never crowns', () => {
  for (const level of [1, 9, 10, 39, 40, 60]) {
    const state = adult(level)
    state.ageMs = 365 * DAY
    assert.equal(coronationView(state, NOW).ready, level >= 40)
    assert.equal(state.finalForm, null)
    assert.equal(finalStageView(state, NOW).label, level >= 40 ? '成年猪' : level >= 10 ? '青年猪' : '幼年猪')
    assert.equal(crown(state, NOW).ok, level >= 40)
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

test('an adult can fill a missing condition later; crowning is idempotent and free', () => {
  const state = adult()
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
  assert.equal(lifeStageFor(state, NOW).key, 'middle')
  assert.equal(finalStageView(state, NOW).art, 'pig-king')
})

test('work only counts when completed, including the tenth job at coronation', () => {
  const state = adult()
  state.stats.jobs = 9
  assert.equal(startWork(state, 'bricks', NOW).ok, true)
  assert.equal(callOffActivity(state, NOW).ok, true)
  assert.equal(state.stats.jobs, 9)
  assert.equal(startWork(state, 'bricks', NOW).ok, true)
  const ended = state.activity.endsAt
  assert.equal(crown(state, ended).ok, true)
  assert.equal(state.stats.jobs, 10)
})

test('old saves default to ordinary forms; unknown forms and job counts are sanitized', () => {
  const raw = adult()
  delete raw.finalForm
  raw.version = 11
  const state = migrate(raw, NOW)
  assert.equal(state.version, STATE_VERSION)
  assert.equal(state.finalForm, null)
  assert.equal(coronationView(state, NOW).ready, true)
  assert.equal(migrate({ ...raw, finalForm: 'other', stats: { jobs: '10' } }, NOW).stats.jobs, 0)
  assert.equal(migrate({ ...raw, finalForm: 'other' }, NOW).finalForm, null)
})

test('king follows upstream growth; death uses grave, revival keeps form, adoption resets it', () => {
  const state = adult()
  state.ageMs = 365 * DAY
  assert.equal(crown(state, NOW).ok, true)
  decay(state, NOW + 60_000, { roll: () => 1 })
  assert.equal(state.dead, false, 'upstream removed death from old age')
  state.dead = true
  state.health = 0
  assert.equal(finalStageView(state, NOW + 60_000).key, 'grave')
  assert.equal(crown(state, NOW + 60_000).ok, false)
  revive(state, NOW + 60_000)
  assert.equal(state.finalForm, 'king')
  assert.equal(finalStageView(state, NOW + 60_000).label, '猪猪王')
  state.dead = true
  const fresh = adopt(state, NOW + 60_000)
  assert.equal(fresh.finalForm, null)
  assert.equal(fresh.stats.jobs, 0)
  assert.equal(levelFor(fresh.xp), 1)
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


test('v11 upgrades add an ordinary form without changing growth, traits or completed jobs', () => {
  const before = adult()
  before.version = 11
  delete before.finalForm
  const after = migrate(before, NOW)
  assert.equal(after.version, 12)
  assert.equal(after.finalForm, null)
  assert.equal(after.xp, before.xp)
  assert.equal(after.stats.jobs, 10)
  assert.deepEqual(after.traits, before.traits)
  assert.equal(coronationView(after, NOW).ready, true)
})

test('a crowned v8 MVP save survives sequential upstream upgrades', () => {
  const before = adult()
  before.version = 8
  before.finalForm = 'king'
  before.xp = 20 * 40 * 39
  const after = migrate(before, NOW)
  assert.equal(after.version, 12)
  assert.equal(after.finalForm, 'king')
  assert.equal(after.stats.jobs, 10)
  assert.equal(levelFor(after.xp), 40)
  assert.equal(finalStageView(after, NOW).label, '猪猪王')
})
