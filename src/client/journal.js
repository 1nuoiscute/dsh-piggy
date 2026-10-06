// @ts-check
/**
 * 浏览器这半边的日志（设置 → 日志 → 导出）。
 *
 * 只有宿主那一半不够：面板里抛的错、请求根本没送到宿主、扩展脚本加载失败，
 * 这些都只发生在浏览器里，宿主那边一片空白。所以这里抓：
 * - 未捕获错误（window.error）和没处理的 Promise 拒绝（unhandledrejection）；
 * - 失败的请求（动作和轮询）；
 * - 挂载/渲染时自己 catch 到的错。
 *
 * 记满就送给宿主合并（宿主再落盘），所以刷新页面也不会把现场弄丢。
 * 日志本身绝不许再惹事：发不出去就静默留在内存里，等下次。
 *
 * @module dsh-piggy/client/journal
 */
const LOG_URL = '/dsh-piggy/logs/client'
const LIMIT = 200
const FLUSH_DELAY_MS = 20_000
const MAX_TEXT = 2000

/** @type {Array<{id:string, at:number, level:string, scope:string, message:string, fields:object}>} */
const entries = []
let seq = 0
let sent = 0
let timer = null
let installed = false

const clip = (value, limit) => {
  const text = String(value ?? '')
  return text.length > limit ? text.slice(0, limit) + '…' : text
}

/** 记一条浏览器日志。 */
export function record(level, scope, message, fields = {}) {
  seq += 1
  entries.push({
    id: 'c' + seq,
    at: Date.now(),
    level: ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info',
    scope: clip(scope, 32),
    message: clip(message, MAX_TEXT),
    fields: fields !== null && typeof fields === 'object' ? fields : {},
  })
  if (entries.length > LIMIT) entries.splice(0, entries.length - LIMIT)
  schedule()
  return entries[entries.length - 1]
}

function schedule() {
  if (timer !== null || typeof window === 'undefined' || typeof window.setTimeout !== 'function') return
  timer = window.setTimeout(() => { timer = null; flush() }, FLUSH_DELAY_MS)
}

/** 还没送出去的那些。 */
const unsent = () => entries.slice(sent)

/** 送给宿主。同一批只送一次；失败就留着下次再送。 */
export async function flush() {
  const batch = unsent()
  if (batch.length === 0) return true
  sent = entries.length
  try {
    const response = await fetch(LOG_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entries: batch }),
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    return true
  } catch {
    // 送不到就先不推进游标，下次导出前还会再试一遍。
    sent = Math.max(0, sent - batch.length)
    return false
  }
}

/** 出错时立刻送，别等下次导出（页面可能马上就刷新了）。 */
function flushSoon() {
  Promise.resolve(flush()).catch(() => {})
}

/** 挂上全局抓取；重复调用只挂一次。 */
export function installCapture() {
  if (installed || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
  installed = true
  window.addEventListener('error', event => {
    const error = event?.error
    record('error', 'client', 'uncaught: ' + clip(error?.message ?? event?.message ?? '未知错误', 500), {
      source: clip(event?.filename, 200),
      line: event?.lineno ?? null,
      stack: clip(error?.stack, 1200),
    })
    flushSoon()
  })
  window.addEventListener('unhandledrejection', event => {
    const reason = event?.reason
    record('error', 'client', 'unhandled rejection: ' + clip(reason?.message ?? reason ?? '未知原因', 500), {
      stack: clip(reason?.stack, 1200),
    })
    flushSoon()
  })
}

/** 导出前调用：保证最后几条也已经在宿主那边。 */
export async function flushBeforeExport() {
  await flush()
}

/** 测试和调试用：现在攒了多少条。 */
export const size = () => entries.length
