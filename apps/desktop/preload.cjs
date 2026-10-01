// 桌面版的页面桥：页面只能通过这几个口子跟主进程说话。
const { contextBridge, ipcRenderer } = require('electron')

/** 最近一次主进程报来的窗口与工作区（同步读，页面随时能用）。 */
let geometry = null

contextBridge.exposeInMainWorld('piggyShell', {
  /** 内容（猪 + 面板 + 气泡）的外接框：主进程据此把窗口调成那么大，并抠出可点区域。 */
  setContent: content => ipcRenderer.send('piggy:content', content),
  /** Which parts of the window the pig occupies; everything else lets clicks through. */
  setShape: rects => ipcRenderer.send('piggy:shape', rects),
  /** 拖动：窗口按屏幕坐标跟着鼠标走（页面里不动位置）。 */
  moveBy: (dx, dy) => ipcRenderer.send('piggy:move', { dx: Number(dx) || 0, dy: Number(dy) || 0 }),
  /** 主进程推来的窗口/工作区几何：面板朝屏幕里侧开要用。 */
  geometry: () => geometry,
  onGeometry: callback => {
    ipcRenderer.on('piggy:geometry', (event, info) => { geometry = info; callback(info) })
  },
  /** 更新 App: versions on GitHub, switching between them, and going back. */
  updates: {
    current: () => ipcRenderer.invoke('piggy:updates:current'),
    list: () => ipcRenderer.invoke('piggy:updates:list'),
    install: version => ipcRenderer.invoke('piggy:updates:install', String(version)),
    rollback: () => ipcRenderer.invoke('piggy:updates:rollback'),
    onProgress: callback => { ipcRenderer.on('piggy:progress', (event, fraction) => callback(fraction)) },
  },
  openPage: url => ipcRenderer.invoke('piggy:open', String(url)),
  /** 主屏「退出」：存好档再关。 */
  quit: () => ipcRenderer.invoke('piggy:quit'),
})
