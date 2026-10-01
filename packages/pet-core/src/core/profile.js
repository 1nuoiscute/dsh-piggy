// @ts-check
/**
 * 居民卡：性格、口头禅、签名、生日星座（B9）。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，随机数来自 core/random.js（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/profile
 */

import { CATCHPHRASE_MAX, GRADUATION_LESSONS, MOTTO_MAX, PERSONALITIES, ZODIAC, personalityByKey } from '../data.js'
import { CERTIFICATE_AFTER } from '../data.js'
import { ageDays } from './clock.js'
import { pickOne, rollerFor } from './random.js'

/**
 * Give a newly hatched pig its personality, and the catchphrase and motto that
 * come with it (the owner can change both later).
 * @param {object} state
 */
export function assignPersonality(state) {
  const personality = pickOne(rollerFor(state), PERSONALITIES) ?? PERSONALITIES[0]
  state.personality = personality.key
  state.catchphrase = personality.catchphrase
  state.motto = personality.motto
}

/** Make sure a hatched pig has every profile field (older saves, hand edits). */
export function ensureProfile(state) {
  if (state.hatched !== true) return
  if (personalityByKey(state.personality) === null) {
    assignPersonality(state)
    return
  }
  const personality = personalityByKey(state.personality)
  if (typeof state.catchphrase !== 'string' || state.catchphrase.trim() === '') state.catchphrase = personality?.catchphrase ?? ''
  if (typeof state.motto !== 'string' || state.motto.trim() === '') state.motto = personality?.motto ?? ''
}

/** Trim, cut to `max` characters (not UTF-16 units), refuse empty. */
function cleanText(raw, max) {
  if (typeof raw !== 'string') return ''
  return Array.from(raw.trim()).slice(0, max).join('')
}

/** The owner changes the pig's catchphrase. */
export function setCatchphrase(state, raw) {
  if (state === null) return { ok: false, reason: 'absent' }
  const text = cleanText(raw, CATCHPHRASE_MAX)
  if (text === '') return { ok: false, reason: 'empty' }
  state.catchphrase = text
  return { ok: true, catchphrase: text }
}

/** The owner changes the line on the pig's card. */
export function setMotto(state, raw) {
  if (state === null) return { ok: false, reason: 'absent' }
  const text = cleanText(raw, MOTTO_MAX)
  if (text === '') return { ok: false, reason: 'empty' }
  state.motto = text
  return { ok: true, motto: text }
}

/**
 * The star sign for a month (1–12) and day.
 * @returns {{label: string, emoji: string}}
 */
export function zodiacFor(month, day) {
  let found = ZODIAC[ZODIAC.length - 1]
  for (const sign of ZODIAC) {
    if (month > sign.month || (month === sign.month && day >= sign.day)) found = sign
  }
  return { label: found.label, emoji: found.emoji }
}

/**
 * Everything the villager card shows, worked out once on the host.
 * @param {object} state
 * @param {number} nowMs
 */
export function profileView(state, nowMs) {
  if (state === null || state.hatched !== true) return null
  const personality = personalityByKey(state.personality)
  const born = new Date(typeof state.bornAt === 'number' ? state.bornAt : nowMs)
  const month = born.getMonth() + 1
  const day = born.getDate()
  const lessons = state.lessons ?? {}
  const graduated = Object.values(lessons).reduce(
    (sum, count) => sum + GRADUATION_LESSONS.filter(mark => count >= mark).length, 0)
  const certificates = Object.values(state.interests ?? {}).filter(count => count >= CERTIFICATE_AFTER).length
  return {
    personality: personality === null ? null : { key: personality.key, label: personality.label, emoji: personality.emoji },
    catchphrase: typeof state.catchphrase === 'string' ? state.catchphrase : '',
    motto: typeof state.motto === 'string' ? state.motto : '',
    birthday: `${month} 月 ${day} 日`,
    zodiac: zodiacFor(month, day),
    counts: {
      days: Math.floor(ageDays(state, nowMs)),
      certificates,
      souvenirs: Array.isArray(state.souvenirs) ? state.souvenirs.length : 0,
      graduations: graduated,
    },
  }
}
