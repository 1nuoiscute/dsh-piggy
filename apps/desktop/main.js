// @ts-check
/**
 * dsh-piggy 桌面版的主进程。
 *
 * - 窗口**只框住「猪 + 面板 + 气泡」的外接矩形**，四周留 16px（D1）。以前窗口铺满整个
 *   工作区，Windows 上每帧都要合成一整块全屏透明层，整机都跟着卡。现在页面把内容框报上来
 *   （布局盒，不受动画影响），这里用 lib/window-geometry.js 算窗口位置：以右下角为锚，
 *   夹在工作区内；拖猪时主进程按固定起点采样鼠标，仅约束猪本身。
 * - 页面里的猪和 DSH 网页里一模一样；可点区域仍然只包住内容（setShape），其余点击落到桌面。
 * - 宿主是插件自己的 store.js + routes.js（lib/host.js），经 piggy:// 协议访问，不开端口。
 * - 存档在 userData/dsh-piggy/state.json，跟 DSH 里那只各养各的；托盘里可以导入。
 */
import { spawn } from 'node:child_process'
import { appendFile, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BrowserWindow, Menu, Tray, app, dialog, ipcMain, nativeImage, net, protocol, screen, shell } from 'electron'
import updaterPackage from 'electron-updater'

import { startHost } from './lib/host.js'
import { MIN_WINDOW, WINDOW_PADDING, clampBounds, contentBoundsForPig, dragPigBounds, moveAcrossDisplays, resizedPigScreenPoint } from './lib/window-geometry.js'
import { RELEASES_PAGE, createVersions } from './lib/versions.js'
import { createShellUpdates, shellUpdateMode } from './lib/shell-update.js'
import { dragHeartbeatExpired } from './lib/drag-watchdog.js'

const { autoUpdater } = updaterPackage

const HERE = dirname(fileURLToPath(import.meta.url))

/** Windows 上每帧合成整窗的代价高：30fps 足够猪动，CPU/GPU 掉一大截。 */
const FRAME_RATE = 30
/** 页面还没报内容框之前的兜底尺寸：折叠的猪 + 留白。 */
const FALLBACK_CONTENT = { width: 132, height: 152 }

