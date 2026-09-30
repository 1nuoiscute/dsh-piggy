// @ts-check
/**
 * 台词：按场景挑一句、放进消息队列，处理主人的回复。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/lines
 */

import { DEFAULT_OWNER_NAME, LINES, OWNER_TOKEN, REPLY_HAPPINESS } from '../data.js'
import { announce, clamp100 } from './effects.js'
import { rollerFor } from './random.js'

/** The dialogue record every pig carries; older saves get it filled in. */
export function emptyDialogue() {
  return { ownerName: DEFAULT_OWNER_NAME, lastByScene: {}, open: null }
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
    text: line.text.split(OWNER_TOKEN).join(dialogue.ownerName),
    replies: (line.replies ?? []).map(reply => ({ label: reply.label, happiness: reply.happiness ?? REPLY_HAPPINESS })),
  }
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

/** Make sure `state.dialogue` has every field, whatever the save held. */
export function ensureDialogue(state) {
  const raw = state.dialogue
  const base = emptyDialogue()
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    state.dialogue = base
    return base
  }
  const ownerName = typeof raw.ownerName === 'string' && raw.ownerName.trim() !== '' ? raw.ownerName.trim().slice(0, 12) : base.ownerName
  const lastByScene = raw.lastByScene !== null && typeof raw.lastByScene === 'object' && !Array.isArray(raw.lastByScene) ? raw.lastByScene : {}
  const open = sanitizeOpenLine(raw.open)
  state.dialogue = { ownerName, lastByScene, open }
  return state.dialogue
}

function sanitizeOpenLine(raw) {
  if (raw === null || typeof raw !== 'object' || !Number.isInteger(raw.id) || !Array.isArray(raw.replies)) return null
  const replies = raw.replies
    .filter(reply => reply !== null && typeof reply === 'object' && typeof reply.label === 'string')
    .map(reply => ({ label: reply.label, happiness: Number.isFinite(reply.happiness) ? reply.happiness : REPLY_HAPPINESS }))
  return replies.length > 0 ? { id: raw.id, replies } : null
}
