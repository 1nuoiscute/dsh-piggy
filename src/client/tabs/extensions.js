// @ts-check
/**
 * 「扩展」App（设计见 docs/design/extension-center.md、docs/design/extension-download.md）。
 *
 * 上半「本地扩展」：已安装的扩展，每个可以开关、删除（删除先在卡片里确认一次，清掉它的数据）。
 * 下半「在线扩展」：从 GitHub 上的扩展目录读；删掉的内置扩展在这里「重新安装」，
 * 我们发布的新扩展在这里「下载」。
 * 下载来的扩展自己的 App 页（页签 ext:<key>）也从这里转出去。
 */
import { button, el } from '../dom.js'
import { renderDownloadedApp } from '../ext-apps.js'
import { arr, obj, str } from '../values.js'

/** 正在确认删除哪个扩展。 */
var confirming = null
/** 在线目录：loading / 读到的 / 出错。 */
var online = { loading: false, loaded: false, error: '', entries: /** @type {any[]} */ ([]) }

/** 关掉时会顺带收尾的事，提前写在卡片上。 @param {any} view @param {string} key */
function closingNote(view, key) {
  if (key === 'pomodoro' && view.pomodoro !== null && view.pomodoro.active) return '正在专注：关掉会放弃这一个，不给奖励'
  if (key === 'fishing' && view.activity?.kind === 'fishing') return '猪正在外面钓鱼：关掉会把它叫回来，鱼饵退回'
  return ''
}

/** 删掉会清什么，确认时说清楚。 */
var CLEARS = { pomodoro: '今天和累计的番茄数', fishing: '鱼篓里的鱼、图鉴里的鱼、背包里的鱼饵' }

function loadOnline(ui, force) {
  if (online.loading || typeof fetch !== 'function') return
  online.loading = true
  fetch('/dsh-piggy/extensions/online' + (force ? '?force=1' : ''), { cache: 'no-store' })
    .then(function (response) { return response.json() })
    .then(function (data) {
      var body = obj(data)
      online = { loading: false, loaded: true, error: str(body.error, ''), entries: arr(body.entries).filter(function (entry) { return typeof obj(entry).key === 'string' }) }
    })
    .catch(function () { online = { loading: false, loaded: true, error: '连不上', entries: online.entries } })
    .then(function () { if (ui.tab === 'extensions') ui.renderContent() })
}

export function renderExtensionsTab(ui) {
  if (String(ui.tab).startsWith('ext:')) { renderDownloadedApp(ui, String(ui.tab).slice(4)); return }
  if (!online.loaded) loadOnline(ui, false)
  ui.content.appendChild(el('div', 'dp-ext-intro', '用不上的玩法可以关掉，数据留着随时恢复；删除会连数据一起清掉，以后可以在下面重新装。'))

  ui.content.appendChild(el('div', 'dp-ext-section', '本地扩展'))
  var local = ui.view.extensions.filter(function (extension) { return extension.installed })
  if (local.length === 0) ui.content.appendChild(el('div', 'dp-ext-later', '一个扩展都没装'))
  for (var i = 0; i < local.length; i += 1) ui.content.appendChild(localCard(ui, local[i]))

  var head = el('div', 'dp-ext-section dp-ext-online-head')
  head.appendChild(el('span', null, '在线扩展'))
  var refresh = button('dp-mini dp-mini-plain', { 'data-ext-refresh': 'true' }, function () { loadOnline(ui, true); ui.renderContent() })
  refresh.textContent = online.loading ? '读取中…' : '🔄 刷新'
  refresh.disabled = online.loading
  head.appendChild(refresh)
  ui.content.appendChild(head)
  renderOnline(ui)
}

