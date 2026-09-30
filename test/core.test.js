/**
 * dsh-pig core tests — the whole game model is pure and timestamp-driven, so
 * every mechanic (growth, decay, work shifts, illness chains, shop, death) is
 * testable here without a timer or a wait.
 *
 * Run: node --test test/*.test.js
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ACTIONS,
  ACTION_ORDER,
  JOBS,
  MAX,
  REVIVE_ITEM,
  SCHOOL_STAGES,
  SHOP,
  LIFE_STAGES,
  STATE_VERSION,
  SUBJECTS,
  THRESHOLDS,
  TRAITS,
  TRIPS,
  act,
  actionCooldownSeconds,
  actionReady,
  bar,
  buy,
  callOffActivity,
  callOffWork,
  canWork,
  courseView,
  currentIllness,
  decay,
  feed,
  formatWeight,
  hatchEgg,
  hasSoul,
  healthPercent,
  inventoryView,
  layEgg,
  careView,
  migrate,
  mood,
  ageDays,
  adopt,
  daysToNextStage,
  lifeStageFor,
  rename,
  startStudy,
  studyView,
  startTrip,
  startWork,
  traitView,
  useItem,
  workSecondsLeft,
} from '../core.js'
import { LIFESPAN_DAYS, DEFAULT_TOY, ILLNESS_CHAINS, ILLNESS_STAGE_MINUTES, SICK_RISK_MINUTES, illnessAt, medicineForStage } from '../data.js'

const T0 = 1_700_000_000_000
const MIN = 60_000

/** Push the clock forward by `minutes`, resolving everything that happens. */
function advance(state, minutes) {
  return decay(state, (state.lastSeenAt ?? T0) + minutes * MIN)
}

/** Walk the illness all the way down the chain, one stage per call. */
function worsen(state, times) {
  for (let i = 0; i < times; i += 1) advance(state, ILLNESS_STAGE_MINUTES + 1)
}

/** Give the pig something without paying for it. */
function give(state, key, count = 1) {
  state.inventory = { ...(state.inventory ?? {}) }
  state.inventory[key] = (state.inventory[key] ?? 0) + count
}

// ===========================================================================
// Creation, growth, migration
// ===========================================================================

test('layEgg produces a complete, sane save', () => {
  const egg = layEgg(T0)
  assert.equal(egg.version, STATE_VERSION)
  assert.equal(egg.name, '猪猪')
  assert.equal(egg.hatched, false)
  assert.equal(egg.dead, false)
  assert.equal(egg.weightG, 1200)
  assert.equal(egg.cleanliness, 90)
  assert.equal(egg.health, MAX.health)
  assert.equal(egg.coins, 500, 'enough to buy medicine on day one')
  assert.deepEqual(egg.inventory, {})
  assert.deepEqual(egg.traits, { intel: 0, charm: 0, strong: 0 })
  assert.deepEqual(egg.courses, {})
  assert.deepEqual(egg.souvenirs, [])
  assert.equal(egg.illness, null)
  assert.equal(egg.activity, null)
  assert.deepEqual(egg.pending, [])
  assert.equal(egg.stats.jobs, 0)
  assert.equal(egg.stats.lessons, 0)
  assert.equal(egg.stats.trips, 0)
})

test('a fresh pig is a cardboard box, and opening it lets a piglet out', () => {
  const box = layEgg(T0)
  assert.equal(box.hatched, false)
  assert.equal(lifeStageFor(box, T0).key, 'box')

  const piglet = hatchEgg(T0)
  assert.equal(piglet.hatched, true)
  assert.equal(lifeStageFor(piglet, T0).key, 'piglet')
  assert.equal(ageDays(piglet, T0), 0, 'the clock starts when the box opens')
  assert.ok(piglet.memories.some(m => m.includes('纸盒')), 'it remembers the box')
})

test('the pig grows up on the clock, not on XP', () => {
  const DAY = 86_400_000
  const pig = hatchEgg(T0)
  // XP is irrelevant to the shape it takes.
  pig.xp = 999_999
  assert.equal(lifeStageFor(pig, T0).key, 'piglet')

  const at = days => lifeStageFor(pig, T0 + days * DAY).key
  assert.equal(at(0.9), 'piglet')
  assert.equal(at(1), 'young')
  assert.equal(at(3), 'middle')
  assert.equal(at(7), 'elder')
  assert.equal(at(13.9), 'elder')
  // Every stage has its own size, so the pig literally grows.
  const sizes = LIFE_STAGES.map(stage => stage.size)
  assert.equal(new Set(sizes).size, sizes.length, 'no two stages share a size')
})

test('daysToNextStage counts down, and stops at the end of the line', () => {
  const DAY = 86_400_000
  const pig = hatchEgg(T0)
  assert.equal(daysToNextStage(pig, T0), 1)
  assert.equal(daysToNextStage(pig, T0 + 0.5 * DAY), 0.5)
  assert.equal(daysToNextStage(pig, T0 + 8 * DAY), null, 'no stage past 老年猪')
})

