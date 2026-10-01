// @ts-check
/**
 * B9 居民卡：性格、口头禅、签名、星座，以及口头禅进台词。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { hatchEgg, layEgg, migrate, pickLine, profileView, setCatchphrase, setMotto, zodiacFor } from '../core.js'
import { PERSONALITIES } from '../data.js'

const T0 = Date.parse('2026-09-30T10:00:00')

test('a hatched pig gets a personality with its own catchphrase and motto', () => {
  const pig = hatchEgg(T0)
  const personality = PERSONALITIES.find(entry => entry.key === pig.personality)
  assert.notEqual(personality, undefined)
  assert.equal(pig.catchphrase, personality.catchphrase)
  assert.equal(pig.motto, personality.motto)
  const seen = new Set()
  for (let i = 0; i < 60; i += 1) seen.add(hatchEgg(T0 + i * 7919).personality)
  assert.ok(seen.size >= 4, `personalities vary: ${[...seen]}`)
  assert.equal(layEgg(T0).personality, undefined, 'a box has no personality yet')
})

test('an older pig gets a personality on load, and keeps one it already has', () => {
  const old = hatchEgg(T0)
  delete old.personality
  delete old.catchphrase
  delete old.motto
  const loaded = migrate(JSON.parse(JSON.stringify(old)), T0)
  assert.ok(PERSONALITIES.some(entry => entry.key === loaded.personality))
  assert.ok(loaded.catchphrase.length > 0 && loaded.motto.length > 0)
  const kept = migrate(JSON.parse(JSON.stringify({ ...loaded, catchphrase: '噜噜' })), T0)
  assert.equal(kept.personality, loaded.personality)
  assert.equal(kept.catchphrase, '噜噜')
})

test('the owner can change the catchphrase and the motto, within their lengths', () => {
  const pig = hatchEgg(T0)
  assert.equal(setCatchphrase(pig, '   ').reason, 'empty')
  assert.deepEqual(setCatchphrase(pig, ' 噜噜噜噜噜噜噜噜 '), { ok: true, catchphrase: '噜噜噜噜噜噜' })
  assert.deepEqual(setMotto(pig, '今天也要吃饱饱'), { ok: true, motto: '今天也要吃饱饱' })
  assert.equal(Array.from(setMotto(pig, '长'.repeat(40)).motto).length, 24)
})

test('star signs turn over on the right days', () => {
  assert.equal(zodiacFor(3, 20).label, '双鱼座')
  assert.equal(zodiacFor(3, 21).label, '白羊座')
  assert.equal(zodiacFor(1, 19).label, '摩羯座')
  assert.equal(zodiacFor(1, 20).label, '水瓶座')
  assert.equal(zodiacFor(12, 21).label, '射手座')
  assert.equal(zodiacFor(12, 22).label, '摩羯座')
  assert.equal(zodiacFor(9, 30).label, '天秤座')
})

test('the card view: birthday, sign, personality, counts', () => {
  const pig = hatchEgg(T0)
  pig.lessons = { chinese: 20, mathematics: 9 }
  pig.interests = { coding: 5, dancing: 2 }
  const view = profileView(pig, T0)
  assert.equal(view.birthday, '9 月 30 日')
  assert.equal(view.zodiac.label, '天秤座')
  assert.deepEqual(view.counts, { days: 0, certificates: 1, souvenirs: 0, graduations: 3 })
  assert.equal(profileView(layEgg(T0), T0), null)
})

test('the pig sometimes ends a line with its catchphrase, never in serious moments', () => {
  const pig = hatchEgg(T0)
  pig.catchphrase = '噜噜'
  const always = () => 0
  const fresh = () => ({ ...pig, dialogue: { ...pig.dialogue, lastByScene: {} } })
  // 「好吃！还有吗？」 keeps its closing mark after the catchphrase.
  assert.equal(pickLine(fresh(), 'eat', always).text, '好吃！还有吗，噜噜？')
  assert.ok(!pickLine(fresh(), 'sick', always).text.includes('噜噜'), 'not when ill')
  assert.ok(!pickLine(fresh(), 'eat', () => 0.99).text.includes('噜噜'), 'and not every time')
})
