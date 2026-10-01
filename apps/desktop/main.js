// @ts-check
/**
 * dsh-piggy 桌面版的主进程。
 *
 * - 窗口铺满当前屏幕的工作区（不盖任务栏）、透明、置顶；页面里的猪和 DSH 网页里
 *   一模一样，拖动、展开、翻到下方都用插件自己的逻辑。窗口形状只包住猪、面板和
 *   气泡（setShape），其余地方的点击落到桌面上。
 * - 宿主是插件自己的 store.js + routes.js（lib/host.js），经 piggy:// 协议访问，不开端口。
 * - 存档在 userData/dsh-piggy/state.json，跟 DSH 里那只各养各的；托盘里可以导入。
 */
import { spawn } from 'node:child_process'
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BrowserWindow, Menu, Tray, app, dialog, ipcMain, nativeImage, net, protocol, screen, shell } from 'electron'

import { startHost } from './lib/host.js'
import { RELEASES_PAGE, createVersions } from './lib/versions.js'

const HERE = dirname(fileURLToPath(import.meta.url))

/** A small log next to the save, so a launch that shows nothing can still be diagnosed. */
function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.join(' ')}\n`
  if (process.env.PIGGY_CAPTURE) process.stdout.write(line)
  try {
    const file = join(app.getPath('userData'), 'piggy.log')
    mkdirSync(dirname(file), { recursive: true })
    appendFileSync(file, line)
  } catch { /* logging must never break the pig */ }
}

/**
 * Start again with `args`. Inside an AppImage the running copy is a temporary
 * mount that vanishes with this process, so the AppImage file itself is relaunched.
 */
function relaunch(args = process.argv.slice(1)) {
  app.relaunch(process.env.APPIMAGE ? { execPath: process.env.APPIMAGE, args } : { args })
}

// Wayland does not let a window stay on top or cut its own shape; XWayland does.
// The platform is chosen before this file runs, so a Wayland start relaunches once under X11.
const X11_FLAG = '--ozone-platform=x11'
const needsX11 = process.platform === 'linux' && Boolean(process.env.WAYLAND_DISPLAY)
  && process.env.PIGGY_WAYLAND !== '1' && !process.argv.includes(X11_FLAG)
if (needsX11) {
  // app.relaunch only fires on a normal quit, which never comes this early; start the copy by hand.
  spawn(process.env.APPIMAGE ?? process.execPath, [...process.argv.slice(1), X11_FLAG], { detached: true, stdio: 'ignore' }).unref()
  app.exit(0)
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'piggy', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

// Testing: keep a throwaway save and settings away from the real ones.
if (process.env.PIGGY_USERDATA) app.setPath('userData', resolve(process.env.PIGGY_USERDATA))
if (!needsX11 && !app.requestSingleInstanceLock()) app.quit()

/** The game shipped inside the app; downloaded versions live under userData (lib/versions.js). */
function bundledGameDir() {
  return app.isPackaged ? join(process.resourcesPath, 'game') : join(HERE, 'game')
}

const statePath = () => join(app.getPath('userData'), 'dsh-piggy', 'state.json')

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }

/** Serve a file from `root`, refusing anything that climbs out of it. */
function serveFile(root, rel) {
  const file = normalize(join(root, rel))
  if (!file.startsWith(normalize(root)) || !existsSync(file)) return new Response('not found', { status: 404 })
  return new Response(readFileSync(file), { headers: { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' } })
}

let host = null
/** @type {ReturnType<typeof createVersions> | null} */
let versions = null
let win = null
let tray = null

function registerProtocol(gameDir) {
  protocol.handle('piggy', async request => {
    const url = new URL(request.url)
    const path = decodeURIComponent(url.pathname)
    if (path.startsWith('/dsh-piggy/')) {
      const body = request.method === 'POST' ? await request.text() : undefined
      const out = await host.handle(request.method, path + url.search, body)
      return new Response(out.body, { status: out.status, headers: out.headers })
    }
    if (path === '/client.js') return serveFile(gameDir, 'client.js')
    return serveFile(join(HERE, 'renderer'), path === '/' ? 'index.html' : path.slice(1))
  })
}

/** The screen the mouse is on when the pig starts: where you just double-clicked. */
function pigDisplay() {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
}

function createWindow() {
  const area = pigDisplay().workArea
  win = new BrowserWindow({
    x: area.x, y: area.y, width: area.width, height: area.height,
    transparent: true, frame: false, resizable: false, movable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: true, show: false,
    backgroundColor: '#00000000',
    webPreferences: { preload: join(HERE, 'preload.cjs'), contextIsolation: true, sandbox: true },
  })
  win.setAlwaysOnTop(true, 'floating')
  // Until the page reports where the pig is, the window takes no clicks at all.
  win.setShape([])
  win.loadURL('piggy://app/index.html')
  win.once('ready-to-show', () => { log('ready-to-show'); win.showInactive(); log('shown', JSON.stringify(win.getBounds()), win.isVisible()) })
  win.webContents.on('did-finish-load', () => log('page loaded'))
  win.webContents.on('render-process-gone', (e, d) => log('renderer gone', JSON.stringify(d)))
  win.webContents.on('console-message', (e, level, message) => { if (level >= 2) log('page:', message) })
  if (process.env.PIGGY_DEVTOOLS === '1') win.webContents.openDevTools({ mode: 'detach' })
  if (process.env.PIGGY_CAPTURE) win.webContents.once('did-finish-load', () => { captureForCheck(process.env.PIGGY_CAPTURE) })
}

let lastShape = []
ipcMain.on('piggy:shape', (event, rects) => {
  if (lastShape.length === 0 && Array.isArray(rects) && rects.length > 0) log('first shape', JSON.stringify(rects))
  if (win === null || event.sender !== win.webContents || !Array.isArray(rects)) return
  lastShape = rects
  win.setShape(rects.slice(0, 64).map(r => ({
    x: Math.round(Number(r.x) || 0), y: Math.round(Number(r.y) || 0),
    width: Math.max(0, Math.round(Number(r.width) || 0)), height: Math.max(0, Math.round(Number(r.height) || 0)),
  })))
})

/** Where the DSH plugin keeps its pig (the folder moved from dsh-pig to dsh-piggy). */
function dshSavePath() {
  const home = process.env.DSH_HOME?.trim() ? resolve(process.env.DSH_HOME.trim()) : join(homedir(), '.dsh')
  for (const folder of ['dsh-piggy', 'dsh-pig']) {
    const file = join(home, folder, 'state.json')
    if (existsSync(file)) return file
  }
  return null
}

/** Copy DSH's pig over this one, keeping a copy of this one first. */
async function importFromDsh() {
  const source = dshSavePath()
  if (source === null) {
    await dialog.showMessageBox({ type: 'info', message: '没找到 DSH 里的猪', detail: '默认找 ~/.dsh/dsh-piggy/state.json（或 DSH_HOME 下面）。' })
    return
  }
  const { response } = await dialog.showMessageBox({
    type: 'question', buttons: ['导入', '算了'], defaultId: 0, cancelId: 1,
    message: '把 DSH 里的猪接过来？',
    detail: `从 ${source} 复制一份过来。桌面版现在这只会先备份，不会丢。`,
  })
  if (response !== 0) return
  host.dispose()
  const target = statePath()
  mkdirSync(dirname(target), { recursive: true })
  if (existsSync(target)) copyFileSync(target, `${target}.before-import-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  copyFileSync(source, target)
  relaunch()
  app.exit(0)
}

