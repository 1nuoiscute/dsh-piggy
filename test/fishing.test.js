import test from 'node:test'
import assert from 'node:assert/strict'

import {
  STATE_VERSION, applyDevPatch, castFishing, feedFish, finishActivity, grantFish, hatchEgg,
  hookFishing, keepFish, migrate, resolveFishing, sellFish, startAutoFishing,
} from '../packages/pet-core/src/core.js'
import { FISH } from '../packages/pet-core/src/data.js'

const NOW = new Date(2026, 9, 2, 19, 0).getTime()
const fresh = () => hatchEgg(NOW)

test('fish table has the promised 15 fish and rarity split', () => {
  assert.equal(FISH.length, 15)
  assert.deepEqual(Object.fromEntries(['common', 'uncommon', 'rare', 'legend'].map(rarity => [rarity, FISH.filter(f => f.rarity === rarity).length])), {
    common: 8, uncommon: 4, rare: 2, legend: 1,
  })
  for (const fish of FISH) {
    assert.match(fish.key, /^fish_/)
    assert.ok(fish.price >= 8 && fish.price <= 300)
    assert.ok(fish.difficulty >= 1 && fish.difficulty <= 100)
    assert.ok(fish.times.length > 0)
  }
})

test('cast spends one satiety and server pins one pending fish for 60 seconds', () => {
  const state = fresh()
  const before = state.satiety
  const result = castFishing(state, 0.8, NOW, () => 0.25)
  assert.equal(result.ok, true)
  assert.equal(state.satiety, before - 1)
  assert.equal(state.fishing.pending.key, result.fish.key)
  assert.equal(state.fishing.pending.expiresAt, NOW + 60_000)
  assert.ok(state.fishing.pending.bitesAt >= NOW + 2_000)
  assert.ok(state.fishing.pending.bitesAt <= NOW + 8_000)
  assert.equal(castFishing(state, 0.2, NOW + 100, () => 0.9).reason, 'pending')
  state.activity = { kind: 'work', key: 'x', startedAt: NOW, endsAt: NOW + 60_000 }
  state.fishing.pending = null
  assert.equal(castFishing(state, 0.2, NOW + 100, () => 0.9).reason, 'away')
})

test('hook window, minigame verdict and bag transfer cannot duplicate a fish', () => {
  const state = fresh()
  castFishing(state, 0.5, NOW, () => 0)
  const bite = state.fishing.pending.bitesAt
  assert.equal(hookFishing(state, bite - 1).reason, 'early')
  assert.equal(hookFishing(state, bite).ok, true)
  assert.equal(resolveFishing(state, true, bite + 500).ok, true)
  const id = state.fishing.pending.id
  assert.equal(keepFish(state, bite + 600).ok, true)
  assert.equal(state.fishing.bag.length, 1)
  assert.equal(state.fishing.bag[0].id, id)
  assert.equal(keepFish(state, bite + 700).reason, 'none')
  assert.equal(state.dex.fish[state.fishing.bag[0].key].maxSizeCm, state.fishing.bag[0].sizeCm)
})

test('missing a bite or losing the minigame clears pending', () => {
  const late = fresh()
  castFishing(late, 0, NOW, () => 0)
  assert.equal(hookFishing(late, late.fishing.pending.bitesAt + 1001).reason, 'escaped')
  assert.equal(late.fishing.pending, null)

  const lost = fresh()
  castFishing(lost, 0, NOW, () => 0)
  hookFishing(lost, lost.fishing.pending.bitesAt)
  assert.equal(resolveFishing(lost, false, NOW + 3000).ok, true)
  assert.equal(lost.fishing.pending, null)
})

test('caught fish can be fed or sold and dex keeps the largest size', () => {
  const state = fresh()
  state.satiety = 10
  const first = grantFish(state, FISH[0].key, NOW, 12.3)
  const second = grantFish(state, FISH[0].key, NOW + 1, 19.8)
  assert.equal(state.dex.fish[FISH[0].key].maxSizeCm, 19.8)
  assert.equal(feedFish(state, first.id, NOW + 2).ok, true)
  assert.equal(state.satiety, Math.min(70, 10 + FISH[0].price / 2))
  const coins = state.coins
  assert.equal(sellFish(state, second.id, NOW + 3).ok, true)
  assert.equal(state.coins, coins + FISH[0].price)
})

test('auto fishing occupies the pig, settles every three minutes at 70%, and caps at two per day', () => {
  const state = fresh()
  const first = startAutoFishing(state, 30, NOW)
  assert.equal(first.ok, true)
  assert.equal(state.activity.kind, 'fishing')
  const coins = state.coins
  finishActivity(state, state.activity.endsAt, () => 0)
  assert.ok(state.coins > coins)
  assert.equal(state.stats.fishingAuto, 1)
  assert.equal(startAutoFishing(state, 60, NOW + 31 * 60_000).ok, true)
  finishActivity(state, state.activity.endsAt, () => 0)
  assert.equal(startAutoFishing(state, 30, NOW + 92 * 60_000).reason, 'daily-limit')
})

test('old saves gain sanitized fishing fields without a save-version bump', () => {
  const old = fresh()
  delete old.fishing
  const migrated = migrate(old, NOW)
  assert.equal(migrated.version, STATE_VERSION)
  assert.deepEqual(migrated.fishing.bag, [])
  assert.equal(migrated.fishing.pending, null)
})

test('developer fast-forward settles an automatic fishing activity', () => {
  const state = fresh()
  startAutoFishing(state, 30, NOW)
  applyDevPatch(state, { __advanceMs: 30 * 60_000 }, NOW)
  assert.equal(state.activity, null)
  assert.equal(state.stats.fishingAuto, 1)
})
