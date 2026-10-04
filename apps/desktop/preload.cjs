// 桌面版的页面桥：页面只能通过这几个口子跟主进程说话。
const { contextBridge, ipcRenderer } = require('electron')

/** 最近一次主进程报来的窗口与工作区（同步读，页面随时能用）。 */
let geometry = null

contextBridge.exposeInMainWorld('piggyShell', {
  /** 内容（猪 + 面板 + 气泡）的外接框：主进程据此把窗口调成那么大，并抠出可点区域。 */
  setContent: (content, immediate = false) => {
    if (!immediate) { ipcRenderer.send('piggy:content', content); return }
    const next = ipcRenderer.sendSync('piggy:content', { ...content, immediate: true })
    if (next && next.window && next.workArea) geometry = next
  },
  /** Windows 穿透模式：鼠标进出猪/面板时告诉主进程要不要接点击。 */
  setHit: hit => ipcRenderer.send('piggy:hit', hit === true),
  /** Which parts of the window the pig occupies; everything else lets clicks through. */
  setShape: rects => ipcRenderer.send('piggy:shape', rects),
  /** Main process samples the cursor at 60 Hz from this pointer-down origin. */
  beginDrag: pig => ipcRenderer.send('piggy:drag:start', pig ?? null),
  /** 新游戏包：页面算好窗口位置大小和可点区域，主进程照做，同步返回新几何。 */
  place: request => {
    const next = ipcRenderer.sendSync('piggy:place', request)
    if (next && next.window && next.workArea) geometry = next
    return next
  },
  dragHeartbeat: () => ipcRenderer.send('piggy:drag:heartbeat'),
  endDrag: () => ipcRenderer.send('piggy:drag:end'),
  /** 旧游戏包（0.27.2 及以前）的拖动：只发鼠标增量。 */
  moveBy: (dx, dy) => ipcRenderer.send('piggy:move', { dx: Number(dx) || 0, dy: Number(dy) || 0 }),
  /** 平台：macOS 没有 setShape，收起时不能预留透明区域（会挡住桌面点击）。 */
  platform: typeof process === 'undefined' ? '' : process.platform,
  /** 主进程推来的窗口/工作区几何：面板朝屏幕里侧开要用。 */
  geometry: () => geometry,
  /** 页面挂载完主动要一次几何（did-finish-load 可能早于订阅）。 */
  askGeometry: () => ipcRenderer.send('piggy:geometry:ask'),
  onGeometry: callback => {
    ipcRenderer.on('piggy:geometry', (event, info) => {
      if ((info?.seq ?? 0) < (geometry?.seq ?? 0)) return
      geometry = info
      callback(info)
    })
  },
  /** 更新 App: versions on GitHub, switching between them, and going back. */
  updates: {
    current: () => ipcRenderer.invoke('piggy:updates:current'),
    list: () => ipcRenderer.invoke('piggy:updates:list'),
    install: version => ipcRenderer.invoke('piggy:updates:install', String(version)),
    rollback: () => ipcRenderer.invoke('piggy:updates:rollback'),
    onProgress: callback => { ipcRenderer.on('piggy:progress', (event, fraction) => callback(fraction)) },
  },
  shellUpdates: {
    status: () => ipcRenderer.invoke('piggy:shell:status'),
    download: version => ipcRenderer.invoke('piggy:shell:download', String(version)),
    install: () => ipcRenderer.invoke('piggy:shell:install'),
    onProgress: callback => { ipcRenderer.on('piggy:shell-progress', (event, fraction) => callback(fraction)) },
  },
  openPage: url => ipcRenderer.invoke('piggy:open', String(url)),
  /** 主屏「退出」：存好档再关。 */
  quit: () => ipcRenderer.invoke('piggy:quit'),
})