/** A small log next to the save, so a launch that shows nothing can still be diagnosed. */
function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.join(' ')}\n`
  if (process.env.PIGGY_CAPTURE) process.stdout.write(line)
  try {
    const file = join(app.getPath('userData'), 'piggy.log')
    mkdirSync(dirname(file), { recursive: true })
    appendFile(file, line, () => {})
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

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf' }

/** Serve a file from `root`, refusing anything that climbs out of it. */
function serveFile(root, rel) {
  const file = normalize(join(root, rel))
  if (!file.startsWith(normalize(root)) || !existsSync(file)) return new Response('not found', { status: 404 })
  const type = MIME[extname(file)] ?? 'application/octet-stream'
  // 立绘、字体让浏览器缓存：摸猪时立绘在「摸」和「平常」之间来回换，
  // 不缓存的话每次都要重新取一遍，Windows 上会空一帧（猪闪一下）。
  const cache = /^(image|font)\//.test(type) ? { 'cache-control': 'max-age=86400' } : {}
  return new Response(readFileSync(file), { headers: { 'content-type': type, ...cache } })
}

let host = null
/** @type {ReturnType<typeof createVersions> | null} */
let versions = null
/** @type {ReturnType<typeof createShellUpdates> | null} */
let shellUpdates = null
let win = null
/** 正在退出/重启：关掉窗口前先置位，之后到达的页面消息一律不处理。 */
let quitting = false
/**
 * 消息是不是这扇窗口的页面发来的。窗口销毁后再读 win.webContents 会抛
 * 「Object has been destroyed」—— Windows 上在更新页切换版本时，旧页面的消息还在路上，
 * 主进程直接弹了错误框（用户 2026-10-05 实测）。所以先查 isDestroyed。
 */
function fromPage(event) {
  return !quitting && win !== null && !win.isDestroyed() && event.sender === win.webContents
}
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

/** 上次把猪停在哪儿（窗口位置），下次开机照旧。 */
function windowStatePath() {
  return join(app.getPath('userData'), 'window.json')
}

function readWindowState() {
  try {
    const saved = JSON.parse(readFileSync(windowStatePath(), 'utf8'))
    if (saved !== null && typeof saved === 'object' && Number.isFinite(saved.width) && Number.isFinite(saved.height)) return saved
  } catch { /* 第一次运行没有这个文件 */ }
  return null
}

/** 让窗口晚一点再写盘：拖动时 setBounds 会连发。 */
let windowStateTimer = null
function scheduleWindowStateSave() {
  if (win === null || win.isDestroyed()) return
  if (windowStateTimer !== null) clearTimeout(windowStateTimer)
  windowStateTimer = setTimeout(() => {
    windowStateTimer = null
    if (win === null || win.isDestroyed()) return
    try {
      mkdirSync(dirname(windowStatePath()), { recursive: true })
      const bounds = win.getBounds()
      // 连猪在屏幕上的位置一起存：下次启动按猪摆，而不是按窗口摆 —— 窗口大小每次启动
      // 可能不同（上次退出时面板开着、气泡区、版本升级），按窗口摆猪会一次漂几像素。
      const pig = lastPigWindow === null ? undefined : { x: bounds.x + lastPigWindow.x, y: bounds.y + lastPigWindow.y }
      writeFileSync(windowStatePath(), JSON.stringify({ ...bounds, pig }))
    } catch { /* 存不下就算了，下次用兜底位置 */ }
  }, 800)
}

/** 这块窗口落在哪块屏上，就用那块屏的工作区。 */
function workAreaFor(bounds) {
  return screen.getDisplayMatching(bounds).workArea
}

/** 把窗口几何推给页面：面板要朝屏幕里侧开。 */
let geometrySeq = 0
function pushGeometry() {
  if (win === null || win.isDestroyed()) return
  const bounds = win.getBounds()
  win.webContents.send('piggy:geometry', { window: bounds, workArea: workAreaFor(bounds), seq: ++geometrySeq })
}

function applyBounds(next, why) {
  if (win === null || win.isDestroyed()) return
  const before = win.getBounds()
  if (before.x === next.x && before.y === next.y && before.width === next.width && before.height === next.height) return
  win.setBounds(next)
  // 拖动时每秒要挪几十次：别每次都写日志（Windows 上同步写盘会卡住主进程）。
  if (why !== 'drag' && why !== 'move') log('bounds', why, JSON.stringify(next))
  scheduleWindowStateSave()
  pushGeometry()
}

/**
 * Windows 上不用 setShape，改用「鼠标穿透 + 页面判断鼠标在不在猪/面板上」：
 * setShape 在 Windows 上是 SetWindowRgn，开关面板时可点区域整块变化，透明分层窗口会闪一下白
 * （用户 2026-10-05：装了 0.2.5 右键开关菜单仍闪白屏）。穿透模式下窗口区域从不变化。
 * PIGGY_SHAPE=1 可退回旧做法，方便对比排查。
 */
const PASSTHROUGH = process.platform === 'win32' && process.env.PIGGY_SHAPE !== '1'
let passthroughHit = false
function setHit(hit) {
  if (!PASSTHROUGH || win === null || win.isDestroyed() || hit === passthroughHit) return
  passthroughHit = hit
  win.setIgnoreMouseEvents(!hit, { forward: true })
}

/**
 * 只让窗口的一部分可点（其余点击落到桌面）。Electron 只在 Windows / Linux 支持；
 * macOS 上跳过 —— 窗口已经只有猪和面板那么大，四周 16px 的透明边会挡一下点击，影响不大。
 */
function applyShape(rects) {
  if (PASSTHROUGH || win === null || win.isDestroyed() || process.platform === 'darwin' || typeof win.setShape !== 'function') return
  win.setShape(rects)
}

/** 上次退出时猪的屏幕位置：启动后第一次收到内容上报时按它摆窗口。 */
let savedPigScreen = null

function createWindow() {
  const saved = readWindowState()
  savedPigScreen = saved !== null && Number.isFinite(saved.pig?.x) && Number.isFinite(saved.pig?.y) ? { x: saved.pig.x, y: saved.pig.y } : null
  if (savedPigScreen !== null) {
    // 显示器拔掉或换了分辨率：猪至少要整只留在某块屏上。
    const pigArea = screen.getDisplayNearestPoint(savedPigScreen).workArea
    const box = clampBounds({ ...savedPigScreen, width: MIN_WINDOW.width, height: MIN_WINDOW.height }, pigArea)
    savedPigScreen = { x: box.x, y: box.y }
  }
  const area = saved === null ? pigDisplay().workArea : screen.getDisplayMatching(saved).workArea
  const width = saved === null ? FALLBACK_CONTENT.width + WINDOW_PADDING * 2 : saved.width
  const height = saved === null ? FALLBACK_CONTENT.height + WINDOW_PADDING * 2 : saved.height
  const anchorRight = saved === null ? 18 : null
  const start = saved === null
    ? clampBounds({ x: area.x + area.width - width - anchorRight, y: area.y + area.height - height - anchorRight, width, height }, area)
    : clampBounds({ ...saved, width, height }, area)
  win = new BrowserWindow({
    ...start,
    transparent: true, frame: false, resizable: false, movable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: true, show: false,
    backgroundColor: '#00000000',
    webPreferences: { preload: join(HERE, 'preload.cjs'), contextIsolation: true, sandbox: true },
  })
  win.setAlwaysOnTop(true, 'floating')
  // 30fps：猪的动画够看，整窗合成的次数砍一半（D1 第 3 条）。
  win.webContents.setFrameRate(FRAME_RATE)
  // Until the page reports where the pig is, the window takes no clicks at all.
  applyShape([])
  if (PASSTHROUGH) { passthroughHit = true; setHit(false) }
  win.loadURL('piggy://app/index.html')
  // 启动摆放最多管 3 秒：之后一律按猪当前位置算，免得哪次没对上就一直往回拽。
  win.once('ready-to-show', () => { setTimeout(() => { savedPigScreen = null }, 3000) })
  win.once('ready-to-show', () => { log('ready-to-show'); win.showInactive(); log('shown', JSON.stringify(win.getBounds()), win.isVisible()) })
  win.webContents.on('did-finish-load', () => log('page loaded'))
  win.webContents.on('render-process-gone', (e, d) => { stopDrag(); log('renderer gone', JSON.stringify(d)) })
  win.webContents.on('console-message', (e, level, message) => { if (level >= 2) log('page:', message) })
  if (process.env.PIGGY_DEVTOOLS === '1') win.webContents.openDevTools({ mode: 'detach' })
  if (process.env.PIGGY_CAPTURE) win.webContents.once('did-finish-load', () => { captureForCheck(process.env.PIGGY_CAPTURE) })
}

let lastShape = []
/** Last renderer-reported local pig origin; always measured after pinPig. */
let lastPigWindow = null
let lastPigSize = { width: 56, height: 56 }
/** Original screen point to restore when an overlarge panel closes. */
let restingPigScreen = null
/** Last geometry report, used to skip idle reports. */
let lastContent = null

/**
 * The renderer reports the already-pinned pig and content in one frame.
 * Position and resize the window in one setBounds call around that pig point.
 */
ipcMain.on('piggy:content', (event, content) => {
  if (!fromPage(event)) {
    if (content?.immediate === true) event.returnValue = null
    return
  }
  const width = Number(content?.width)
  const height = Number(content?.height)
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    if (content?.immediate === true) event.returnValue = null
    return
  }
  const anchor = { vertical: content?.anchor?.vertical === 'top' ? 'top' : 'bottom', horizontal: content?.anchor?.horizontal === 'left' ? 'left' : 'right' }
  const bounds = win.getBounds()
  const pigWindow = { x: Number(content?.pigWindow?.x), y: Number(content?.pigWindow?.y) }
  const hasPigWindow = Number.isFinite(pigWindow.x) && Number.isFinite(pigWindow.y)
  const pigSize = Number(content?.pig?.width) > 0 && Number(content?.pig?.height) > 0
    ? { width: Number(content.pig.width), height: Number(content.pig.height) } : lastPigSize
  const sizeChanged = lastPigWindow !== null
    && (lastPigSize.width !== pigSize.width || lastPigSize.height !== pigSize.height)
  const panelOpen = content?.panelOpen === true
  const changed = lastContent === null
    || lastContent.width !== width || lastContent.height !== height
    || lastContent.anchor.vertical !== anchor.vertical || lastContent.anchor.horizontal !== anchor.horizontal
    || lastContent.panelOpen !== panelOpen
    || sizeChanged
    || (hasPigWindow && lastPigWindow !== null && (pigWindow.x !== lastPigWindow.x || pigWindow.y !== lastPigWindow.y))

  if (savedPigScreen !== null) {
    // 用「这次摆之前」的窗口 + 页面实际量到的猪位置判断：窗口已经不用再改、猪确实在存下的位置上。
    const pigNow = { x: Number(content?.pigNow?.x), y: Number(content?.pigNow?.y) }
    const settled = bounds.width === Math.max(MIN_WINDOW.width, Math.round(width))
      && bounds.height === Math.max(MIN_WINDOW.height, Math.round(height))
      && Math.abs(bounds.x + pigNow.x - savedPigScreen.x) <= 1 && Math.abs(bounds.y + pigNow.y - savedPigScreen.y) <= 1
    if (settled || panelOpen) savedPigScreen = null
  }

  if (changed && hasPigWindow) {
    const pigNow = { x: Number(content?.pigNow?.x), y: Number(content?.pigNow?.y) }
    const before = lastPigWindow ?? (Number.isFinite(pigNow.x) && Number.isFinite(pigNow.y) ? pigNow : pigWindow)
    // 启动时以存下来的猪位置为准，直到页面量到的实际位置（pigNow，不是预测值）和它对上：
    // 启动那几次上报里窗口还在改大小，按预测值摆会让猪每次启动漂几像素。
    const pigBefore = savedPigScreen ?? { x: bounds.x + before.x, y: bounds.y + before.y }
    if (panelOpen && lastContent?.panelOpen !== true) restingPigScreen = pigBefore
    // 启动时页面先画占位的纸盒，拿到存档才换成真正的猪：这个尺寸变化不是「调了小猪大小」，
    // 不能按脚底中心挪，直接摆回存下的位置（存的就是真猪的左上角）。
    const target = savedPigScreen !== null ? savedPigScreen
      : sizeChanged
        ? resizedPigScreenPoint(restingPigScreen ?? pigBefore, lastPigSize, pigSize)
        : (restingPigScreen ?? pigBefore)
    if (sizeChanged && restingPigScreen !== null) restingPigScreen = target
    const area = screen.getDisplayNearestPoint(target).workArea
    applyBounds(contentBoundsForPig({
      width, height, pigWindow: { ...pigWindow, ...pigSize }, panelOpen,
      allowPanelOverflow: sizeChanged,
    }, target, area), 'content')
    if (!panelOpen) restingPigScreen = null
  }

  lastContent = { width, height, anchor, panelOpen }
  if (hasPigWindow) lastPigWindow = pigWindow
  lastPigSize = pigSize
  // 记下「猪在屏幕上哪儿」：实机核对展开面板时它有没有动（日志里是 DIP 坐标）。
  const pigOnScreen = hasPigWindow ? { x: win.getBounds().x + pigWindow.x, y: win.getBounds().y + pigWindow.y } : null
  log('content', JSON.stringify({ window: win.getBounds(), anchor, pigOnScreen, target: restingPigScreen }))
  const shape = Array.isArray(content.shape) ? content.shape : []
  applyShape(shape.slice(0, 64).map(r => ({
    x: Math.max(0, Math.round(Number(r.x) || 0)), y: Math.max(0, Math.round(Number(r.y) || 0)),
    width: Math.max(0, Math.round(Number(r.width) || 0)), height: Math.max(0, Math.round(Number(r.height) || 0)),
  })))
  lastShape = shape
  if (content?.immediate === true) {
    const current = win.getBounds()
    event.returnValue = { window: current, workArea: workAreaFor(current), seq: geometrySeq }
  }
})

/** Drag against a fixed cursor/window sample; only the pig is clamped. */
let dragSession = null
let dragTimer = null
function dragTick() {
  if (win === null || win.isDestroyed() || dragSession === null) return
  if (dragHeartbeatExpired(dragSession.lastHeartbeat, Date.now())) { stopDrag(); return }
  const cursor = screen.getCursorScreenPoint()
  const area = screen.getDisplayNearestPoint(cursor).workArea
  // 按「猪」算，不按起始窗口算：拖动中窗口大小可能变（冒气泡、面板换页），
  // 用起始窗口的大小去 setBounds 会把窗口来回改大改小，猪就一抽一抽的。
  const pig = { ...(lastPigWindow ?? { x: WINDOW_PADDING, y: WINDOW_PADDING }), ...lastPigSize }
  applyBounds(dragPigBounds(win.getBounds(), pig, dragSession.pigScreen, dragSession.cursor, cursor, area), 'drag')
}
function stopDrag() {
  if (dragTimer !== null) clearInterval(dragTimer)
  dragTimer = null
  dragSession = null
}

/** 页面要几何：给它推一次（订阅晚于 did-finish-load 时靠这个）。 */
ipcMain.on('piggy:geometry:ask', (event) => {
  if (!fromPage(event)) return
  pushGeometry()
})

ipcMain.on('piggy:drag:start', event => {
  if (!fromPage(event)) return
  stopDrag()
  const bounds = win.getBounds()
  const pig = lastPigWindow ?? { x: WINDOW_PADDING, y: WINDOW_PADDING }
  dragSession = {
    cursor: screen.getCursorScreenPoint(),
    pigScreen: { x: bounds.x + pig.x, y: bounds.y + pig.y },
    lastHeartbeat: Date.now(),
  }
  // 猪被拖走了：面板打开时记下的「原位」作废，否则下一次内容变化（比如点商店）
  // 会把窗口拽回原位 —— 用户看到的「瞬移」「拖着拖着卡在原地」。
  restingPigScreen = null
  savedPigScreen = null
  dragTimer = setInterval(dragTick, 1000 / 60)
})
ipcMain.on('piggy:drag:heartbeat', event => {
  if (!fromPage(event) || dragSession === null) return
  dragSession.lastHeartbeat = Date.now()
  // 页面每次 pointermove 都会发心跳，跟着屏幕刷新走；顺手挪一次窗口，
  // 比只靠主进程定时器（Windows 上计时精度约 15.6ms）更顺。
  dragTick()
})
ipcMain.on('piggy:drag:end', event => {
  if (!fromPage(event)) return
  dragTick()
  stopDrag()
  restingPigScreen = null
})

/** 页面判断鼠标在不在猪/面板上（只在 Windows 穿透模式下生效）。 */
ipcMain.on('piggy:hit', (event, hit) => {
  if (!fromPage(event)) return
  setHit(hit === true)
})

/** 旧游戏包（0.27.2 及以前）只会发鼠标增量：照旧支持，回退版本时拖动不坏。 */
ipcMain.on('piggy:move', (event, delta) => {
  if (!fromPage(event)) return
  const dx = Number(delta?.dx)
  const dy = Number(delta?.dy)
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return
  restingPigScreen = null
  applyBounds(moveAcrossDisplays(win.getBounds(), dx, dy, screen.getAllDisplays().map(display => display.workArea)), 'move')
})

ipcMain.on('piggy:shape', (event, rects) => {
  if (lastShape.length === 0 && Array.isArray(rects) && rects.length > 0) log('first shape', JSON.stringify(rects))
  if (!fromPage(event) || !Array.isArray(rects)) return
  lastShape = rects
  applyShape(rects.slice(0, 64).map(r => ({
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
  quitting = true
  stopDrag()
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
  quitting = true
  stopDrag()
  try { host?.dispose() } catch { /* best effort */ }
  // Testing runs one launch at a time; the next one is started by hand.
  if (process.env.PIGGY_CAPTURE) return app.exit(0)
  relaunch()
  app.exit(0)
}

// ---- 更新 App（页面里的 tabs/update.js）通过这几个口子调用 ----
let releases = []
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
ipcMain.handle('piggy:shell:status', event => (fromPage(event) ? shellUpdates?.status() : null))
ipcMain.handle('piggy:shell:download', async (event, version) => {
  if (!fromPage(event) || shellUpdates === null) return { ok: false, reason: '桌面外壳更新不可用' }
  // 预览版里的外壳也能下：只有在用预览版游戏的人，页面才会把它列出来。
  const target = releases.find(release => release.latestShell === version && release.shellUpdate)
  if (target === undefined) return { ok: false, reason: '版本列表过期了，点上面的「刷新」再试一次' }
  return shellUpdates.download(version, target.prerelease === true)
})
ipcMain.handle('piggy:shell:install', event => {
  if (!fromPage(event) || shellUpdates === null || shellUpdates.status().readyVersion === null) return { ok: false, reason: '还没有下载好桌面外壳' }
  if (process.env.PIGGY_CAPTURE) return { ok: false, reason: '截图测试不会安装更新' }
  backupSave('shell-v' + shellUpdates.status().readyVersion)
  setTimeout(() => {
    try { shellUpdates?.install() } catch (error) { log('shell update install failed', String(error)) }
  }, 600)
  return { ok: true }
})
ipcMain.handle('piggy:quit', (event) => { if (fromPage(event)) app.quit() })
ipcMain.handle('piggy:open', (event, url) => {
  // Only this repo's own pages: the release notes and installers.
  if (fromPage(event) && typeof url === 'string' && url.startsWith(RELEASES_PAGE.replace(/\/releases$/, '/'))) shell.openExternal(url)
})

app.whenReady().then(async () => {
  if (needsX11) return
  log('start', app.getVersion(), process.platform, process.env.XDG_SESSION_TYPE ?? '')
  shellUpdates = createShellUpdates({
    mode: shellUpdateMode({ platform: process.platform, packaged: app.isPackaged,
      portable: Boolean(process.env.PORTABLE_EXECUTABLE_FILE), appImage: process.env.APPIMAGE }),
    currentVersion: app.getVersion(), updater: autoUpdater,
    onProgress: fraction => { if (win !== null && !win.isDestroyed()) win.webContents.send('piggy:shell-progress', fraction) },
  })
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
  const reclamp = () => {
    if (win === null || win.isDestroyed()) return
    const bounds = win.getBounds()
    applyBounds(clampBounds(bounds, workAreaFor(bounds)), 'display')
  }
  screen.on('display-metrics-changed', reclamp)
  screen.on('display-added', reclamp)
  screen.on('display-removed', reclamp)
  win.webContents.on('did-finish-load', () => pushGeometry())
  pushGeometry()
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

// 兜底：主进程里漏网的异常只写日志，不弹「A JavaScript error occurred」那种错误框吓人。
process.on('uncaughtException', error => { log('uncaught', error?.stack ?? String(error)) })

app.on('second-instance', () => win?.showInactive())
app.on('before-quit', () => { quitting = true; stopDrag(); try { host?.dispose() } catch { /* best effort */ } })
app.on('window-all-closed', () => app.quit())
