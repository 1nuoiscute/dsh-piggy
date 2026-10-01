// @ts-check
/**
 * 宠物日记：把「今天发生了什么」攒起来，跨天（06:00）写成一篇。
 *
 * 零 token：模板拼句，不调模型（data/daily.js 的 DIARY_LINES）。事件点只是在
 * 原有逻辑旁边加一句 `noteToday(state, 'feed')`，判断和写入都在这里。
 *
 * @module dsh-piggy/core/diary
 */
import { DIARY_EMPTY_LINE, DIARY_LINES, DIARY_MAX, DIARY_MAX_SENTENCES, OWNER_TOKEN } from '../data.js'
import { dayKeyFor } from './clock.js'
import { ensureDialogue } from './lines.js'

/** 一本空日记：没有历史，今天还没开始记。 */
export function emptyDiary() {
  return { entries: [], today: { day: null, counts: {} } }
}

/**
 * 补默认值（新字段不加 upgrades 级、不动 STATE_VERSION）。
 * @param {object} state
 */
export function ensureDiary(state) {
  const raw = state.diary
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    state.diary = emptyDiary()
    return state.diary
  }
  const entries = Array.isArray(raw.entries) ? raw.entries : []
  const kept = []
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object') continue
    if (typeof entry.day !== 'string' || typeof entry.text !== 'string') continue
    if (entry.day === '' || entry.text === '') continue
    kept.push({ day: entry.day, text: entry.text })
  }
  const today = raw.today !== null && typeof raw.today === 'object' && !Array.isArray(raw.today) ? raw.today : {}
  const counts = {}
  if (today.counts !== null && typeof today.counts === 'object' && !Array.isArray(today.counts)) {
    for (const [key, value] of Object.entries(today.counts)) {
      if (Number.isFinite(value) && value > 0) counts[key] = Math.floor(value)
    }
  }
  state.diary = {
    entries: kept.slice(-DIARY_MAX),
    today: { day: typeof today.day === 'string' && today.day !== '' ? today.day : null, counts },
  }
  return state.diary
}

/**
 * 记一笔今天发生了什么。
 *
 * 时间不进来（事件点只是加一行调用），归属哪一天由 `writeDiaryIfNewDay()` 定：
 * 它每次读状态都会跑，所以计数不会记到错误的日子上。
 * @param {object} state
 * @param {string} kind - DIARY_LINES 里的 key；额外计数（coinsEarned 等）也走这里
 * @param {number} [amount]
 */
export function noteToday(state, kind, amount = 1) {
  const diary = ensureDiary(state)
  diary.today.counts[kind] = (diary.today.counts[kind] ?? 0) + amount
  return diary
}

/**
 * 把一天的数字拼成一篇日记，最多 5 句。什么都没发生也有话说。
 * @param {Record<string, number>} counts
 * @param {string} ownerName
 */
export function composeDiary(counts, ownerName) {
  const sentences = []
  for (const entry of DIARY_LINES) {
    if ((counts[entry.key] ?? 0) <= 0) continue
    sentences.push(entry.said(counts).split(OWNER_TOKEN).join(ownerName))
    if (sentences.length >= DIARY_MAX_SENTENCES) break
  }
  if (sentences.length === 0) return DIARY_EMPTY_LINE.split(OWNER_TOKEN).join(ownerName)
  return sentences.join('')
}

/**
 * 跨天了就把昨天（`today`）写成一篇，然后从今天重新开始记。
 *
 * 每次读状态都会调一次：第一次见到今天会把 `today.day` 归位；换了天就落笔。
 * @returns {boolean} 是否写了新的一篇
 */
export function writeDiaryIfNewDay(state, nowMs) {
  const diary = ensureDiary(state)
  const today = dayKeyFor(nowMs)
  if (diary.today.day === null) {
    diary.today.day = today
    return false
  }
  if (diary.today.day === today) return false

  const owner = ensureDialogue(state).ownerName
  diary.entries.push({ day: diary.today.day, text: composeDiary(diary.today.counts, owner) })
  if (diary.entries.length > DIARY_MAX) diary.entries.splice(0, diary.entries.length - DIARY_MAX)
  diary.today = { day: today, counts: {} }
  return true
}

/** 面板要的那份：按日期倒序（新的在前）。 */
export function diaryView(state) {
  const diary = ensureDiary(state)
  return diary.entries.slice().reverse().map(entry => ({ day: entry.day, text: entry.text }))
}
