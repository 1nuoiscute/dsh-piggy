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
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BrowserWindow, Menu, Tray, app, dialog, ipcMain, nativeImage, protocol, screen } from 'electron'

import { startHost } from './lib/host.js'

const HERE = dirname(fileURLToPath(import.meta.url))

// Wayland does not let a window place itself or cut its own shape; XWayland does.
if (process.platform === 'linux' && process.env.PIGGY_WAYLAND !== '1') app.commandLine.appendSwitch('ozone-platform', 'x11')
// A transparent always-on-top window needs no GPU tricks; this avoids black boxes on some drivers.
app.commandLine.appendSwitch('disable-gpu-compositing')

protocol.registerSchemesAsPrivileged([
  { scheme: 'piggy', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

// Testing: keep a throwaway save and settings away from the real ones.
if (process.env.PIGGY_USERDATA) app.setPath('userData', resolve(process.env.PIGGY_USERDATA))
if (!app.requestSingleInstanceLock()) app.quit()

/** The game shipped inside the app; updates live under userData (see lib/versions.js later). */
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

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea
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
  win.once('ready-to-show', () => win.showInactive())
  if (process.env.PIGGY_DEVTOOLS === '1') win.webContents.openDevTools({ mode: 'detach' })
  if (process.env.PIGGY_CAPTURE) win.webContents.once('did-finish-load', () => { captureForCheck(process.env.PIGGY_CAPTURE) })
}

let lastShape = []
ipcMain.on('piggy:shape', (event, rects) => {
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
  app.relaunch()
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

app.whenReady().then(async () => {
  const gameDir = bundledGameDir()
  host = await startHost(gameDir, statePath())
  registerProtocol(gameDir)
  createWindow()
  createTray(gameDir)
  // The window follows the primary screen's work area when it changes (taskbar moved, screen added).
  screen.on('display-metrics-changed', () => { if (win !== null) win.setBounds(screen.getPrimaryDisplay().workArea) })
})

/**
 * Testing: photograph the page (with its transparency) closed and then open,
 * print the clickable regions each time, and quit. Wayland desktops cannot be
 * screenshotted from here, so this is how the window is checked.
 */
async function captureForCheck(dir) {
  const wait = ms => new Promise(done => setTimeout(done, ms))
  mkdirSync(dir, { recursive: true })
  const shot = async name => {
    await wait(1500)
    const image = await win.webContents.capturePage()
    writeFileSync(join(dir, name + '.png'), image.toPNG())
    console.log('[capture]', name, JSON.stringify({ window: win.getBounds(), shape: lastShape }))
  }
  await wait(2500)
  await shot('closed')
  await win.webContents.executeJavaScript("document.querySelector('[data-dsh-pig] .dp-scene').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))")
  await shot('open')
  app.quit()
}

app.on('second-instance', () => win?.showInactive())
app.on('before-quit', () => { try { host?.dispose() } catch { /* best effort */ } })
app.on('window-all-closed', () => app.quit())
