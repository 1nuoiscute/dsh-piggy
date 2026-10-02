// @ts-check
/**
 * 更新 App：桌面版可以下载、换版本和回滚；DSH 插件只提示 GitHub 新版本。
 *
 * 版本列表一格一个方块，点一个下面出详情卡（更新说明、能不能换、按钮）。
 * 读写都经过桌面版的 window.piggyShell.updates，不走游戏的路由。
 * @module dsh-piggy/client/tabs/update
 */

import { button, el } from '../dom.js'
import { tile, tileGrid } from '../widgets.js'

/** One panel per page, so the update state can live here. */
/** @type {any} */
var state = {
  current: null, list: null, error: null, loading: false,
  pick: null, busy: null, fraction: 0, message: null, listening: false,
  shellStatus: null, shellBusy: false, shellReady: null, shellFraction: 0, shellMessage: null, shellListening: false,
}

/** The desktop bridge, or null inside DSH. */
export function updatesBridge() {
  var shell = /** @type {any} */ (window).piggyShell
  return shell && shell.updates ? shell : null
}

function refresh(ui) {
  var shell = updatesBridge()
  if (shell === null || state.loading) return
  state.loading = true
  state.error = null
  if (!state.listening) {
    state.listening = true
    shell.updates.onProgress(function (fraction) { state.fraction = fraction; ui.renderContent() })
  }
  if (shell.shellUpdates && !state.shellListening) {
    state.shellListening = true
    shell.shellUpdates.onProgress(function (fraction) { state.shellFraction = fraction; ui.renderContent() })
  }
  Promise.all([shell.updates.current(), shell.updates.list(), shell.shellUpdates ? shell.shellUpdates.status() : null]).then(function (got) {
    state.current = got[0]
    if (got[1] && got[1].ok) state.list = got[1].releases
    else state.error = (got[1] && got[1].reason) || '没问到'
    state.shellStatus = got[2]
  }, function () { state.error = '没问到' }).then(function () {
    state.loading = false
    ui.renderContent()
  })
}

function downloadShell(ui, version) {
  var shell = updatesBridge()
  if (!shell || !shell.shellUpdates || state.shellBusy) return
  state.shellBusy = true
  state.shellFraction = 0
  state.shellMessage = null
  ui.renderContent()
  shell.shellUpdates.download(version).then(function (result) {
    if (result.ok) {
      state.shellReady = result.version
      state.shellMessage = '外壳已下载，重启猪猪后安装。存档会先备份。'
    } else state.shellMessage = result.reason || '外壳下载失败'
    state.shellBusy = false
    ui.renderContent()
  }, function (error) {
    state.shellBusy = false
    state.shellMessage = String(error)
    ui.renderContent()
  })
}

function installShell(ui) {
  var shell = updatesBridge()
  if (!shell || !shell.shellUpdates) return
  shell.shellUpdates.install().then(function (result) {
    if (!result.ok) { state.shellMessage = result.reason; ui.renderContent() }
  })
}

function shellManualReason(mode) {
  if (mode === 'portable') return 'Windows 便携版需要下载并替换旧 EXE。'
  if (mode === 'unsigned-mac') return 'macOS 包暂未签名，无法在应用内自动更新；请下载 DMG 并替换应用。'
  if (mode === 'manual') return '这种 Linux 安装方式需要从发布页下载新包。'
  return '当前版本还不支持应用内更新外壳，需要手动安装一次新版。'
}

function install(ui, version) {
  var shell = updatesBridge()
  if (shell === null) return
  state.busy = version
  state.fraction = 0
  state.message = null
  ui.renderContent()
  shell.updates.install(version).then(function (result) {
    state.message = result.ok ? '换好了，猪马上回来…' : result.reason
    if (!result.ok) state.busy = null
    ui.renderContent()
  })
}

function rollback(ui) {
  var shell = updatesBridge()
  if (shell === null) return
  state.busy = 'rollback'
  ui.renderContent()
  shell.updates.rollback().then(function (result) {
    state.message = result.ok ? '回去了，猪马上回来…' : result.reason
    if (!result.ok) state.busy = null
    ui.renderContent()
  })
}