test('old age takes the pig, and a grave can be left for a new pig', () => {
  const DAY = 86_400_000
  const pig = hatchEgg(T0)
  pig.satiety = 100
  pig.cleanliness = 100
  pig.happiness = 100
  decay(pig, T0 + LIFESPAN_DAYS * DAY + 1000)
  assert.equal(pig.dead, true, 'a pig outlives its span')
  assert.equal(lifeStageFor(pig, T0 + 15 * DAY).key, 'grave')
  assert.ok(typeof pig.diedAt === 'number')

  // Its story is kept when a new one arrives.
  const before = pig.memories.length
  adopt(pig, T0 + 16 * DAY)
  assert.equal(pig.dead, false)
  assert.equal(pig.hatched, false, 'a new pig starts as a box again')
  assert.equal(lifeStageFor(pig, T0 + 16 * DAY).key, 'box')
  assert.ok(pig.memories.length >= before - 1, 'the old memories are still there')
})

test('a soul settles on a grave nobody came back for', () => {
  const DAY = 86_400_000
  const pig = hatchEgg(T0)
  pig.dead = true
  pig.diedAt = T0
  assert.equal(hasSoul(pig, T0 + 0.5 * DAY), false)
  assert.equal(hasSoul(pig, T0 + 1.1 * DAY), true)
})

test('migrate tolerates junk', () => {
  assert.equal(migrate(null), null)
  assert.equal(migrate('nope'), null)
  assert.equal(migrate([1, 2]), null)
  const repaired = migrate({ xp: 'lots', satiety: Number.NaN, name: '  ', memories: 'x', stats: null, coins: -5 })
  assert.equal(repaired.xp, 0)
  assert.equal(repaired.name, '猪猪')
  assert.equal(repaired.coins, 0)
  assert.deepEqual(repaired.memories, [])
  assert.deepEqual(repaired.inventory, {})
})

test('migrate upgrades a v1 save all the way to the current version', () => {
  const upgraded = migrate({
    version: 1, name: '大花', bornAt: T0, xp: 200, weightG: 5000,
    satiety: 50, happiness: 50, lastSeenAt: T0,
    // no cleanliness, no health, no coins, no inventory, no traits
  })
  assert.equal(upgraded.version, STATE_VERSION)
  assert.equal(upgraded.name, '大花')
  assert.equal(upgraded.xp, 200)
  assert.equal(upgraded.cleanliness, 90)
  assert.equal(upgraded.health, MAX.health)
  assert.equal(upgraded.coins, 500)
  assert.deepEqual(upgraded.inventory, {})
  assert.deepEqual(upgraded.traits, { intel: 0, charm: 0, strong: 0 })
  assert.deepEqual(upgraded.souvenirs, [])
})

test('migrate lifts a v3 "work" record into the v4 activity shape', () => {
  const upgraded = migrate({
    ...layEgg(T0),
    version: 3,
    work: { job: 'site', startedAt: T0, endsAt: T0 + MIN },
  })
  assert.equal(upgraded.activity.kind, 'work')
  assert.equal(upgraded.activity.key, 'site')
  assert.equal(upgraded.activity.endsAt, T0 + MIN)
})

test('migrate drops unknown inventory keys and bad illness records', () => {
  const upgraded = migrate({
    ...layEgg(T0),
    inventory: { apple: 2, 'not-a-real-item': 9, med1: 'x' },
    illness: { chain: 99, stage: 1, since: T0 },
    activity: { kind: 'work', key: 'nonexistent', endsAt: T0 },
  })
  assert.deepEqual(upgraded.inventory, { apple: 2 })
  assert.equal(upgraded.illness, null)
  assert.equal(upgraded.activity, null)
})

// ===========================================================================
// Passive diet and care actions
// ===========================================================================

test('passive events accumulate xp, satiety and weight', () => {
  const pig = layEgg(T0)
  feed(pig, 'turn', T0)
  // A turn is worth 2 after the rebalance; tool calls used to drown everything.
  assert.equal(pig.xp, 2)
  assert.equal(pig.stats.turns, 1)
  assert.deepEqual(feed(pig, 'not-a-thing', T0), [])
})

test('care actions apply their effects and honour per-action cooldowns', () => {
  const pig = hatchEgg(T0)
  pig.cleanliness = 20
  // Washing spends soap; the pig has none until it buys some.
  assert.equal(act(pig, 'bathe', T0).reason, 'no-item')
  pig.inventory = { bubble: 2 }
  assert.equal(act(pig, 'bathe', T0, 'bubble').ok, true)
  assert.ok(pig.cleanliness > 60)
  assert.equal(pig.inventory.bubble, 1, 'one bubble bath was used up')
  const again = act(pig, 'bathe', T0 + 1000, 'bubble')
  assert.equal(again.ok, false)
  assert.equal(again.reason, 'cooldown')
  assert.equal(act(pig, 'bathe', T0 + ACTIONS.bathe.cooldownMs, 'bubble').ok, true)

  // Cooldowns are per action, and the free default toy needs no purchase.
  const played = act(pig, 'play', T0 + ACTIONS.bathe.cooldownMs)
  assert.equal(played.ok, true)
  assert.equal(played.spent, false, 'the scruffy default ball is not consumed')
  assert.deepEqual(act(pig, 'dance', T0), { ok: false, reason: 'unknown' })
})

