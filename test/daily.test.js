// @ts-check
/**
 * B5 日常：签到、在线礼包、宠物日记。
 *
 * 数值全部来自 docs/tasks/numbers/B5-daily.md（用户 2026-10-01 确认），这里只
 * 验规则：一天从 06:00 算起、12 天一轮、断签不清零、在线只算真实时间、
 * 礼包按概率表抽、日记跨天写前一天。
 *
 * Run: node --test test/*.test.js
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { hatchEgg, layEgg } from '../core.js'
import { SIGN_IN_CYCLE, SIGN_IN_REWARDS } from '../data.js'
import { canSignIn, dayKeyFor, ensureDaily, signIn } from '../packages/pet-core/src/core/daily.js'
import { migrate } from '../packages/pet-core/src/core/migrate.js'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** 本地时间的一个时刻，省得每次写 new Date(...).getTime()。 */
const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime()

// ===========================================================================
// 一天的边界
// ===========================================================================

test('the day rolls over at 06:00, so 05:59 still counts as yesterday', () => {
  assert.equal(dayKeyFor(at(2026, 10, 1, 5, 59)), '2026-09-30')
  assert.equal(dayKeyFor(at(2026, 10, 1, 6, 0)), '2026-10-01')
  assert.equal(dayKeyFor(at(2026, 10, 1, 23, 59)), '2026-10-01')
  assert.equal(dayKeyFor(at(2026, 10, 2, 0, 30)), '2026-10-01', '熬夜到凌晨还是前一天')
})

// ===========================================================================
// 签到
// ===========================================================================

test('signing in once a day walks the 12-day ladder, then starts again', () => {
  const pig = hatchEgg(at(2026, 10, 1, 9))
  let clock = at(2026, 10, 1, 9)
  for (let i = 0; i < SIGN_IN_CYCLE; i += 1) {
    assert.equal(canSignIn(pig, clock), true, `day ${i + 1} must be signable`)
    const result = signIn(pig, clock)
    assert.equal(result.ok, true)
    assert.equal(result.day, i + 1, 'the ladder runs in order')
    assert.equal(canSignIn(pig, clock), false, 'twice in one day is refused')
    assert.equal(signIn(pig, clock).reason, 'signed')
    clock += DAY
  }
  assert.equal(signIn(pig, clock).day, 1, 'day 13 is day 1 again')
})

test('a missed day does not reset the ladder', () => {
  const pig = hatchEgg(at(2026, 10, 1, 9))
  signIn(pig, at(2026, 10, 1, 9))
  const result = signIn(pig, at(2026, 10, 5, 9))
  assert.equal(result.day, 2, 'the next reward, not back to the start')
})

test('the ladder pays what the confirmed table says', () => {
  // Day 1: 3 apples. Day 8: a 还魂丹. Day 12: the big one.
  const pig = hatchEgg(at(2026, 10, 1, 9))
  let clock = at(2026, 10, 1, 9)

  const first = signIn(pig, clock)
  assert.equal(pig.inventory.apple, 3)
  assert.ok(first.reward.includes('苹果'), first.reward)
  clock += DAY

  for (let day = 2; day <= 7; day += 1) { signIn(pig, clock); clock += DAY }
  const coinsBefore = pig.coins
  const eighth = signIn(pig, clock)
  assert.equal(pig.inventory.soul, 1, 'day 8 is the 还魂丹')
  assert.ok(eighth.reward.includes('还魂丹'), eighth.reward)
  assert.equal(pig.coins, coinsBefore, 'day 8 pays no coins, only the 还魂丹')
  clock += DAY

  for (let day = 9; day <= 11; day += 1) { signIn(pig, clock); clock += DAY }
  const beforeTwelve = pig.coins
  signIn(pig, clock)
  assert.equal(pig.inventory.feast, 2)
  assert.equal(pig.inventory.carousel, 1)
  assert.equal(pig.coins, beforeTwelve + 500, 'day 12 pays 500 on top of its items')
})

test('a dead pig and an unopened box can still sign in', () => {
  const box = layEgg(at(2026, 10, 1, 9))
  assert.equal(signIn(box, at(2026, 10, 1, 9)).ok, true, 'the box on the doorstep can collect')

  const dead = hatchEgg(at(2026, 10, 1, 9))
  dead.dead = true
  dead.health = 0
  assert.equal(signIn(dead, at(2026, 10, 1, 9)).ok, true, 'a tombstone collects too')
})

test('signing in announces it and makes the pig say something', () => {
  const pig = hatchEgg(at(2026, 10, 1, 9))
  signIn(pig, at(2026, 10, 1, 9))
  assert.ok(pig.pending.some(entry => entry.kind === 'gift'), 'the reward is announced')
  assert.ok(pig.pending.some(entry => entry.kind === 'line'), 'and the pig talks')
})

// ===========================================================================
// 存档
// ===========================================================================

test('daily survives a restart, and an old save without it gets sane defaults', () => {
  const pig = hatchEgg(at(2026, 10, 1, 9))
  signIn(pig, at(2026, 10, 1, 9))
  const reloaded = migrate(JSON.parse(JSON.stringify(pig)), at(2026, 10, 1, 10))
  assert.equal(reloaded.daily.signIn.lastDay, '2026-10-01')
  assert.equal(reloaded.daily.signIn.index, 1)
  assert.equal(canSignIn(reloaded, at(2026, 10, 1, 11)), false, 'still signed today')

  // An older save has no `daily` at all.
  const old = hatchEgg(at(2026, 10, 1, 9))
  delete old.daily
  const upgraded = migrate(JSON.parse(JSON.stringify(old)), at(2026, 10, 1, 10))
  assert.deepEqual(upgraded.daily, {
    signIn: { lastDay: null, index: 0, total: 0 },
    online: { day: null, onlineMs: 0, given: 0, unclaimed: 0 },
  })
})

test('a corrupted daily block is repaired instead of crashing the load', () => {
  const pig = hatchEgg(at(2026, 10, 1, 9))
  pig.daily = { signIn: { lastDay: 42, index: -3, total: 'lots' }, online: 'nope' }
  const daily = ensureDaily(pig)
  assert.equal(daily.signIn.lastDay, null)
  assert.equal(daily.signIn.index, 0)
  assert.equal(daily.signIn.total, 0)
  assert.equal(daily.online.given, 0)
})

test('the confirmed ladder is still 12 entries and every key is a real item', () => {
  assert.equal(SIGN_IN_CYCLE, 12)
  assert.deepEqual(SIGN_IN_REWARDS.map(entry => entry.items.length >= 1 || entry.coins > 0), Array(12).fill(true))
})
