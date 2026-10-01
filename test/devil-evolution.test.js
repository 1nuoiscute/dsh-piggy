// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { act, adopt, crown, formStageView, formsView, hatchEgg, migrate, revive } from '../core.js'
import { xpForLevel } from '../data.js'
import { createStore } from '../store.js'
const NOW = 1_800_000_000_000
function ready(level = 40) {
  const state = hatchEgg(NOW)
  Object.assign(state, { xp: xpForLevel(level), traits: { intel: 0, strong: 20, charm: 20 }, happiness: 10 })
  state.stats.plays = 20
  return state
}
const devil = state => formsView(state).forms.find(form => form.key === 'devil')

test('devil uses level, strength, charm and successful plays as independent boundaries', () => {
  for (const [key, value] of [['level', 39], ['strong', 19], ['charm', 19], ['plays', 19]]) {
    const state = ready(key === 'level' ? value : 40)
    if (key === 'plays') state.stats.plays = value
    else if (key !== 'level') state.traits[key] = value
    assert.equal(devil(state).ready, false, key)
    assert.deepEqual(crown(state, NOW, 'devil').missing.map(row => row.key), [key])
    assert.equal(state.form, null)
  }
  const state = ready()
  assert.equal(devil(state).ready, true)
  assert.equal(state.form, null, 'meeting conditions never changes the form automatically')
  assert.deepEqual(devil(state).requirements.map(row => [row.key, row.have, row.need]), [['level', 40, 40], ['strong', 20, 20], ['charm', 20, 20], ['plays', 20, 20]])
  assert.equal(crown(state, NOW, 'devil').ok, true, 'no intelligence, work or happiness gate')
})

test('successful play reaches the threshold; rejected cooldown play does not count', () => {
  const state = ready()
  state.stats.plays = 18
  assert.equal(act(state, 'play', NOW).ok, true)
  assert.equal(state.stats.plays, 19)
  assert.equal(act(state, 'play', NOW).reason, 'cooldown')
  assert.equal(state.stats.plays, 19)
  assert.equal(devil(state).ready, false)
  assert.equal(act(state, 'play', NOW + 45_000).ok, true)
  assert.equal(state.stats.plays, 20)
  assert.equal(crown(state, NOW + 45_000, 'devil').ok, true)
})

test('devil stays selected when unhappy, is idempotent, and can switch to king', () => {
  const state = ready()
  assert.equal(crown(state, NOW, 'devil').ok, true)
  const announcements = state.pending.length
  state.happiness = 0
  assert.equal(crown(state, NOW, 'devil').ok, true)
  assert.equal(state.pending.length, announcements)
  const view = formStageView(state, NOW)
  assert.equal(view.art, 'pig-devil')
  assert.equal(view.label, '恶魔猪')
  assert.equal(view.actionArt, true)
  assert.deepEqual(view.hides, ['head', 'back'])
  state.traits.intel = 20
  state.stats.jobs = 10
  assert.equal(crown(state, NOW).ok, true, 'king remains the default')
  assert.equal(state.form, 'king')
  assert.equal(crown(state, NOW, 'devil').ok, true)
})

test('dead pigs cannot choose devil; revival keeps it and adoption clears generation progress', () => {
  const state = ready()
  crown(state, NOW, 'devil')
  state.dead = true
  state.health = 0
  assert.equal(crown(state, NOW, 'devil').reason, 'dead')
  revive(state, NOW)
  assert.equal(state.form, 'devil')
  state.dead = true
  const fresh = adopt(state, NOW)
  assert.equal(fresh.form, null)
  assert.equal(fresh.stats.plays, 0)
  assert.equal(formsView(fresh), null, 'adoption starts with an unhatched box')
})

test('devil survives a saved state and reopen without a schema upgrade', () => {
  const dir = mkdtempSync(join(tmpdir(), 'devil-save-'))
  const path = join(dir, 'state.json')
  let store
  try {
    writeFileSync(path, JSON.stringify(ready()))
    store = createStore(path, { now: () => NOW })
    assert.equal(store.crown('devil').ok, true)
    store.dispose()
    const saved = JSON.parse(readFileSync(path, 'utf8'))
    assert.equal(saved.form, 'devil')
    assert.equal(migrate(saved, NOW).form, 'devil')
    store = createStore(path, { now: () => NOW })
    assert.equal(store.state.form, 'devil')
    assert.equal(store.state.stats.plays, 20)
  } finally {
    store?.dispose()
    rmSync(dir, { recursive: true, force: true })
  }
})