// ===========================================================================
// Care costs an item — QQ Pet keeps food, sundries and medicine in separate
// inventory categories for exactly this reason.
// ===========================================================================

test('feeding, washing and playing each need something from their own shelf', () => {
  const pig = hatchEgg(T0)
  assert.equal(pig.inventory.apple, undefined)
  for (const [action, kind] of [['feed', 'food'], ['bathe', 'bath'], ['play', 'toy']]) {
    const refused = act(pig, action, T0)
    if (kind === 'toy') {
      // …except playing, where the free default toy is always in the bag.
      assert.equal(refused.ok, true, 'the default toy needs no purchase')
      assert.equal(refused.spent, false, 'and is never used up')
    } else {
      assert.equal(refused.ok, false, `${action} must need an item`)
      assert.equal(refused.reason, 'no-item')
      assert.equal(refused.kind, kind)
    }
  }
})

test('a care item is consumed and its own numbers are the ones applied', () => {
  const pig = hatchEgg(T0)
  pig.satiety = 10
  pig.inventory = { bone: 1, cake: 2 }
  const fed = act(pig, 'feed', T0, 'bone')
  assert.equal(fed.ok, true)
  assert.equal(fed.spent, true)
  assert.equal(pig.inventory.bone, undefined, 'the last bone is gone')
  assert.equal(pig.satiety, 55, '10 + the bone\'s 45, not the 22 of a plain feed')

  // Asking for something the pig does not own is refused, not silently swapped.
  assert.equal(act(pig, 'feed', T0 + 61_000, 'apple').reason, 'no-item')
  // With no pick at all it spends the cheapest thing it actually has.
  const again = act(pig, 'feed', T0 + 61_000)
  assert.equal(again.ok, true)
  assert.equal(again.item, 'cake')
  assert.equal(pig.inventory.cake, 1)
})

test('the toy shelf keeps the free default ball alongside bought toys', () => {
  const pig = hatchEgg(T0)
  pig.inventory = { yoyo: 3 }
  const shelf = careView(pig).play.map(i => i.key)
  assert.deepEqual(shelf, ['ball', 'yoyo'], 'default first, then what was bought')
  const played = act(pig, 'play', T0, 'yoyo')
  assert.equal(played.spent, true)
  assert.equal(pig.inventory.yoyo, 2)
})

// ===========================================================================
// The school ladder
// ===========================================================================

test('school starts at primary and the higher stages are gated behind it', () => {
  const pig = hatchEgg(T0)
  pig.coins = 50_000
  assert.equal(studyView(pig)[0].unlocked, true, '小学 is always open')
  assert.equal(studyView(pig)[1].unlocked, false, '大学 is not')
  assert.equal(studyView(pig)[2].unlocked, false, '研究生 is not')

  const refused = startStudy(pig, 'chinese', 'college', T0)
  assert.equal(refused.ok, false)
  assert.equal(refused.reason, 'locked')
  assert.equal(refused.need.need, 9)
  assert.equal(pig.coins, 50_000, 'a locked stage costs nothing')

  // Every subject once at primary opens college.
  pig.lessonsByStage = { primary: 8, college: 0, graduate: 0 }
  assert.equal(startStudy(pig, 'chinese', 'college', T0).reason, 'locked')
  pig.lessonsByStage.primary = 9
  assert.equal(studyView(pig)[1].unlocked, true)
  assert.equal(startStudy(pig, 'chinese', 'college', T0).ok, true)
})

test('finishing a lesson counts toward the stage, not just the subject', () => {
  const pig = hatchEgg(T0)
  pig.coins = 5000
  assert.deepEqual(pig.lessonsByStage, { primary: 0, college: 0, graduate: 0 })
  startStudy(pig, 'music', 'primary', T0)
  advance(pig, SCHOOL_STAGES[0].minutes + 1)
  assert.equal(pig.lessonsByStage.primary, 1)
  assert.equal(pig.courses.music, 1)
})

test('a save from before the ladder keeps its lessons as primary', () => {
  const upgraded = migrate({ ...layEgg(T0), version: 4, courses: { chinese: 3, art: 2 } })
  assert.equal(upgraded.lessonsByStage.primary, 5, 'existing lessons are not thrown away')
})

test('long-haul activities really do take hours', () => {
  for (const activity of [...JOBS, ...SCHOOL_STAGES, ...TRIPS]) {
    assert.ok(activity.minutes >= 15, `${activity.label} is at least a quarter hour`)
  }
  assert.ok(Math.max(...JOBS.map(j => j.minutes)) >= 240, 'the longest shift is hours')
  assert.ok(Math.max(...TRIPS.map(t => t.minutes)) >= 1440, 'the longest trip is a day')
})

test('petting has no cooldown', () => {
  const pig = hatchEgg(T0)
  assert.equal(ACTIONS.pet.cooldownMs, 0)
  for (let i = 0; i < 5; i += 1) assert.equal(act(pig, 'pet', T0).ok, true)
  assert.equal(pig.stats.pets, 5)
  assert.equal(actionCooldownSeconds(pig, 'pet', T0), 0)
})

