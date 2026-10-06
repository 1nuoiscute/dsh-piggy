// @ts-check
/**
 * 运行日志：设置 → 日志 → 导出。
 *
 * 目的很具体：用户说「我这里不行」时，导出的这一份要让人不看代码就知道
 * 哪一步、哪个地址、什么错。所以记这些：
 * - 启动头：游戏版本、渠道、存档版本、运行环境、存档路径；
 * - 每个动作：做了什么、耗时、成功还是被拒绝（带原因）；
 * - 网络：扩展目录和每个扩展文件的地址、状态、耗时、失败原因；
 * - 存档：读、写、迁移、备份；
 * - 客户端：浏览器那半边的未捕获错误和失败请求（由客户端送过来）。
 *
 * 网页版没有稳定的可写目录，所以内存里始终留最近 BUFFER_LIMIT 条；
 * 有存档目录时同时追加到 `<存档目录>/logs/dsh-piggy.log`，满了轮转一份 `.1`。
 * 日志写得再多也不能拖慢猪，更不能因为写不进去就抛错。
 *
 * @module dsh-piggy/store/journal
 */
import { appendFile, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const LEVELS = Object.freeze(['debug', 'info', 'warn', 'error'])
const BUFFER_LIMIT = 800
const FILE_LIMIT_BYTES = 1_500_000
const MAX_FIELD_CHARS = 400
const MAX_CLIENT_ENTRIES = 200

const trim = (text, limit) => (text.length > limit ? text.slice(0, limit) + '…' : text)

/** 「2026-10-06 13:20:11.123」，本地时间，导出给人看。 */
function stamp(at) {
  const date = new Date(at)
  const pad = (value, width) => String(value).padStart(width, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)} `
    + `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}.${pad(date.getMilliseconds(), 3)}`
}

/** 上下文写成 key="value"，和项目里已有的日志文案一个样子。 */
function fieldsText(fields) {
  if (fields === null || typeof fields !== 'object') return ''
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}="${trim(typeof value === 'object' ? JSON.stringify(value) : String(value), MAX_FIELD_CHARS)}"`)
    .join(' ')
}

/** 一条日志的规范形状：客户端送来的也要过这一道，脏数据不许进导出文件。 */
function cleanEntry(raw, fallbackAt) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const message = typeof raw.message === 'string' ? trim(raw.message, 2000) : ''
  if (message === '') return null
  const level = LEVELS.includes(raw.level) ? raw.level : 'info'
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : null,
    at: Number.isFinite(raw.at) ? raw.at : fallbackAt,
    level,
    scope: typeof raw.scope === 'string' && raw.scope !== '' ? trim(raw.scope, 32) : 'client',
    message,
    fields: raw.fields !== null && typeof raw.fields === 'object' && !Array.isArray(raw.fields) ? raw.fields : {},
  }
}

/**
 * @param {object} [options]
 * @param {string} [options.dir] - 日志目录（一般是存档目录，函数自己加 logs/）
 * @param {() => number} [options.now]
 * @param {number} [options.limit]
 */
