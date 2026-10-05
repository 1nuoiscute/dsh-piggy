// @ts-check
/**
 * 下载来的扩展（v0.30，设计见 docs/design/extension-download.md）。
 *
 * - 在线目录只从仓库的固定地址读（REGISTRY_URL），只装我们自己发布的；
 * - 每个文件下载后核对 sha256，`minGame` 高于当前游戏版本不装；
 * - 装在存档旁边的 `extensions/<key>/`，`server.js` 用动态 import 加载；
 * - 扩展只能改 `state.extData[key]`，动别的只能走这里给的 api（花钱、给东西、说话）；
 * - 扩展出错只影响它自己。
 * @module dsh-piggy/store/ext-runtime
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { announce, ensureExtensions, extensionOn, installExtension, removeExtension } from '../core.js'
import { BOX_TICKET, itemByKey } from '../data.js'
import { CHANNEL } from '../channel.js'

/** 在线扩展目录：GitHub 或 Gitee，看打包时的渠道（channel.js）。 */
export const REGISTRY_URL = CHANNEL.registry
/** 扩展文件只许从本渠道的发行版附件和仓库原始文件下载。 */
export const ALLOWED_SOURCES = [CHANNEL.downloadBase + '/', CHANNEL.rawBase + '/']
const FILES = ['manifest.json', 'server.js', 'client.js']
const KEY = /^[a-z0-9-]{2,24}$/
const REGISTRY_TTL_MS = 10 * 60_000
const MAX_FILE_BYTES = 512 * 1024

/** 「0.31.0」≥「0.30.2」吗（测试版后缀不管）。 */
export function versionAtLeast(have, need) {
  const parse = text => String(text).split('-')[0].split('.').map(part => Number(part) || 0)
  const a = parse(have)
  const b = parse(need)
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  }
  return true
}

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex')

/**
 * @param {any} store - createStore 的结果（要 filePath、state、mutate）
 * @param {object} options
 * @param {string} options.gameVersion
 * @param {typeof fetch} [options.fetch]
 * @param {string} [options.registryUrl] - 测试用；正式版永远是 REGISTRY_URL
 * @param {() => number} [options.now]
 */