test('the whole care loop is exposed in a stable order', () => {
  assert.deepEqual([...ACTION_ORDER], ['feed', 'bathe', 'play', 'pet'])
  for (const key of ACTION_ORDER) {
    assert.equal(ACTIONS[key].key, key)
    assert.equal(typeof ACTIONS[key].label, 'string')
    assert.equal(typeof ACTIONS[key].emoji, 'string')
  }
})

// ===========================================================================
// Decay
// ===========================================================================

test('attributes decay with wall-clock time', () => {
  const pig = layEgg(T0)
  pig.satiety = 100
  pig.happiness = 100
  pig.cleanliness = 100
  advance(pig, 60)
  assert.ok(pig.satiety < 100 && pig.satiety > 80, `satiety=${pig.satiety}`)
  assert.ok(pig.happiness < 100 && pig.happiness > 85, `happiness=${pig.happiness}`)
  assert.ok(pig.cleanliness < 100 && pig.cleanliness > 88, `cleanliness=${pig.cleanliness}`)
})

test('decay never goes below zero', () => {
  const pig = layEgg(T0)
  pig.satiety = 5
  pig.happiness = 5
  pig.cleanliness = 5
  advance(pig, 100 * 60)
  assert.equal(Math.round(pig.satiety), 0)
  assert.equal(Math.round(pig.happiness), 0)
  assert.equal(Math.round(pig.cleanliness), 0)
})

test('mood: dead beats sick beats working beats everything else', () => {
  const pig = hatchEgg(T0)
  pig.happiness = 90
  assert.equal(mood(pig, T0).key, 'happy')

  pig.satiety = 10
  assert.equal(mood(pig, T0).key, 'hungry')

  pig.illness = { chain: 0, stage: 1, since: T0 }
  assert.equal(mood(pig, T0).key, 'sick')
  assert.equal(mood(pig, T0).label, '得了感冒')

  pig.illness = null
  pig.activity = { kind: 'work', key: 'odd', label: '打零工', emoji: '🧹', startedAt: T0, endsAt: T0 + MIN }
  assert.equal(mood(pig, T0).key, 'working')

  pig.activity = { kind: 'study', key: 'chinese', stage: 'primary', label: '小学语文', emoji: '📖', startedAt: T0, endsAt: T0 + MIN }
  assert.equal(mood(pig, T0).key, 'studying')

  pig.activity = { kind: 'trip', key: 'suburb', label: '郊游', emoji: '🏞', startedAt: T0, endsAt: T0 + MIN }
  assert.equal(mood(pig, T0).key, 'traveling')

  pig.activity = null
  pig.dead = true
  assert.equal(mood(pig, T0).key, 'dead')
})

// ===========================================================================
// Work
// ===========================================================================

test('the job board is well formed', () => {
  assert.ok(JOBS.length >= 3)
  for (const job of JOBS) {
    assert.equal(typeof job.key, 'string')
    assert.ok(job.minutes > 0)
    assert.ok(job.coins > 0)
    assert.ok(job.satiety < 0, 'work costs satiety')
  }
})

test('a shift pays out when the clock passes its end', () => {
  const pig = hatchEgg(T0)
  const before = pig.coins
  const result = startWork(pig, 'odd', T0)
  assert.equal(result.ok, true)
  assert.equal(pig.activity.kind, 'work')
  assert.equal(pig.activity.key, 'odd')
  assert.equal(workSecondsLeft(pig, T0), JOBS[0].minutes * 60)

  advance(pig, JOBS[0].minutes + 1)
  assert.equal(pig.activity, null, 'the shift is over')
  assert.equal(pig.coins, before + JOBS[0].coins)
  assert.equal(pig.stats.jobs, 1)
  assert.equal(pig.stats.coinsEarned, JOBS[0].coins)
  assert.ok(pig.memories.some(m => m.includes('金币')))
  assert.ok(pig.pending.some(e => e.kind === 'work'), 'the payout is announced')
})

test('a shift drains satiety and cleanliness faster than idling', () => {
  const working = hatchEgg(T0)
  const idle = hatchEgg(T0)
  startWork(working, 'office', T0)
  advance(working, 5)
  advance(idle, 5)
  assert.ok(working.satiety < idle.satiety, 'working pig gets hungrier')
  assert.ok(working.cleanliness < idle.cleanliness, 'working pig gets dirtier')
})

test('work is refused while away, sick, hungry or dead', () => {
  const pig = hatchEgg(T0)
  startWork(pig, 'odd', T0)
  assert.equal(startWork(pig, 'odd', T0).reason, 'away')

  const sick = hatchEgg(T0)
  sick.illness = { chain: 0, stage: 1, since: T0 }
  assert.equal(canWork(sick), true, 'illness alone does not ground the pig')
  // Being ill no longer grounds the pig: that deadlocked the game, because a
  // sick pig with no coins could not buy the medicine it needed.
  assert.equal(startWork(sick, 'odd', T0).ok, true, 'a sick pig can still go to work')
  const weak = hatchEgg(T0)
  weak.health = 1
  assert.equal(startWork(weak, 'odd', T0).reason, 'weak', 'death\'s door is another matter')

  const hungry = hatchEgg(T0)
  hungry.satiety = 5
  assert.equal(startWork(hungry, 'odd', T0).reason, 'hungry')

  const dead = hatchEgg(T0)
  dead.dead = true
  dead.health = 0
  assert.equal(startWork(dead, 'odd', T0).reason, 'dead')

  assert.equal(startWork(hatchEgg(T0), 'moon', T0).reason, 'unknown')
})