export function renderUpdateTab(ui) {
  if (updatesBridge() === null) {
    renderDshUpdate(ui)
    return
  }
  if (state.current === null && state.list === null && state.error === null) refresh(ui)
  var cur = state.current
  var head = el('div', 'dp-pick dp-tile-card dp-update-now')
  head.appendChild(el('div', 'dp-pick-head', cur === null ? '正在看现在的版本…'
    : '游戏 v' + cur.version + (cur.bundled ? '（安装包自带）' : '')))
  if (cur !== null) head.appendChild(el('div', 'dp-dim', '桌面外壳 v' + cur.shell + ' · 游戏玩法和窗口功能分别更新'))
  if (state.message !== null) head.appendChild(el('div', 'dp-req', state.message))
  var shellRelease = state.list === null ? null : state.list.find(function (r) { return r.shellUpdate && !r.prerelease }) || null
  if (shellRelease !== null) {
    var shellVersion = shellRelease.latestShell
    var mode = state.shellStatus && state.shellStatus.mode
    head.appendChild(el('div', 'dp-req', '桌面外壳 v' + cur.shell + ' → v' + shellVersion))
    if (mode !== 'automatic') head.appendChild(el('div', 'dp-dim', shellManualReason(mode)))
    if (state.shellMessage !== null) head.appendChild(el('div', 'dp-req', state.shellMessage))
    if (state.shellBusy) head.appendChild(el('div', 'dp-dim', '正在下载桌面外壳 ' + Math.round(state.shellFraction * 100) + '%'))
    var shellGo = button('dp-btn dp-btn-wide', { 'data-update-shell': shellRelease.version }, function () {
      if (mode !== 'automatic') updatesBridge().openPage(shellRelease.page)
      else if (state.shellReady === shellVersion) installShell(ui)
      else downloadShell(ui, shellVersion)
    })
    shellGo.textContent = mode !== 'automatic' ? '打开发布页下载' : state.shellReady === shellVersion ? '重启并安装桌面外壳' : '下载桌面外壳 v' + shellVersion
    shellGo.disabled = state.shellBusy || state.busy !== null
    head.appendChild(shellGo)
  }
  if (state.busy !== null && state.message === null) {
    head.appendChild(el('div', 'dp-dim', state.busy === 'rollback' ? '正在换回去…' : '下载中 ' + Math.round(state.fraction * 100) + '%'))
  }
  var latest = state.list === null ? null : state.list.find(function (r) { return r.blocked === null && !r.prerelease }) || null
  if (latest !== null && cur !== null && !latest.current) {
    var up = button('dp-btn dp-btn-wide', { 'data-update-latest': latest.version }, function () { install(ui, latest.version) })
    up.textContent = '⬆️ 更新到最新 v' + latest.version
    up.disabled = state.busy !== null
    head.appendChild(up)
  } else if (latest !== null) {
    head.appendChild(el('div', 'dp-req dp-req-ok', '✓ 已经是最新'))
  }
  ui.content.appendChild(head)

  if (state.loading && state.list === null) ui.content.appendChild(el('div', 'dp-empty', '正在问 GitHub…'))
  if (state.error !== null) {
    ui.content.appendChild(el('div', 'dp-empty', state.error))
    var again = button('dp-btn dp-btn-wide', { 'data-update-retry': '' }, function () { refresh(ui) })
    again.textContent = '再试一次'
    ui.content.appendChild(again)
  }
  if (state.list !== null) renderList(ui, state.list)

  if (cur !== null && cur.previous !== null) {
    var back = button('dp-btn dp-btn-wide dp-update-back', { 'data-update-rollback': '' }, function () { rollback(ui) })
    back.textContent = '↩️ 回到上一个版本 v' + cur.previous
    back.disabled = state.busy !== null
    ui.content.appendChild(back)
  }
}