export function createJournal(options = {}) {
  const now = options.now ?? (() => Date.now())
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : BUFFER_LIMIT
  const dir = typeof options.dir === 'string' && options.dir !== '' ? join(options.dir, 'logs') : ''
  const file = dir === '' ? '' : join(dir, 'dsh-piggy.log')
  /** @type {ReturnType<typeof cleanEntry>[]} */
  const entries = []
  const clientIds = new Set()
  /** 启动头那几行（版本、渠道、环境），导出时单独列出。 */
  let meta = {}
  let dropped = 0
  let fileBroken = ''
  let queue = Promise.resolve()

  /** 内存里留最近 limit 条；文件这一份是给「翻上次留下的现场」用的。 */
  function record(level, scope, message, fields = {}) {
    const entry = {
      id: null,
      at: now(),
      level: LEVELS.includes(level) ? level : 'info',
      scope: typeof scope === 'string' && scope !== '' ? scope : 'app',
      message: trim(String(message ?? ''), 2000),
      fields: fields !== null && typeof fields === 'object' ? fields : {},
    }
    if (entry.message === '') return entry
    entries.push(entry)
    if (entries.length > limit) {
      dropped += entries.length - limit
      entries.splice(0, entries.length - limit)
    }
    writeFile(entry)
    return entry
  }

  /** 追加一行 JSONL。写日志本身永远不许影响猪：出错就停写并留一句原因。 */
  function writeFile(entry) {
    if (file === '' || fileBroken !== '') return
    queue = queue.then(() => new Promise(resolve => {
      try {
        mkdirSync(dir, { recursive: true })
        rotateIfNeeded()
        appendFile(file, JSON.stringify(entry) + '\n', error => {
          if (error) fileBroken = error.message
          resolve()
        })
      } catch (error) {
        fileBroken = error instanceof Error ? error.message : String(error)
        resolve()
      }
    }))
  }

  function rotateIfNeeded() {
    try {
      if (statSync(file).size < FILE_LIMIT_BYTES) return
      renameSync(file, file + '.1')
    } catch { /* 文件还不存在就没什么可轮转的 */ }
  }

  /** 客户端（浏览器）送来的日志并进来；同一条 id 只收一次。 */
  function attachClient(list, fallbackAt = now()) {
    if (!Array.isArray(list)) return 0
    let added = 0
    for (const raw of list.slice(-MAX_CLIENT_ENTRIES)) {
      const entry = cleanEntry(raw, fallbackAt)
      if (entry === null) continue
      if (entry.id !== null) {
        if (clientIds.has(entry.id)) continue
        clientIds.add(entry.id)
      }
      entries.push({ ...entry, scope: entry.scope === 'client' ? 'client' : `client/${entry.scope}` })
      added += 1
    }
    if (entries.length > limit) {
      dropped += entries.length - limit
      entries.splice(0, entries.length - limit)
    }
    return added
  }

  /** 启动头：出问题时第一时间要看的那几行（单独成行，不挤在一条里）。 */
  function header(fields) {
    if (fields !== null && typeof fields === 'object') meta = { ...meta, ...fields }
    record('info', 'boot', 'dsh-piggy 启动')
    if (fileBroken !== '') record('warn', 'boot', '日志文件写不进去，只在内存里保留', { file, reason: fileBroken })
  }

  function counts() {
    const total = { debug: 0, info: 0, warn: 0, error: 0 }
    for (const entry of entries) total[entry.level] += 1
    return total
  }

  /** 导出成一份人能读的纯文本。 */
  function text(extraMeta = {}) {
    const lines = ['dsh-piggy 日志', `导出时间： ${stamp(now())}`]
    for (const [key, value] of Object.entries({ ...meta, ...extraMeta })) {
      if (value !== undefined && value !== null && value !== '') lines.push(`${key}： ${value}`)
    }
    lines.push(`日志文件： ${file === '' ? '（网页版没有落盘，只有内存里这一份）' : file}`)
    const total = counts()
    lines.push(`共 ${entries.length} 条（info ${total.info} · warn ${total.warn} · error ${total.error} · debug ${total.debug}）`
      + (dropped > 0 ? `，更早的 ${dropped} 条已滚出内存` : ''))
    lines.push('', '─'.repeat(60))
    for (const entry of [...entries].sort((a, b) => a.at - b.at)) {
      const fields = fieldsText(entry.fields)
      lines.push(`${stamp(entry.at)}  ${entry.level.toUpperCase().padEnd(5)} ${entry.scope.padEnd(14)} ${entry.message}${fields === '' ? '' : '  ' + fields}`)
    }
    if (entries.length === 0) lines.push('（还没有日志）')
    return lines.join('\n') + '\n'
  }

  return {
    record,
    header,
    attachClient,
    text,
    counts,
    file: () => file,
    entries: () => entries.slice(),
    /** 等文件写完（导出、退出前用）。 */
    flush: () => queue,
  }
}