test('care actions are blocked while the pig is away (except petting)', () => {
  const pig = hatchEgg(T0)
  startWork(pig, 'odd', T0)
  assert.equal(act(pig, 'feed', T0).reason, 'away')
  assert.equal(act(pig, 'bathe', T0).reason, 'away')
  assert.equal(act(pig, 'pet', T0).ok, true, 'you can still pat it')
})

test('calling the pig home early forfeits the pay', () => {
  const pig = hatchEgg(T0)
  const before = pig.coins
  startWork(pig, 'office', T0)
  assert.equal(callOffWork(pig, T0).ok, true)
  assert.equal(pig.activity, null)
  assert.equal(pig.coins, before, 'no pay for an unfinished shift')
  assert.equal(callOffWork(pig, T0).reason, 'idle')
})

// ===========================================================================
// Illness chains
// ===========================================================================

test('the illness chains match the QQ Pet reverse engineering', () => {
  assert.equal(ILLNESS_CHAINS.length, 3)
  assert.deepEqual(ILLNESS_CHAINS[0].stages.map(s => s.name), ['感冒', '发烧', '重感冒', '肺炎'])
  assert.deepEqual(ILLNESS_CHAINS[1].stages.map(s => s.name), ['咳嗽', '支气管炎', '哮喘', '肺结核'])
  assert.deepEqual(ILLNESS_CHAINS[2].stages.map(s => s.name), ['肚子胀', '胃炎', '胃溃疡', '胃癌'])
  assert.equal(illnessAt(0, 1).cure, '板蓝根')
  assert.equal(illnessAt(0, 4).cure, '金色消炎药水')
  assert.equal(illnessAt(0, 4).health, 1)
  assert.equal(illnessAt(0, 5), null)
  assert.equal(medicineForStage(1).tier, 1)
  assert.equal(medicineForStage(4).tier, 4)
})

test('neglect long enough makes the pig sick and costs a health point', () => {
  const pig = hatchEgg(T0)
  pig.satiety = 10
  assert.equal(pig.illness, null)
  advance(pig, SICK_RISK_MINUTES + 2)
  assert.notEqual(pig.illness, null, 'illness should have struck')
  assert.equal(pig.illness.stage, 1)
  assert.equal(pig.health, 4, 'stage 1 leaves 4 of 5 health')
  assert.ok(pig.pending.some(e => e.kind === 'sick'), 'it is announced')
  assert.ok(currentIllness(pig) !== null)
})

test('being well cared for keeps the pig healthy', () => {
  const pig = hatchEgg(T0)
  pig.satiety = 90
  pig.cleanliness = 90
  advance(pig, 60)
  assert.equal(pig.illness, null)
  assert.equal(pig.health, MAX.health)
})

test('an untreated illness gets worse on its own schedule', () => {
  const pig = hatchEgg(T0)
  pig.illness = { chain: 0, stage: 1, since: T0 }
  pig.health = 4
  pig.satiety = 80
  pig.cleanliness = 80

  advance(pig, ILLNESS_STAGE_MINUTES - 1)
  assert.equal(pig.illness.stage, 1, 'not yet')

  advance(pig, 2)
  assert.equal(pig.illness.stage, 2)
  assert.equal(pig.health, 3)
  assert.equal(currentIllness(pig).name, '发烧')

  worsen(pig, 2)
  assert.equal(pig.illness.stage, 4)
  assert.equal(pig.health, 1)
  assert.equal(currentIllness(pig).name, '肺炎')
})

test('the fourth stage progressing means death, and 还魂丹 brings it back', () => {
  const pig = hatchEgg(T0)
  pig.illness = { chain: 0, stage: 4, since: T0 }
  pig.health = 1
  pig.satiety = 80
  pig.cleanliness = 80
  pig.xp = 500

  worsen(pig, 1)
  assert.equal(pig.dead, true)
  assert.equal(pig.health, 0)
  assert.equal(pig.illness, null)
  assert.ok(pig.pending.some(e => e.kind === 'death'))

  // Nothing works on a dead pig except the revive item.
  assert.equal(act(pig, 'feed', T0).reason, 'dead')
  assert.equal(startWork(pig, 'odd', T0).reason, 'dead')
  give(pig, 'apple')
  assert.equal(useItem(pig, 'apple', T0).reason, 'dead')
  assert.equal(useItem(pig, REVIVE_ITEM.key, T0).reason, 'empty')

  give(pig, REVIVE_ITEM.key)
  const revived = useItem(pig, REVIVE_ITEM.key, T0)
  assert.equal(revived.ok, true)
  assert.equal(pig.dead, false)
  assert.equal(pig.health, MAX.health)
  assert.equal(pig.xp, 500, 'level and xp survive death')
  assert.equal(pig.stats.revives, 1)
})