/** DSH cannot replace plugin files safely; it only points to the new release. */
function renderDshUpdate(ui) {
  var notice = ui.updateNotice
  var head = el('div', 'dp-pick dp-tile-card dp-update-now')
  head.appendChild(el('div', 'dp-pick-head', '现在 v' + (ui.view.version || '未知')))
  head.appendChild(el('div', 'dp-dim', 'DSH 插件只提醒新版本，不会自动改动本地文件。'))
  ui.content.appendChild(head)
  if (notice === null || notice === undefined) return
  if (!notice.checked && !notice.checking && notice.error === null) notice.check()
  if (notice.checking) {
    ui.content.appendChild(el('div', 'dp-empty', '正在问 GitHub…'))
    return
  }
  if (notice.error !== null) {
    ui.content.appendChild(el('div', 'dp-empty', notice.error))
    var retry = button('dp-btn dp-btn-wide', { 'data-update-retry': '' }, function () { notice.check() })
    retry.textContent = '再试一次'
    ui.content.appendChild(retry)
    return
  }
  var release = notice.remote
  if (release === null) return
  if (notice.latest === null) {
    ui.content.appendChild(el('div', 'dp-req dp-req-ok', '✓ 已经是最新'))
    return
  }
  var box = el('div', 'dp-pick dp-tile-card dp-update-detail')
  box.appendChild(el('div', 'dp-pick-head', '发现新版本 v' + release.version))
  if (release.notes) box.appendChild(el('div', 'dp-update-notes', release.notes))
  var go = button('dp-btn dp-btn-wide', { 'data-update-page': release.version }, function () {
    window.open(release.page, '_blank', 'noopener')
  })
  go.textContent = '打开发布页'
  box.appendChild(go)
  ui.content.appendChild(box)
}

/** Every version as a tile; the picked one opens its notes and button below. */
function renderList(ui, list) {
  if (list.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', 'GitHub 上还没有能热更新的版本'))
    return
  }
  var grid = tileGrid()
  var picked = null
  for (var i = 0; i < list.length; i += 1) {
    (function (release, first) {
      var active = state.pick === release.version
      if (active) picked = release
      grid.appendChild(tile({
        emoji: release.current ? '🐖' : '📦', label: 'v' + release.version, color: 'lime', soft: true, active: active,
        note: release.date, badge: first && release.blocked === null ? '新' : '',
        tag: release.current ? '在用' : release.blocked !== null ? '🔒' : '', dim: release.blocked !== null,
        data: { 'data-release': release.version },
        onPick: function () { state.pick = active ? null : release.version; ui.renderContent() },
      }))
    })(list[i], i === 0)
  }
  ui.content.appendChild(grid)
  if (picked !== null) ui.content.appendChild(details(ui, picked))
}

function details(ui, release) {
  var box = el('div', 'dp-pick dp-tile-card dp-update-detail')
  box.appendChild(el('div', 'dp-pick-head', 'v' + release.version + (release.date ? ' · ' + release.date : '') + (release.prerelease ? ' · 预览版' : '')))
  if (release.notes) box.appendChild(el('div', 'dp-update-notes', release.notes))
  var go = button('dp-btn dp-btn-wide', { 'data-update-install': release.version }, function () {
    if (release.blocked === 'shell') updatesBridge().openPage(release.page)
    else install(ui, release.version)
  })
  if (release.current) {
    go.textContent = '正在用这个'
    go.disabled = true
  } else if (release.blocked === 'shell') {
    box.appendChild(el('div', 'dp-req', '✗ 游戏 v' + release.version + ' 要求桌面外壳至少 v' + release.minShell))
    go.textContent = state.shellStatus && state.shellStatus.mode === 'automatic' ? '先更新上面的桌面外壳' : '去下载新安装包'
    if (state.shellStatus && state.shellStatus.mode === 'automatic') go.disabled = true
  } else if (release.blocked === 'save') {
    box.appendChild(el('div', 'dp-req', '✗ 存档太新，这个版本读不了'))
    go.textContent = '换不了'
    go.disabled = true
  } else {
    go.textContent = '换到这个版本'
    go.disabled = state.busy !== null
  }
  box.appendChild(go)
  return box
}
