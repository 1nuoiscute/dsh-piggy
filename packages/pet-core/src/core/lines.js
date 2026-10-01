// @ts-check
/**
 * 台词：按场景挑一句、放进消息队列，处理主人的回复。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/lines
 */

import { CATCHPHRASE_CHANCE, DEFAULT_OWNER_NAME, LINES, SERIOUS_SCENES, OWNER_NAME_MAX, OWNER_TOKEN, REPLY_HAPPINESS, THRESHOLDS, WELCOME_BACK_AFTER_MINUTES } from '../data.js'
import { announce, clamp100 } from './effects.js'
import { chance, rollerFor } from './random.js'

/** The dialogue record every pig carries; older saves get it filled in. */
export function emptyDialogue() {
  return { ownerName: DEFAULT_OWNER_NAME, lastByScene: {}, open: null, quiet: false, greetedAt: 0 }
}

/**
 * Pick a line for `scene`, never the same one twice in a row.
 * @param {object} state - `dialogue.lastByScene` is updated in place.
 * @param {string} scene
 * @param {import('./random.js').Roll} [next]
 * @returns {{scene: string, text: string, replies: Array<{label: string, happiness: number}>}|null}
 */
export function pickLine(state, scene, next = rollerFor(state)) {
  const pool = LINES[scene]
  if (pool === undefined || pool.length === 0) return null
  const dialogue = ensureDialogue(state)
  const last = dialogue.lastByScene[scene]
  let index = Math.min(pool.length - 1, Math.floor(next() * pool.length))
  if (pool.length > 1 && index === last) index = (index + 1) % pool.length
  dialogue.lastByScene = { ...dialogue.lastByScene, [scene]: index }
  const line = pool[index]
  return {
    scene,
    text: withCatchphrase(state, scene, line.text.split(OWNER_TOKEN).join(dialogue.ownerName), next),
    replies: (line.replies ?? []).map(reply => ({ label: reply.label, happiness: reply.happiness ?? REPLY_HAPPINESS })),
  }
}

/**
 * Now and then the pig ends a line with its catchphrase, the way the villagers
 * do (B9): 「好舒服…」 → 「好舒服，呼噜…」. Never in serious moments, never on a
 * stage direction like 「（眯起眼睛）」, and never twice.
 */
function withCatchphrase(state, scene, text, next) {
  const phrase = typeof state.catchphrase === 'string' ? state.catchphrase.trim() : ''
  if (phrase === '' || SERIOUS_SCENES.includes(scene) || text.startsWith('（') || text.includes(phrase)) return text
  if (!chance(next, CATCHPHRASE_CHANCE)) return text
  const match = /^(.*?)([。！？!?～~…]*)$/.exec(text)
  const body = match === null ? text : match[1]
  const tail = match === null ? '' : match[2]
  return `${body}，${phrase}${tail}`
}

/**
 * Have the pig say something: a `line` message the panel shows in its bubble,
 * with reply buttons when the line has any. Only the newest line can be
 * answered, so an old bubble cannot be replied to twice for extra mood.
 * @returns {boolean} whether a line was queued.
 */
export function say(state, scene, nowMs, next) {
  const line = pickLine(state, scene, next)
  if (line === null) return false
  const message = announce(state, 'line', line.text, nowMs, { scene, replies: line.replies.map(reply => reply.label) })
  const dialogue = ensureDialogue(state)
  dialogue.open = line.replies.length > 0 ? { id: message.id, replies: line.replies } : null
  return true
}

/**
 * The owner answers the pig's latest line.
 * @param {object} state
 * @param {number} lineId - the `id` of the `line` message being answered.
 * @param {number} replyIndex
 */