test('the revive item is refused on a living pig', () => {
  const pig = hatchEgg(T0)
  give(pig, REVIVE_ITEM.key)
  const result = useItem(pig, REVIVE_ITEM.key, T0)
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'not-dead')
  assert.equal(pig.inventory[REVIVE_ITEM.key], 1, 'the item is not consumed')
})

test('only the matching medicine cures, and it costs the item', () => {
  const pig = hatchEgg(T0)
  pig.illness = { chain: 1, stage: 2, since: T0 }
  pig.health = 3

  give(pig, 'med1')
  assert.equal(useItem(pig, 'med1', T0).reason, 'wrong-medicine')
  assert.equal(pig.illness.stage, 2, 'still sick')
  assert.equal(pig.inventory.med1, 1, 'the wrong item is not consumed')

  give(pig, 'med2')
  const cured = useItem(pig, 'med2', T0)
  assert.equal(cured.ok, true)
  assert.equal(pig.illness, null)
  assert.equal(pig.health, MAX.health)
  assert.equal(pig.inventory.med2, 0, 'the medicine is consumed')
  assert.equal(pig.stats.cures, 1)
  assert.ok(pig.pending.some(e => e.kind === 'cured'))
})

test('medicine on a healthy pig is refused', () => {
  const pig = hatchEgg(T0)
  give(pig, 'med1')
  assert.equal(useItem(pig, 'med1', T0).reason, 'not-sick')
  assert.equal(pig.inventory.med1, 1)
})

test('using a care item applies its effects', () => {
  const pig = hatchEgg(T0)
  pig.satiety = 30
  give(pig, 'bone')
  const result = useItem(pig, 'bone', T0)
  assert.equal(result.ok, true)
  assert.ok(pig.satiety > 60, `satiety=${pig.satiety}`)
  assert.equal(pig.inventory.bone, 0)
  assert.equal(useItem(pig, 'bone', T0).reason, 'empty')
  assert.equal(useItem(pig, 'nope', T0).reason, 'unknown')
})

// ===========================================================================
// Study — the nine QQ Pet subjects
// ===========================================================================

test('the course table mirrors the QQ Pet subjects and stages', () => {
  assert.equal(SUBJECTS.length, 9)
  assert.deepEqual(SUBJECTS.map(s => s.label),
    ['语文', '数学', '政治', '美术', '音乐', '礼仪', '体育', '武术', '劳动'])
  assert.deepEqual(SCHOOL_STAGES.map(s => s.label), ['小学', '大学', '研究生'])
  // Every subject feeds exactly one of the three traits.
  for (const subject of SUBJECTS) assert.ok(['intel', 'charm', 'strong'].includes(subject.trait))
  // The three groups the original art implies.
  assert.deepEqual(SUBJECTS.filter(s => s.trait === 'intel').map(s => s.label), ['语文', '数学', '政治'])
  assert.deepEqual(SUBJECTS.filter(s => s.trait === 'charm').map(s => s.label), ['美术', '音乐', '礼仪'])
  assert.deepEqual(SUBJECTS.filter(s => s.trait === 'strong').map(s => s.label), ['体育', '武术', '劳动'])
  // Stages get dearer and slower.
  assert.ok(SCHOOL_STAGES[0].tuition < SCHOOL_STAGES[2].tuition)
  assert.ok(SCHOOL_STAGES[0].minutes < SCHOOL_STAGES[2].minutes)
})

test('studying costs the tuition up front and pays a trait on completion', () => {
  const pig = hatchEgg(T0)
  pig.coins = 200
  const stage = SCHOOL_STAGES[0]
  const result = startStudy(pig, 'chinese', 'primary', T0)
  assert.equal(result.ok, true)
  assert.equal(pig.coins, 200 - stage.tuition, 'tuition is taken at the start')
  assert.equal(pig.activity.kind, 'study')
  assert.equal(pig.activity.key, 'chinese')
  assert.equal(pig.activity.stage, 'primary')

  advance(pig, stage.minutes + 1)
  assert.equal(pig.activity, null)
  assert.equal(pig.traits.intel, stage.gain, '语文 feeds 智力')
  assert.equal(pig.courses.chinese, 1)
  assert.equal(pig.stats.lessons, 1)
  assert.ok(pig.pending.some(e => e.kind === 'study'))
  assert.ok(pig.memories.some(m => m.includes('语文')))
})

test('each subject feeds its own trait', () => {
  const cases = [['art', 'charm'], ['pe', 'strong'], ['politics', 'intel']]
  for (const [subject, trait] of cases) {
    const pig = hatchEgg(T0)
    pig.coins = 200
    startStudy(pig, subject, 'primary', T0)
    advance(pig, SCHOOL_STAGES[0].minutes + 1)
    assert.equal(pig.traits[trait], SCHOOL_STAGES[0].gain, `${subject} should feed ${trait}`)
    for (const other of ['intel', 'charm', 'strong']) {
      if (other !== trait) assert.equal(pig.traits[other], 0, `${subject} must not feed ${other}`)
    }
  }
})