function localCard(ui, extension) {
  var card = el('div', 'dp-set dp-ext-card')
  card.setAttribute('data-extension', extension.key)
  var head = el('div', 'dp-set-head')
  head.appendChild(el('span', 'dp-ext-emoji', extension.emoji))
  head.appendChild(el('b', null, extension.label + (extension.builtin ? '' : ' ' + extension.version)))
  if (extension.description) head.appendChild(el('small', 'dp-dim', extension.description))
  card.appendChild(head)
  var note = extension.on ? closingNote(ui.view, extension.key) : ''
  if (note) card.appendChild(el('div', 'dp-ext-note', note))
  if (extension.error) card.appendChild(el('div', 'dp-ext-note', '加载出错：' + extension.error))
  var newer = online.entries.find(function (entry) { return entry.key === extension.key && entry.update === true })

  // 开关和删除并排放在卡片左下（rc.1 反馈）。
  var row = el('div', 'dp-ext-actions')
  var toggle = button('dp-switch', { 'data-extension-toggle': extension.key, 'aria-pressed': String(extension.on) }, function () {
    ui.send('setExtension', { key: extension.key, on: !extension.on })
  })
  toggle.appendChild(el('span', 'dp-switch-knob'))
  toggle.appendChild(el('span', 'dp-switch-text', extension.on ? '开' : '关'))
  row.appendChild(toggle)
  if (newer) {
    var update = button('dp-mini', { 'data-ext-update': extension.key }, function () {
      online.loaded = false
      ui.send('installExtension', { key: extension.key })
    })
    update.textContent = '更新到 ' + str(newer.version, '')
    row.appendChild(update)
  }
  if (confirming === extension.key) {
    row.appendChild(el('span', 'dp-ext-warn', '删掉会清空' + (CLEARS[extension.key] ?? '它的数据') + '，确定吗？'))
    var yes = button('dp-mini dp-ext-danger', { 'data-ext-remove-yes': extension.key }, function () {
      confirming = null
      online.loaded = false
      ui.send('removeExtension', { key: extension.key })
    })
    yes.textContent = '删除'
    var no = button('dp-mini dp-mini-plain', { 'data-ext-remove-no': extension.key }, function () { confirming = null; ui.renderContent() })
    no.textContent = '算了'
    row.appendChild(yes)
    row.appendChild(no)
  } else {
    var remove = button('dp-mini dp-mini-plain dp-ext-remove', { 'data-ext-remove': extension.key }, function () { confirming = extension.key; ui.renderContent() })
    remove.textContent = '删除'
    row.appendChild(remove)
  }
  card.appendChild(row)
  return card
}

function renderOnline(ui) {
  if (!online.loaded) { ui.content.appendChild(el('div', 'dp-ext-later', '正在读取在线扩展……')); return }
  var installed = {}
  for (var i = 0; i < ui.view.extensions.length; i += 1) if (ui.view.extensions[i].installed) installed[ui.view.extensions[i].key] = true
  var entries = online.entries.filter(function (entry) { return !installed[entry.key] })
  if (online.error && entries.length === 0) { ui.content.appendChild(el('div', 'dp-ext-later', '读不到在线扩展目录（' + online.error + '），稍后点刷新')); return }
  if (entries.length === 0) { ui.content.appendChild(el('div', 'dp-ext-later', '在线的扩展都装好了，以后有新的会出现在这里')); return }
  for (var k = 0; k < entries.length; k += 1) {
    (function (entry) {
      var card = el('div', 'dp-set dp-ext-card')
      card.setAttribute('data-online-extension', entry.key)
      var head = el('div', 'dp-set-head')
      head.appendChild(el('span', 'dp-ext-emoji', str(entry.emoji, '🧩')))
      head.appendChild(el('b', null, str(entry.label, entry.key) + (entry.builtin ? ' · 内置' : ' ' + str(entry.version, ''))))
      var get = button('dp-mini', { 'data-ext-install': entry.key }, function () {
        online.loaded = false
        ui.send('installExtension', { key: entry.key })
      })
      get.textContent = entry.builtin ? '重新安装' : '下载'
      get.disabled = entry.blocked !== null && entry.blocked !== undefined
      head.appendChild(get)
      if (entry.description) head.appendChild(el('small', 'dp-dim', str(entry.description, '')))
      card.appendChild(head)
      if (entry.blocked === 'game-too-old') card.appendChild(el('div', 'dp-ext-note', '需要游戏 v' + str(entry.minGame, '') + '，先更新游戏'))
      else if (entry.builtin) card.appendChild(el('div', 'dp-ext-note', '代码在游戏里，装回来不用下载，从零开始'))
      ui.content.appendChild(card)
    })(entries[k])
  }
}
