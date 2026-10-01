// 桌面版的页面桥：页面只能通过这几个口子跟主进程说话。
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('piggyShell', {
  /** Which parts of the window the pig occupies; everything else lets clicks through. */
  setShape: rects => ipcRenderer.send('piggy:shape', rects),
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