export function createExtRuntime(store, options) {
  const doFetch = options.fetch ?? globalThis.fetch
  const registryUrl = options.registryUrl ?? REGISTRY_URL
  const now = options.now ?? (() => Date.now())
  // 没有存档路径（测试里的假存档）就当一个扩展都没装。
  const root = () => typeof store.filePath === 'string' ? join(dirname(store.filePath), 'extensions') : ''
  /** @type {Map<string, {manifest: any, module: any, error: string|null}>} */
  const loaded = new Map()
  let registry = { at: 0, entries: /** @type {any[]} */ ([]), error: /** @type {string|null} */ (null) }

  function readManifest(key) {
    try {
      const manifest = JSON.parse(readFileSync(join(root(), key, 'manifest.json'), 'utf8'))
      return manifest !== null && typeof manifest === 'object' && manifest.key === key ? manifest : null
    } catch { return null }
  }

  /** 装在硬盘上的扩展（不管存档里有没有）。 */
  function installedKeys() {
    if (root() === '' || !existsSync(root())) return []
    return readdirSync(root()).filter(name => KEY.test(name) && readManifest(name) !== null)
  }

  async function load(key) {
    const manifest = readManifest(key)
    if (manifest === null) { loaded.delete(key); return null }
    try {
      const file = join(root(), key, 'server.js')
      const url = pathToFileURL(file).href + '?v=' + statSync(file).mtimeMs
      const imported = await import(url)
      const module = imported.default ?? imported
      loaded.set(key, { manifest, module, error: null })
    } catch (error) {
      loaded.set(key, { manifest, module: null, error: error instanceof Error ? error.message : String(error) })
    }
    return loaded.get(key)
  }

  /** 启动时把硬盘上的扩展都加载一遍。 */
  const ready = Promise.all(installedKeys().map(load)).catch(() => {})

  /** 给扩展用的口子：只能花钱、挣钱、给东西、说话；数据只能动自己的那份。 */
  function apiFor(state, key) {
    const nowMs = now()
    return {
      now: nowMs,
      coins: () => state.coins,
      spend: amount => {
        const n = Math.floor(Number(amount))
        if (!(n >= 0) || state.coins < n) return false
        state.coins -= n
        return true
      },
      earn: amount => { state.coins += Math.max(0, Math.min(100_000, Math.floor(Number(amount) || 0))) },
      give: (itemKey, count = 1) => {
        // 盲盒券不在商店里，但盲盒的凭证商店要能发。
        if (itemByKey(itemKey) === null && itemKey !== BOX_TICKET.key) return false
        const n = Math.max(1, Math.min(99, Math.floor(Number(count) || 1)))
        state.inventory = { ...(state.inventory ?? {}), [itemKey]: (state.inventory?.[itemKey] ?? 0) + n }
        return true
      },
      say: text => { announce(state, 'line', String(text).slice(0, 80), nowMs, { scene: 'ext:' + key, replies: [] }) },
      /** 背包里某样东西有几个。 */
      count: itemKey => Math.max(0, Math.floor(Number(state.inventory?.[itemKey]) || 0)),
      /** 用掉背包里的东西；不够就不动，返回 false。 */
      take: (itemKey, amount = 1) => {
        const n = Math.max(1, Math.floor(Number(amount) || 1))
        const have = Math.floor(Number(state.inventory?.[itemKey]) || 0)
        if (have < n) return false
        const inventory = { ...state.inventory }
        if (have === n) delete inventory[itemKey]
        else inventory[itemKey] = have - n
        state.inventory = inventory
        return true
      },
    }
  }

  /** 快照里的扩展列表（下载来的那部分）。 */
  function list(state) {
    return [...loaded.entries()].filter(([key]) => state?.extData?.[key] !== undefined).map(([key, entry]) => ({
      key,
      label: String(entry.manifest.label ?? key),
      emoji: String(entry.manifest.emoji ?? '🧩'),
      description: String(entry.manifest.description ?? ''),
      version: String(entry.manifest.version ?? ''),
      on: extensionOn(state, key),
      installed: true,
      builtin: false,
      app: entry.manifest.app ? { emoji: String(entry.manifest.app.emoji ?? entry.manifest.emoji ?? '🧩'), label: String(entry.manifest.app.label ?? entry.manifest.label ?? key) } : null,
      error: entry.error,
      apps: [], dexSections: [], shopKinds: [],
    }))
  }

  /** 每个开着的下载扩展给它的 App 页的数据。 */
  function views(state) {
    const out = {}
    for (const [key, entry] of loaded) {
      if (state?.extData?.[key] === undefined || !extensionOn(state, key) || typeof entry.module?.view !== 'function') continue
      try { out[key] = entry.module.view(structuredClone(state.extData[key]), apiFor(structuredClone(state), key)) } catch { out[key] = { error: true } }
    }
    return out
  }

  /** 开着的下载扩展给商店和图鉴的入口。 */
  function parts(state, field) {
    return Object.entries(views(state)).flatMap(([extension, view]) => {
      const part = view?.[field]
      return part !== null && typeof part === 'object' && !Array.isArray(part) ? [{ ...part, extension }] : []
    })
  }
  const shelves = state => parts(state, 'shelf')
  const dex = state => parts(state, 'dex')

  /** 在线目录（带缓存）；`force` 时重新读。 */
  async function online(force = false) {
    if (!force && now() - registry.at < REGISTRY_TTL_MS && registry.error === null && registry.at > 0) return registry
    try {
      const response = await doFetch(registryUrl, { headers: { accept: 'application/json' } })
      if (response.status === 404) throw new Error('目录还没发布')
      if (!response.ok) throw new Error('GitHub 返回 ' + response.status)
      const parsed = await response.json()
      const entries = Array.isArray(parsed?.extensions) ? parsed.extensions.filter(entry => KEY.test(entry?.key ?? '')) : []
      registry = { at: now(), entries, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      registry = { at: now(), entries: registry.entries, error: /fetch failed|ENOTFOUND|ECONN|timed? ?out/i.test(message) ? '连不上 GitHub' : message }
    }
    return registry
  }

  /** 在线扩展列表给面板：每个写清能不能装、为什么。 */
  async function onlineView(force = false) {
    const { entries, error } = await online(force)
    const state = store.state
    return {
      error,
      entries: entries.map(entry => {
        const installed = state === null ? false : (entry.builtin === true ? !(state.extensionsRemoved ?? []).includes(entry.key) : state.extData?.[entry.key] !== undefined)
        const tooNew = typeof entry.minGame === 'string' && !versionAtLeast(options.gameVersion, entry.minGame)
        // 已装的下载扩展：目录里版本更新就可以「更新」（重新下载，数据保留）。
        const local = loaded.get(entry.key)?.manifest?.version ?? null
        const update = installed && entry.builtin !== true && local !== null && typeof entry.version === 'string' && !versionAtLeast(local, entry.version)
        return {
          local, update,
          key: entry.key, label: String(entry.label ?? entry.key), emoji: String(entry.emoji ?? '🧩'),
          description: String(entry.description ?? ''), version: String(entry.version ?? ''), builtin: entry.builtin === true,
          installed, minGame: typeof entry.minGame === 'string' ? entry.minGame : null, blocked: tooNew ? 'game-too-old' : null,
        }
      }),
    }
  }

  /** 安装：内置的直接装回；下载的下载、核对、放好、加载，再在存档里建数据。 */
  async function install(key) {
    if (store.state === null) return { ok: false, reason: 'absent' }
    const { entries } = await online(false)
    const entry = entries.find(candidate => candidate.key === key)
    if (entry === undefined) return { ok: false, reason: 'unknown-extension' }
    if (entry.builtin === true) return store.mutate(state => installExtension(state, key))
    if (typeof entry.minGame === 'string' && !versionAtLeast(options.gameVersion, entry.minGame)) return { ok: false, reason: 'game-too-old', need: entry.minGame }
    const staging = join(root(), '.' + key + '-' + now())
    try {
      mkdirSync(staging, { recursive: true })
      for (const name of FILES) {
        const spec = entry.files?.[name]
        if (spec === undefined || typeof spec.url !== 'string' || typeof spec.sha256 !== 'string') throw new Error('目录里缺少 ' + name)
        if (!ALLOWED_SOURCES.some(prefix => spec.url.startsWith(prefix)) && options.registryUrl === undefined) throw new Error('来源不对：' + name)
        const response = await doFetch(spec.url)
        if (!response.ok) throw new Error(name + ' 下载失败（HTTP ' + response.status + '）')
        const buffer = Buffer.from(await response.arrayBuffer())
        if (buffer.length > MAX_FILE_BYTES) throw new Error(name + ' 太大')
        if (sha256(buffer) !== spec.sha256.toLowerCase()) throw new Error(name + ' 校验不对，可能下载坏了')
        writeFileSync(join(staging, name), buffer)
      }
      const target = join(root(), key)
      rmSync(target, { recursive: true, force: true })
      renameSync(staging, target)
    } catch (error) {
      rmSync(staging, { recursive: true, force: true })
      return { ok: false, reason: 'download-failed', message: error instanceof Error ? error.message : String(error) }
    }
    const entryLoaded = await load(key)
    if (entryLoaded === null || entryLoaded.module === null) return { ok: false, reason: 'broken-extension', message: entryLoaded?.error ?? '' }
    const initial = typeof entryLoaded.module.init === 'function' ? entryLoaded.module.init() : {}
    return store.mutate(state => installExtension(state, key, initial))
  }

  /** 删除：核心清数据；下载的再把文件删掉。 */
  function remove(key) {
    const result = store.mutate(state => removeExtension(state, key, now()))
    if (result.ok && loaded.has(key)) {
      loaded.delete(key)
      rmSync(join(root(), key), { recursive: true, force: true })
    }
    return result
  }

  /** 执行扩展自己的动作；只交出它自己的数据。 */
  function act(key, op, payload) {
    const entry = loaded.get(key)
    if (entry === undefined) return { ok: false, reason: 'unknown-extension' }
    if (entry.module === null) return { ok: false, reason: 'broken-extension' }
    const handler = entry.module.actions?.[op]
    if (typeof handler !== 'function') return { ok: false, reason: 'unknown' }
    return store.mutate(state => {
      ensureExtensions(state)
      if (state.extData[key] === undefined) return { ok: false, reason: 'not-installed' }
      if (!extensionOn(state, key)) return { ok: false, reason: 'extension-off' }
      const data = structuredClone(state.extData[key])
      let result
      try { result = handler(data, payload ?? {}, apiFor(state, key)) } catch (error) {
        return { ok: false, reason: 'extension-error', message: error instanceof Error ? error.message : String(error) }
      }
      state.extData[key] = data
      return result !== null && typeof result === 'object' ? { ok: result.ok !== false, ...result } : { ok: true }
    })
  }

  /** 扩展的面板脚本（GET /dsh-piggy/ext/<key>/client.js）。 */
  function clientScript(key) {
    if (!KEY.test(key) || !loaded.has(key)) return null
    try { return readFileSync(join(root(), key, 'client.js'), 'utf8') } catch { return null }
  }

  return { ready, list, views, shelves, dex, onlineView, install, remove, act, clientScript }
}