export function replyToLine(state, lineId, replyIndex) {
  if (state === null) return { ok: false, reason: 'absent' }
  if (state.dead === true) return { ok: false, reason: 'dead' }
  const dialogue = ensureDialogue(state)
  const open = dialogue.open
  if (open === null || open.id !== lineId) return { ok: false, reason: 'stale-line' }
  const reply = open.replies[replyIndex]
  if (reply === undefined) return { ok: false, reason: 'unknown' }
  dialogue.open = null
  state.happiness = clamp100(state.happiness + reply.happiness)
  return { ok: true, reply: reply.label }
}

/**
 * The pig speaks up on its own: `enter` when the owner opens DSH after being
 * away a while, `idle` every so often (the panel decides when). An idle line
 * says what the pig needs first — hungry, dirty, lonely — and only chats when
 * it needs nothing. Never while away, ill, dead, a box, or on 免打扰.
 * @param {object} state
 * @param {'enter'|'idle'} reason
 * @param {number} nowMs
 */
export function chat(state, reason, nowMs) {
  if (state === null || state.hatched !== true || state.dead === true) return { ok: false, reason: 'silent' }
  const dialogue = ensureDialogue(state)
  if (dialogue.quiet) return { ok: false, reason: 'silent' }
  if (state.activity !== null || state.illness !== null) return { ok: false, reason: 'silent' }
  if (reason === 'enter') {
    if (nowMs - dialogue.greetedAt < WELCOME_BACK_AFTER_MINUTES * 60_000) return { ok: false, reason: 'silent' }
    dialogue.greetedAt = nowMs
    say(state, 'enter', nowMs)
    return { ok: true, scene: 'enter' }
  }
  const scene = state.satiety < THRESHOLDS.hungry ? 'hungry'
    : state.cleanliness < THRESHOLDS.dirty ? 'dirty'
      : state.happiness < THRESHOLDS.lonely ? 'lonely'
        : 'idle'
  say(state, scene, nowMs)
  return { ok: true, scene }
}

/** 免打扰: no chatter and no routine toasts; illness and death still speak. */
export function setQuiet(state, on) {
  if (state === null) return { ok: false, reason: 'absent' }
  ensureDialogue(state).quiet = on === true
  return { ok: true, quiet: on === true }
}

/** What the pig calls its owner (the `[主人]` in its lines). */
export function setOwnerName(state, rawName) {
  if (state === null) return { ok: false, reason: 'absent' }
  const name = typeof rawName === 'string' ? rawName.trim().slice(0, OWNER_NAME_MAX) : ''
  if (name === '') return { ok: false, reason: 'empty' }
  ensureDialogue(state).ownerName = name
  return { ok: true, ownerName: name }
}

/** Make sure `state.dialogue` has every field, whatever the save held. */
export function ensureDialogue(state) {
  const raw = state.dialogue
  const base = emptyDialogue()
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    state.dialogue = base
    return base
  }
  const ownerName = typeof raw.ownerName === 'string' && raw.ownerName.trim() !== '' ? raw.ownerName.trim().slice(0, OWNER_NAME_MAX) : base.ownerName
  const lastByScene = raw.lastByScene !== null && typeof raw.lastByScene === 'object' && !Array.isArray(raw.lastByScene) ? raw.lastByScene : {}
  const open = sanitizeOpenLine(raw.open)
  const quiet = raw.quiet === true
  const greetedAt = Number.isFinite(raw.greetedAt) ? raw.greetedAt : 0
  state.dialogue = { ownerName, lastByScene, open, quiet, greetedAt }
  return state.dialogue
}

function sanitizeOpenLine(raw) {
  if (raw === null || typeof raw !== 'object' || !Number.isInteger(raw.id) || !Array.isArray(raw.replies)) return null
  const replies = raw.replies
    .filter(reply => reply !== null && typeof reply === 'object' && typeof reply.label === 'string')
    .map(reply => ({ label: reply.label, happiness: Number.isFinite(reply.happiness) ? reply.happiness : REPLY_HAPPINESS }))
  return replies.length > 0 ? { id: raw.id, replies } : null
}
