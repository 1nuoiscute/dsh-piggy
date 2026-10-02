// @ts-check
/**
 * 游戏热更新：从 GitHub Release 下载游戏包，校验后放进 userData/versions/<版本>/，
 * 下次启动就用它。安装包自带的那份是兜底；上一个版本留着，可以一键回退。
 *
 * 每个 Release 附两个文件（scripts/release-game.mjs 生成）：
 *   game-<版本>.manifest.json  { version, stateVersion, minShell, shellVersion, sha256, size }
 *   game-<版本>.json.gz        gzip 过的 { files: { 相对路径: base64 内容 } }
 *
 * 纯 Node（fetch、zlib、fs），不依赖 Electron；网络、时间都能换，测试直接跑。
 * @module dsh-piggy-desktop/versions
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize, sep } from 'node:path'
import { gunzipSync } from 'node:zlib'

export const REPO = 'CLICGGER-TYPES/dsh-piggy'
export const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases?per_page=20`
export const RELEASES_PAGE = `https://github.com/${REPO}/releases`

/** `1.2.10` vs `1.2.9`, ignoring a leading v; missing parts count as 0. */
export function compareVersions(a, b) {
  const parts = v => String(v).replace(/^v/, '').split(/[.-]/).map(n => Number.parseInt(n, 10) || 0)
  const x = parts(a), y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0)
  }
  return 0
}

/**
 * @param {object} options
 * @param {string} options.userData   Electron's userData folder
 * @param {string} options.bundledDir the game shipped inside the installer
 * @param {string} options.shellVersion this app's own version
 * @param {string} options.statePath  the pig's save, to refuse versions too old to read it
 * @param {typeof fetch} [options.fetch]
 * @param {string} [options.releasesUrl]
 */
