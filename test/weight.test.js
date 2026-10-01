// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, adopt, decay, formStageView, hatchEgg, layEgg, migrate, startWork } from '../core.js'
import { JOBS, xpForLevel } from '../data.js'
import { idealWeightG, ensureBodyWeight, bodyWeightView, reducePlayWeight, reduceWorkWeight, settleWeight, updateBodyWeight } from '../packages/pet-core/src/core/weight.js'
const NOW = 1_800_000_000_000
const DAY = 86_400_000
function pig(level = 40, ratio = 1.6) {
  const state = hatchEgg(NOW)
  state.xp = xpForLevel(level)
  state.weightG = idealWeightG(state) * ratio
  state.lastSeenAt = NOW
  updateBodyWeight(state)
  return state
}
test('weight references follow the agreed curve and cap at Lv60', () => {
  assert.equal(idealWeightG(hatchEgg(NOW)), 1360)
  for (const [level, expected] of [[10, 3756], [20, 10943], [40, 39690], [60, 87603]]) {
    assert.ok(Math.abs(idealWeightG(pig(level)) - expected) <= 2)
  }
  const state = pig(60)
  state.xp = Number.MAX_SAFE_INTEGER
  assert.equal(idealWeightG(state), idealWeightG(pig(60)))
})
test('two body states have exact entry and exit boundaries and preserve hysteresis', () => {
  const state = pig(40, 1)
  const ideal = idealWeightG(state)
  state.weightG = ideal * 1.6 - .001
  updateBodyWeight(state)
  assert.equal(bodyWeightView(state, NOW).isFat, false)
  state.weightG = ideal * 1.6
  updateBodyWeight(state)
  assert.equal(bodyWeightView(state, NOW).isFat, true)
  state.weightG = ideal * 1.35 + .001
  updateBodyWeight(state)
  assert.equal(bodyWeightView(state, NOW).isFat, true)
  state.weightG = ideal * 1.35
  updateBodyWeight(state)
  assert.equal(bodyWeightView(state, NOW).isFat, false)
})
test('successful plays reduce excess by 3%, ten per game day; refusals do not count', () => {
  const state = pig()
  const ideal = idealWeightG(state)
  assert.equal(act(state, 'play', NOW).ok, true)
  assert.ok(Math.abs(state.weightG - (ideal + ideal * .6 * .97)) < .001)
  assert.equal(state.bodyWeight.plays, 1)
  assert.equal(act(state, 'play', NOW).reason, 'cooldown')
  assert.equal(state.bodyWeight.plays, 1)
  for (let count = 1; count < 10; count++) reducePlayWeight(state, NOW)
  const afterTen = state.weightG
  reducePlayWeight(state, NOW)
  assert.equal(state.weightG, afterTen)
  assert.equal(bodyWeightView(state, NOW).playsLeft, 0)
  reducePlayWeight(state, NOW + DAY)
  assert.equal(state.bodyWeight.plays, 1)
  assert.ok(state.weightG < afterTen)
})
test('daily exercise allowance resets at the existing 06:00 game boundary', () => {
  const morning = new Date(2026, 9, 1, 5, 59).getTime()
  const state = pig()
  for (let count = 0; count < 10; count++) reducePlayWeight(state, morning)
  reducePlayWeight(state, morning + 60_000)
  assert.equal(state.bodyWeight.plays, 1)
})
test('work uses completed duration and fractional hours; repeated settlement gives no extra loss', () => {
  const state = pig(60)
  const ideal = idealWeightG(state)
  reduceWorkWeight(state, 30)
  assert.ok(Math.abs(state.weightG - (ideal + ideal * .6 * .97 ** .5)) < .001)
  const working = pig(60)
  working.coins = 1000
  assert.equal(startWork(working, JOBS[0].key, NOW).ok, true)
  const finish = working.activity.endsAt
  decay(working, finish, { roll: () => 1 })
  assert.equal(working.stats.jobs, 1)
  const after = working.weightG
  decay(working, finish, { roll: () => 1 })
  assert.equal(working.weightG, after)
})
test('offline metabolism compounds by pig time, never adds weight or reduces a lean pig', () => {
  const state = pig(60)
  const ideal = idealWeightG(state)
  settleWeight(state, DAY)
  assert.ok(Math.abs(state.weightG - (ideal + ideal * .6 * .98)) < .001)
  const split = pig(60)
  for (let count = 0; count < 24; count++) settleWeight(split, DAY / 24)
  assert.ok(Math.abs(split.weightG - state.weightG) < .001)
  const lean = pig(60, .8)
  const before = lean.weightG
  settleWeight(lean, DAY * 30)
  reduceWorkWeight(lean, 240)
  reducePlayWeight(lean, NOW)
  assert.equal(lean.weightG, before)
  const accelerated = pig(60)
  accelerated.timeScale = 12
  decay(accelerated, NOW + DAY / 12, { roll: () => 1 })
  assert.ok(Math.abs(accelerated.weightG - state.weightG) < .01)
})
test('only living hatched default pigs get the fat sprite and 1.5x actual display size', () => {
  const state = pig()
  assert.equal(formStageView(state, NOW).art, 'pig-fat')
  assert.equal(formStageView(state, NOW).size, 102)
  assert.equal(formStageView(state, NOW).actionArt, true)
  for (const [form, art] of [['king', 'pig-king'], ['devil', 'pig-devil']]) {
    state.form = form
    assert.equal(formStageView(state, NOW).art, art)
    assert.equal(formStageView(state, NOW).size, 68)
  }
  state.form = null
  state.dead = true
  assert.equal(formStageView(state, NOW).key, 'grave')
  const deadWeight = state.weightG
  settleWeight(state, DAY)
  assert.equal(state.weightG, deadWeight)
  const box = layEgg(NOW)
  box.weightG = 500_000
  assert.equal(formStageView(box, NOW).key, 'box')
  settleWeight(box, DAY)
  assert.equal(box.weightG, 500_000)
})
test('migration preserves intermediate fat state, sanitizes bad fields, and adoption resets it', () => {
  const old = pig()
  old.version = 12
  old.weightG = idealWeightG(old) * 1.45
  old.bodyWeight = { isFat: true, playDay: '2026-10-01', plays: 8 }
  const loaded = migrate(JSON.parse(JSON.stringify(old)), NOW)
  assert.equal(loaded.bodyWeight.isFat, true)
  assert.equal(loaded.bodyWeight.plays, 8)
  assert.equal(loaded.weightG, old.weightG)
  const raw = pig()
  raw.bodyWeight = { isFat: 'yes', playDay: [], plays: Infinity }
  ensureBodyWeight(raw)
  assert.equal(raw.bodyWeight.plays, 0)
  assert.equal(raw.bodyWeight.isFat, true)
  const fresh = adopt(loaded, NOW)
  assert.deepEqual(fresh.bodyWeight, { isFat: false, playDay: '', plays: 0 })
})
test('real save round trip retains hysteresis and the remaining daily allowance', async () => {
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { createStore } = await import('../store.js')
  const dir = mkdtempSync(join(tmpdir(), 'fat-pig-save-'))
  const file = join(dir, 'state.json')
  let store
  try {
    const state = pig(60)
    for (let count = 0; count < 9; count++) reducePlayWeight(state, NOW)
    assert.equal(state.bodyWeight.isFat, true, 'the 1.35/1.6 intermediate band stays fat')
    writeFileSync(file, JSON.stringify(state))
    store = createStore(file, { now: () => NOW })
    assert.equal(store.act('play').ok, true)
    store.dispose()
    const saved = JSON.parse(readFileSync(file, 'utf8'))
    assert.equal(saved.version, 13)
    assert.equal(saved.bodyWeight.plays, 10)
    store = createStore(file, { now: () => NOW })
    assert.equal(bodyWeightView(store.state, NOW).playsLeft, 0)
    assert.equal(formStageView(store.state, NOW).art, 'pig-fat')
    const before = store.state.weightG
    assert.equal(store.act('play').reason, 'cooldown')
    assert.equal(store.state.weightG, before)
  } finally { store?.dispose(); rmSync(dir, { recursive: true, force: true }) }
})

