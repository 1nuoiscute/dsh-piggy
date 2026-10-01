// 桌面版的页面桥：页面只能通过这几个口子跟主进程说话。
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('piggyShell', {
  /** Which parts of the window the pig occupies; everything else lets clicks through. */
  setShape: rects => ipcRenderer.send('piggy:shape', rects),
})