export function createVersions(options) {
  const doFetch = options.fetch ?? fetch
  const releasesUrl = options.releasesUrl ?? RELEASES_URL
  const root = join(options.userData, 'versions')
  const activeFile = join(root, 'active.json')

  const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null } }
  const gameVersion = dir => readJson(join(dir, 'package.json'))?.version ?? '?'
  const installed = version => existsSync(join(root, version, 'package.json'))

  /**
   * What active.json says, cleaned: `active` is a downloaded version or null for
   * the installer's own game; `previous` is where the last switch came from.
   */
  function record() {
    const saved = readJson(activeFile)
    // A new installer brings its own game; a choice made under the old one no longer holds.
    if (saved === null || saved.shell !== options.shellVersion) return { active: null, previous: null }
    const active = typeof saved.active === 'string' && installed(saved.active) ? saved.active : null
    const previous = saved.previous === 'bundled' || (typeof saved.previous === 'string' && installed(saved.previous)) ? saved.previous : null
    return { active, previous: previous === (active ?? 'bundled') ? null : previous }
  }

  /** The folder the game should load from right now. */
  function activeDir() {
    const active = record().active
    return active === null ? options.bundledDir : join(root, active)
  }

  /** The save's version, so older games that cannot read it are refused. */
  function saveVersion() {
    const save = readJson(options.statePath)
    return typeof save?.version === 'number' ? save.version : 0
  }

  function current() {
    const rec = record()
    return {
      version: gameVersion(activeDir()),
      bundled: rec.active === null,
      bundledVersion: gameVersion(options.bundledDir),
      shell: options.shellVersion,
      previous: rec.previous === 'bundled' ? gameVersion(options.bundledDir) : rec.previous,
      previousIsBundled: rec.previous === 'bundled',
    }
  }

  /** Fetch JSON, with a clear message instead of an exception for the panel. */
  async function getJson(url) {
    const res = await doFetch(url, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-piggy-desktop' } })
    if (!res.ok) throw new Error(res.status === 403 ? 'GitHub 暂时不让查了（每小时次数用完），过会儿再试' : `GitHub 回了 ${res.status}`)
    return res.json()
  }

  /**
   * Every release that carries a game package, newest first, with whether it
   * can be installed here and why not.
   */
  async function list() {
    const releases = await getJson(releasesUrl)
    const here = current()
    const save = saveVersion()
    const out = []
    for (const release of Array.isArray(releases) ? releases : []) {
      if (release.draft) continue
      const assets = Array.isArray(release.assets) ? release.assets : []
      const manifestAsset = assets.find(a => /^game-.+\.manifest\.json$/.test(a.name))
      const packAsset = assets.find(a => /^game-.+\.json\.gz$/.test(a.name))
      if (!manifestAsset || !packAsset) continue
      let manifest
      try { manifest = await getJson(manifestAsset.browser_download_url) } catch { continue }
      const version = String(manifest.version ?? release.tag_name).replace(/^v/, '')
      let blocked = null
      if (compareVersions(manifest.minShell ?? '0', options.shellVersion) > 0) blocked = 'shell'
      else if (Number(manifest.stateVersion ?? 0) < save) blocked = 'save'
      const latestShell = manifest.shellVersion ?? manifest.minShell ?? null
      out.push({
        version, tag: release.tag_name, name: release.name || release.tag_name,
        date: String(release.published_at ?? '').slice(0, 10),
        notes: String(release.body ?? '').slice(0, 1200),
        prerelease: release.prerelease === true,
        current: version === here.version,
        blocked, minShell: manifest.minShell ?? null, latestShell,
        shellUpdate: latestShell !== null && compareVersions(latestShell, options.shellVersion) > 0,
        page: release.html_url ?? RELEASES_PAGE,
        manifest, packUrl: packAsset.browser_download_url,
      })
    }
    out.sort((a, b) => compareVersions(b.version, a.version))
    return out
  }

  /**
   * Download, check and unpack one version, then make it the active one.
   * Nothing changes on disk until the package has passed its checksum.
   * @param {{ version: string, manifest: any, packUrl: string }} release
   * @param {(fraction: number) => void} [onProgress]
   */
  async function install(release, onProgress = () => {}) {
    const version = String(release.version)
    if (!/^[0-9A-Za-z.+-]{1,40}$/.test(version)) throw new Error('版本号不对')
    const res = await doFetch(release.packUrl, { headers: { 'user-agent': 'dsh-piggy-desktop' } })
    if (!res.ok || res.body === null) throw new Error(`下载失败（${res.status}）`)
    const total = Number(release.manifest.size) || Number(res.headers.get('content-length')) || 0
    const chunks = []
    let got = 0
    for await (const chunk of /** @type {any} */ (res.body)) {
      chunks.push(chunk)
      got += chunk.length
      if (total > 0) onProgress(Math.min(1, got / total))
    }
    const pack = Buffer.concat(chunks)
    const sha = createHash('sha256').update(pack).digest('hex')
    if (sha !== String(release.manifest.sha256)) throw new Error('下载的文件校验不对，没换')
    const files = JSON.parse(gunzipSync(pack).toString('utf8')).files
    if (files === null || typeof files !== 'object' || typeof files['package.json'] !== 'string') throw new Error('游戏包里少东西，没换')

    const target = join(root, version)
    const staging = `${target}.part`
    rmSync(staging, { recursive: true, force: true })
    for (const [rel, base64] of Object.entries(files)) {
      const file = normalize(join(staging, rel))
      if (!file.startsWith(staging + sep)) throw new Error('游戏包里有可疑路径，没换')
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, Buffer.from(String(base64), 'base64'))
    }
    rmSync(target, { recursive: true, force: true })
    renameSync(staging, target)
    activate(version)
    onProgress(1)
    return { ok: true, version }
  }

  /** Point at `version` (or 'bundled'), remembering where we came from. */
  function activate(version) {
    const rec = record()
    const was = rec.active ?? 'bundled'
    mkdirSync(root, { recursive: true })
    const next = { active: version === 'bundled' ? null : version, previous: was === version ? rec.previous : was, shell: options.shellVersion }
    writeFileSync(activeFile + '.tmp', JSON.stringify(next))
    renameSync(activeFile + '.tmp', activeFile)
  }

  /** Go back to the version used before the last switch. */
  function rollback() {
    const rec = record()
    if (rec.previous === null) return { ok: false, reason: '没有上一个版本' }
    activate(rec.previous)
    return { ok: true, version: current().version }
  }

  return { activeDir, current, list, install, rollback, saveVersion }
}