test('a higher stage pays more of the same trait', () => {
  const pig = hatchEgg(T0)
  pig.coins = 5000
  pig.lessonsByStage = { primary: 9, college: 9, graduate: 0 }
  startStudy(pig, 'wushu', 'graduate', T0)
  advance(pig, SCHOOL_STAGES[2].minutes + 1)
  assert.equal(pig.traits.strong, SCHOOL_STAGES[2].gain)
  assert.equal(pig.courses.wushu, 1)
})

test('study is refused when broke, away, sick or dead', () => {
  const poor = hatchEgg(T0)
  poor.coins = 1
  assert.equal(startStudy(poor, 'chinese', 'primary', T0).reason, 'poor')
  assert.equal(poor.coins, 1, 'nothing was spent')
  assert.equal(poor.activity, null)

  const away = hatchEgg(T0)
  away.coins = 500
  startStudy(away, 'chinese', 'primary', T0)
  assert.equal(startStudy(away, 'art', 'primary', T0).reason, 'away')

  const sick = hatchEgg(T0)
  sick.coins = 500
  sick.illness = { chain: 0, stage: 1, since: T0 }
  assert.equal(startStudy(sick, 'chinese', 'primary', T0).ok, true, 'a sick pig can still go to school')

  const dead = hatchEgg(T0)
  dead.dead = true
  dead.health = 0
  assert.equal(startStudy(dead, 'chinese', 'primary', T0).reason, 'dead')

  assert.equal(startStudy(hatchEgg(T0), 'underwater-basket-weaving', 'primary', T0).reason, 'unknown')
  assert.equal(startStudy(hatchEgg(T0), 'chinese', 'kindergarten', T0).reason, 'unknown')
})

// ===========================================================================
// Travel — souvenirs for the collection
// ===========================================================================

test('the trip table is well formed and gets dearer with distance', () => {
  assert.ok(TRIPS.length >= 3)
  for (const trip of TRIPS) {
    assert.ok(trip.cost > 0)
    assert.ok(trip.minutes > 0)
    assert.ok(trip.souvenirs.length >= 2)
  }
  const costs = TRIPS.map(t => t.cost)
  assert.deepEqual(costs, [...costs].sort((a, b) => a - b), 'trips should be ordered by cost')
})

test('travelling costs coins up front and brings back a souvenir', () => {
  const pig = hatchEgg(T0)
  pig.coins = 200
  const trip = TRIPS[0]
  const happiness = pig.happiness
  const result = startTrip(pig, trip.key, T0)
  assert.equal(result.ok, true)
  assert.equal(pig.coins, 200 - trip.cost)
  assert.equal(pig.activity.kind, 'trip')

  advance(pig, trip.minutes + 1)
  assert.equal(pig.activity, null)
  assert.equal(pig.souvenirs.length, 1)
  assert.ok(trip.souvenirs.includes(pig.souvenirs[0]), 'the souvenir comes from this trip')
  assert.ok(pig.happiness > happiness - 5, 'a trip should not leave the pig sad')
  assert.equal(pig.stats.trips, 1)
  assert.ok(pig.pending.some(e => e.kind === 'trip'))
})

test('the souvenir rotation is deterministic, so every keepsake is reachable', () => {
  const pig = hatchEgg(T0)
  pig.coins = 5000
  const trip = TRIPS[0]
  const collected = []
  let clock = T0
  for (let i = 0; i < trip.souvenirs.length + 1; i += 1) {
    pig.satiety = 100
    startTrip(pig, trip.key, clock)
    clock += (trip.minutes + 1) * MIN
    decay(pig, clock)
    collected.push(pig.souvenirs[i])
  }
  assert.deepEqual(collected.slice(0, trip.souvenirs.length), [...trip.souvenirs])
  assert.equal(collected[trip.souvenirs.length], trip.souvenirs[0], 'it wraps around')
})

test('a trip is refused when broke, and nothing is spent', () => {
  const pig = hatchEgg(T0)
  pig.coins = 5
  const result = startTrip(pig, 'abroad', T0)
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'poor')
  assert.equal(result.price, TRIPS[3].cost)
  assert.equal(pig.coins, 5)
  assert.equal(pig.activity, null)
  assert.equal(startTrip(pig, 'mars', T0).reason, 'unknown')
})

test('care is blocked while travelling, and the pig can be recalled', () => {
  const pig = hatchEgg(T0)
  pig.coins = 200
  const trip = TRIPS[0]
  startTrip(pig, trip.key, T0)
  assert.equal(act(pig, 'feed', T0).reason, 'away')
  assert.equal(startWork(pig, 'odd', T0).reason, 'away')

  const recalled = callOffActivity(pig, T0)
  assert.equal(recalled.ok, true)
  assert.equal(recalled.refunded, trip.cost, 'an unfinished trip is refunded')
  assert.equal(pig.coins, 200, 'coins are back')
  assert.equal(pig.souvenirs.length, 0)
})

test('recalling a study session refunds the tuition; recalling work does not pay', () => {
  const student = hatchEgg(T0)
  student.coins = 5000
  student.lessonsByStage = { primary: 9, college: 0, graduate: 0 }
  startStudy(student, 'music', 'college', T0)
  const refund = callOffActivity(student, T0)
  assert.equal(refund.refunded, SCHOOL_STAGES[1].tuition)
  assert.equal(student.coins, 5000, 'the tuition comes back whole')

  const worker = hatchEgg(T0)
  const before = worker.coins
  startWork(worker, 'office', T0)
  const forfeit = callOffActivity(worker, T0)
  assert.equal(forfeit.refunded, 0)
  assert.equal(worker.coins, before)
})