test('feeding and real work enter fat state while dead/away refusals preserve exercise slots', async () => {
  const { feed } = await import('../core.js')
  const state = pig(40, 1)
  state.weightG = idealWeightG(state) * 1.6 - 80
  state.inventory.apple = 1
  assert.equal(act(state, 'feed', NOW, 'apple').ok, true)
  assert.equal(formStageView(state, NOW).art, 'pig-fat')
  const passive = pig(40, 1)
  passive.weightG = idealWeightG(passive) * 1.6 - 1
  feed(passive, 'tool', NOW)
  assert.equal(formStageView(passive, NOW).art, 'pig-fat')
  passive.dead = true
  assert.equal(act(passive, 'play', NOW).reason, 'dead')
  assert.equal(passive.bodyWeight.plays, 0)
  passive.dead = false
  passive.activity = { kind: 'work', key: JOBS[0].key, startedAt: NOW, endsAt: NOW + 3600_000 }
  assert.equal(act(passive, 'play', NOW).reason, 'away')
  assert.equal(passive.bodyWeight.plays, 0)
})

test('returning to ordinary restores the original stage and weight views do not mutate their state', async () => {
  const { snapshot } = await import('../index.js')
  const state = pig(40)
  state.weightG = idealWeightG(state) * 1.35
  updateBodyWeight(state)
  const before = JSON.stringify(state)
  bodyWeightView(state, NOW)
  assert.equal(JSON.stringify(state), before)
  const weightBefore = state.weightG
  const recordBefore = JSON.stringify(state.bodyWeight)
  const view = snapshot({ freshen: () => state }, { drain: false })
  assert.equal(view.pig.stage.size, 68)
  assert.notEqual(view.pig.stage.art, 'pig-fat')
  assert.equal(view.pig.bodyWeight.isFat, false)
  assert.equal(state.weightG, weightBefore)
  assert.equal(JSON.stringify(state.bodyWeight), recordBefore)
})
