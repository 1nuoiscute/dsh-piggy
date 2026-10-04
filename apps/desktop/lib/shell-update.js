// @ts-check
/** Desktop executable updates are separate from the downloaded game packs. */
import { compareVersions } from './versions.js'

/**
 * @param {{ platform: string, packaged: boolean, portable?: boolean, appImage?: string }} build
 */
export function shellUpdateMode(build) {
  if (!build.packaged) return 'development'
  if (build.platform === 'darwin') return 'unsigned-mac'
  if (build.platform === 'win32') return build.portable ? 'portable' : 'automatic'
  if (build.platform === 'linux') return build.appImage ? 'automatic' : 'manual'
  return 'manual'
}

/**
 * @param {{ mode: string, currentVersion: string, updater?: any, onProgress?: (fraction: number) => void }} options
 */
export function createShellUpdates(options) {
  const { mode, currentVersion, updater } = options
  let readyVersion = null
  let busy = false
  if (mode === 'automatic') {
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false
    updater.on('download-progress', progress => options.onProgress?.(Math.max(0, Math.min(1, Number(progress.percent) / 100))))
  }

  const status = () => ({ mode, currentVersion, readyVersion })

  /** @param {string} expectedVersion @param {boolean} [prerelease] 外壳在预览版发布里时要让更新器也看预览版 */
  async function download(expectedVersion, prerelease = false) {
    if (mode !== 'automatic') return { ok: false, reason: '这个安装方式需要到发布页下载安装包' }
    if (busy) return { ok: false, reason: '桌面外壳正在下载' }
    if (readyVersion === expectedVersion) return { ok: true, version: readyVersion }
    if (compareVersions(expectedVersion, currentVersion) <= 0) return { ok: false, reason: '桌面外壳已经是这个版本' }
    busy = true
    readyVersion = null
    try {
      updater.allowPrerelease = prerelease
      const result = await updater.checkForUpdates()
      const found = result?.updateInfo?.version
      if (found !== expectedVersion) return { ok: false, reason: found ? `发布页当前外壳是 v${found}，点「刷新」再试` : '还没有可自动安装的外壳包，请到发布页下载' }
      await updater.downloadUpdate()
      readyVersion = found
      return { ok: true, version: found }
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) }
    } finally {
      busy = false
    }
  }

  function install() {
    if (mode !== 'automatic' || readyVersion === null) return { ok: false, reason: '还没有下载好桌面外壳' }
    updater.quitAndInstall(false, true)
    return { ok: true }
  }

  return { status, download, install }
}