// ===========================================================================
// Unified activity
// ===========================================================================

test('the three activities are mutually exclusive', () => {
  const pig = hatchEgg(T0)
  pig.coins = 500
  startWork(pig, 'odd', T0)
  assert.equal(startStudy(pig, 'chinese', 'primary', T0).reason, 'away')
  assert.equal(startTrip(pig, 'suburb', T0).reason, 'away')
  assert.equal(pig.activity.kind, 'work')
})

test('anything away from home drains the pig faster', () => {
  for (const kind of ['work', 'study', 'trip']) {
    const away = hatchEgg(T0)
    const idle = hatchEgg(T0)
    // Same starting bars, so the only difference is being away.
    away.satiety = 100
    idle.satiety = 100
    away.coins = 5000
    if (kind === 'work') startWork(away, 'office', T0)
    else if (kind === 'study') {
      away.coins = 5000
      away.lessonsByStage = { primary: 9, college: 9, graduate: 0 }
      startStudy(away, 'chinese', 'graduate', T0)
    }
    else startTrip(away, 'abroad', T0)
    advance(away, 2)
    advance(idle, 2)
    assert.ok(away.satiety < idle.satiety, `${kind} should make the pig hungrier`)
  }
})

test('trait and course views always list everything', () => {
  const pig = hatchEgg(T0)
  assert.deepEqual(Object.keys(traitView(pig)).sort(), ['charm', 'intel', 'strong'])
  assert.equal(Object.keys(courseView(pig)).length, SUBJECTS.length)
  assert.ok(Object.values(courseView(pig)).every(n => n === 0))
  assert.deepEqual(inventoryView(pig).apple, 0)
})

// ===========================================================================
// Shop
// ===========================================================================

test('the shop is well formed and every illness stage has a cure on sale', () => {
  assert.ok(SHOP.length >= 8)
  for (const item of SHOP) {
    assert.equal(typeof item.key, 'string')
    assert.ok(item.price > 0)
    assert.ok(['food', 'bath', 'toy', 'medicine', 'revive'].includes(item.kind))
  }
  for (let stage = 1; stage <= 4; stage += 1) {
    const med = medicineForStage(stage)
    assert.notEqual(med, null, `stage ${stage} needs a medicine`)
  }
  assert.ok(SHOP.some(i => i.key === REVIVE_ITEM.key), 'the revive item is stocked')
})

test('buying deducts coins and fills the backpack', () => {
  const pig = hatchEgg(T0)
  pig.coins = 50
  const result = buy(pig, 'apple')
  assert.equal(result.ok, true)
  assert.equal(pig.coins, 44)
  assert.equal(pig.inventory.apple, 1)
  assert.equal(pig.stats.purchases, 1)
  assert.deepEqual(inventoryView(pig).apple, 1)
})

test('buying is refused when broke, and for unknown goods', () => {
  const pig = hatchEgg(T0)
  pig.coins = 3
  const poor = buy(pig, 'bone')
  assert.equal(poor.ok, false)
  assert.equal(poor.reason, 'poor')
  assert.equal(pig.coins, 3, 'nothing was spent')
  assert.equal(buy(pig, 'yacht').reason, 'unknown')
})

test('snapshot-independent inventory view always lists every item', () => {
  const pig = hatchEgg(T0)
  const view = inventoryView(pig)
  // Every shop item, plus the free default toy the pig always owns.
  assert.equal(Object.keys(view).length, SHOP.length + 1)
  assert.equal(view[DEFAULT_TOY.key], Infinity, 'the default toy never runs out')
  for (const item of SHOP) assert.equal(view[item.key], 0)
})

// ===========================================================================
// Housekeeping and display
// ===========================================================================

test('rename validates and cleans', () => {
  const pig = layEgg(T0)
  assert.equal(rename(pig, '  大花  ', T0), '大花')
  assert.equal(rename(pig, '', T0), null)
  assert.equal(rename(pig, '一二三四五六七八九十一二三四五六七', T0), null)
})

test('memories are capped', () => {
  const pig = hatchEgg(T0)
  for (let i = 0; i < 30; i += 1) act(pig, 'feed', T0 + (i + 1) * ACTIONS.feed.cooldownMs)
  assert.ok(pig.memories.length <= 8, `memories=${pig.memories.length}`)
  assert.ok(pig.pending.length <= 6, `pending=${pig.pending.length}`)
})

test('display helpers', () => {
  assert.equal(formatWeight(1200), '1.2 kg')
  assert.equal(healthPercent({ health: 5 }), 100)
  assert.equal(healthPercent({ health: 0 }), 0)
  assert.equal(healthPercent({ health: 3 }), 60)
  assert.equal(bar(0).includes('▓'), false)
  assert.equal(bar(100).includes('░'), false)
  assert.equal([...bar(50, 4)].length, 4)
  assert.equal(THRESHOLDS.hungry, 25)
})