/** Start with the system. Electron handles Windows; Linux gets an autostart entry. */
const autostartFile = join(homedir(), '.config', 'autostart', 'dsh-piggy.desktop')
function autostartOn() {
  return process.platform === 'linux' ? existsSync(autostartFile) : app.getLoginItemSettings().openAtLogin
}
function setAutostart(on) {
  if (process.platform !== 'linux') return app.setLoginItemSettings({ openAtLogin: on })
  if (!on) return rmSync(autostartFile, { force: true })
  const exec = process.env.APPIMAGE ?? process.execPath
  mkdirSync(dirname(autostartFile), { recursive: true })
  writeFileSync(autostartFile, `[Desktop Entry]\nType=Application\nName=dsh-piggy\nExec="${exec}"\nX-GNOME-Autostart-enabled=true\n`)
}

function createTray(gameDir) {
  const icon = nativeImage.createFromPath(join(HERE, 'build', 'tray.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('dsh-piggy')
  // Windows：单击托盘图标叫猪出来 / 藏起来（右键是菜单）
  tray.on('click', () => { win?.isVisible() ? win.hide() : win?.showInactive() })
  const menu = () => Menu.buildFromTemplate([
    { label: win?.isVisible() ? '藏起来' : '叫猪出来', click: () => { win?.isVisible() ? win.hide() : win?.showInactive(); tray?.setContextMenu(menu()) } },
    { label: '开机自启', type: 'checkbox', checked: autostartOn(), click: item => setAutostart(item.checked) },
    { label: '从 DSH 导入猪…', click: () => { importFromDsh() } },
    { type: 'separator' },
    { label: `游戏版本 ${readVersion(gameDir)}`, enabled: false },
    { label: '退出', click: () => app.quit() },
  ])
  tray.setContextMenu(menu())
}

function readVersion(gameDir) {
  try { return JSON.parse(readFileSync(join(gameDir, 'package.json'), 'utf8')).version } catch { return '?' }
}

/** Keep a copy of the save before the game code under it changes. */
function backupSave(label) {
  const file = statePath()
  if (existsSync(file)) copyFileSync(file, `${file}.before-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}`)
}

/** Load the new game: flush the save first, then start over. */
function restartGame() {
  try { host?.dispose() } catch { /* best effort */ }
  // Testing runs one launch at a time; the next one is started by hand.
  if (process.env.PIGGY_CAPTURE) return app.exit(0)
  relaunch()
  app.exit(0)
}

// ---- 更新 App（页面里的 tabs/update.js）通过这几个口子调用 ----
let releases = []
const fromPage = event => win !== null && event.sender === win.webContents
ipcMain.handle('piggy:updates:current', event => (fromPage(event) ? versions?.current() : null))
ipcMain.handle('piggy:updates:list', async event => {
  if (!fromPage(event) || versions === null) return { ok: false, reason: '不在桌面版里' }
  try {
    releases = await versions.list()
    return { ok: true, releases: releases.map(({ manifest, packUrl, ...rest }) => rest) }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
})
ipcMain.handle('piggy:updates:install', async (event, version) => {
  if (!fromPage(event) || versions === null) return { ok: false, reason: '不在桌面版里' }
  const target = releases.find(r => r.version === version)
  if (target === undefined) return { ok: false, reason: '先刷新一下版本列表' }
  if (target.blocked !== null) return { ok: false, reason: target.blocked === 'shell' ? '要先装新的安装包' : '存档太新，这个版本读不了' }
  try {
    backupSave('v' + target.version)
    await versions.install(target, fraction => win?.webContents.send('piggy:progress', fraction))
    setTimeout(restartGame, 600)
    return { ok: true, version: target.version }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
})
ipcMain.handle('piggy:updates:rollback', event => {
  if (!fromPage(event) || versions === null) return { ok: false, reason: '不在桌面版里' }
  backupSave('rollback')
  const result = versions.rollback()
  if (result.ok) setTimeout(restartGame, 600)
  return result
})
ipcMain.handle('piggy:quit', (event) => { if (fromPage(event)) app.quit() })
ipcMain.handle('piggy:open', (event, url) => {
  // Only this repo's own pages: the release notes and installers.
  if (fromPage(event) && typeof url === 'string' && url.startsWith(RELEASES_PAGE.replace(/\/releases$/, '/'))) shell.openExternal(url)
})

app.whenReady().then(async () => {
  if (needsX11) return
  log('start', app.getVersion(), process.platform, process.env.XDG_SESSION_TYPE ?? '')
  versions = createVersions({
    userData: app.getPath('userData'), bundledDir: bundledGameDir(), shellVersion: app.getVersion(),
    statePath: statePath(), releasesUrl: process.env.PIGGY_RELEASES_URL || undefined,
    // Chromium's network stack: follows the system proxy, which plain fetch does not.
    fetch: /** @type {any} */ (net.fetch.bind(net)),
  })
  const gameDir = versions.activeDir()
  host = await startHost(gameDir, statePath())
  registerProtocol(gameDir)
  createWindow()
  createTray(gameDir)
  // The window follows its screen's work area when it changes (taskbar moved, resolution changed).
  screen.on('display-metrics-changed', () => { if (win !== null) win.setBounds(screen.getDisplayMatching(win.getBounds()).workArea) })
})

/**
 * Testing: run a list of steps against the page and photograph it (with its
 * transparency), printing the clickable regions each time; then quit. Wayland
 * desktops cannot be screenshotted from here, so this is how the window is
 * checked. Steps (PIGGY_CAPTURE_STEPS, JSON): { js } runs code in the page,
 * { click } clicks a selector inside the pig, { wait } pauses, { shot } saves a PNG.
 */
async function captureForCheck(dir) {
  const wait = ms => new Promise(done => setTimeout(done, ms))
  const steps = process.env.PIGGY_CAPTURE_STEPS
    ? JSON.parse(process.env.PIGGY_CAPTURE_STEPS)
    : [{ shot: 'first' }, { js: "document.querySelector('[data-dsh-pig] .dp-scene').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))" }, { shot: 'toggled' }]
  mkdirSync(dir, { recursive: true })
  await wait(2500)
  for (const step of steps) {
    if (step.wait) await wait(step.wait)
    if (step.js) await win.webContents.executeJavaScript(step.js).catch(error => console.log('[capture] js failed', String(error)))
    if (step.click) {
      const ok = await win.webContents.executeJavaScript(`(() => { const n = document.querySelector('[data-dsh-pig] ${step.click.replace(/'/g, "\\'")}'); if (n) n.click(); return n !== null })()`)
      console.log('[capture] click', step.click, ok)
      await wait(400)
    }
    if (step.shot) {
      await wait(1200)
      const image = await win.webContents.capturePage()
      writeFileSync(join(dir, step.shot + '.png'), image.toPNG())
      console.log('[capture]', step.shot, JSON.stringify({ shape: lastShape }))
    }
  }
  app.quit()
}

app.on('second-instance', () => win?.showInactive())
app.on('before-quit', () => { try { host?.dispose() } catch { /* best effort */ } })
app.on('window-all-closed', () => app.quit())
