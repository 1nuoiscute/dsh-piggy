// @ts-check
/**
 * 设置 → 日志 → 导出（设计见 docs/design/log-export.md）。
 *
 * 一份日志要包含宿主和浏览器两边，然后交给用户自己选地方存：
 * - 桌面版：走外壳的 IPC，弹真正的系统「另存为」；
 * - 网页版：用浏览器的 showSaveFilePicker（同样是系统另存为对话框）；
 * - 都不支持时退回普通下载，总得存得下来。
 *
 * @module dsh-piggy/client/log-export
 */
import { flushBeforeExport } from './journal.js'

const EXPORT_URL = '/dsh-piggy/logs/export'

/** @typedef {{ok:boolean, canceled?:boolean, downloaded?:boolean, path?:string, reason?:string, bytes?:number}} ExportResult */

/** `dsh-piggy-log-20261006-1320.txt` */
function fileName(now = new Date()) {
  const pad = (value, width) => String(value).padStart(width, '0')
  return `dsh-piggy-log-${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`
    + `-${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}.txt`
}

const isCancel = error => error?.name === 'AbortError' || error?.name === 'NotAllowedError'

/** 桌面外壳的另存为；老外壳没有这个方法时返回 null 交给下一步。
 * @returns {Promise<ExportResult|null>} */
async function saveViaShell(name, text) {
  const shell = typeof window === 'object' ? /** @type {any} */ (window).piggyShell : undefined
  const bridge = shell?.logs
  if (bridge === undefined || typeof bridge.save !== 'function') return null
  const result = await bridge.save(name, text)
  if (result?.ok === true) return { ok: true, path: String(result.path ?? '') }
  if (result?.canceled === true) return { ok: false, canceled: true }
  return { ok: false, reason: String(result?.reason ?? '外壳没能保存') }
}

/** 网页版的系统另存为对话框。
 * @returns {Promise<ExportResult|null>} */
async function saveViaPicker(name, text) {
  const picker = typeof window === 'object' ? /** @type {any} */ (window).showSaveFilePicker : undefined
  if (typeof picker !== 'function') return null
  try {
    const handle = await picker({
      suggestedName: name,
      types: [{ description: '日志文本', accept: { 'text/plain': ['.txt'] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(text)
    await writable.close()
    return { ok: true, path: '' }
  } catch (error) {
    if (isCancel(error)) return { ok: false, canceled: true }
    return null // 权限被拒、宿主不支持：退回下载，别让用户什么都拿不到
  }
}

/** 最后的兜底：普通下载（浏览器自己的下载目录）。
 * @returns {ExportResult} */
function saveViaDownload(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    // 用 window.setTimeout：桌面渲染进程和浏览器都有，测试里也不会拖住事件循环。
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return { ok: true, path: '', downloaded: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/** 取回日志并另存为。
 * @returns {Promise<ExportResult>} */
export async function exportLogs() {
  await flushBeforeExport()
  let text
  try {
    const response = await fetch(EXPORT_URL, { cache: 'no-store' })
    if (!response.ok) return { ok: false, reason: '宿主返回 HTTP ' + response.status }
    text = await response.text()
  } catch (error) {
    return { ok: false, reason: '拿不到日志：' + (error instanceof Error ? error.message : String(error)) }
  }
  const name = fileName()
  const saved = (await saveViaShell(name, text)) ?? (await saveViaPicker(name, text)) ?? saveViaDownload(name, text)
  return { ...saved, bytes: text.length }
}
