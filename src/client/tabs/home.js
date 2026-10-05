// @ts-check
/**
 * 主屏（B9，照动森手机）：打开面板先看到一格格 App 方块，点进去是那个页签，
 * 页签顶上「‹」回主屏。原来挂在底部图标上的提醒，改挂在方块左上角。
 * @module dsh-piggy/client/tabs/home
 */

import { button, el } from '../dom.js'
import { tile, tileGrid } from '../widgets.js'
import { appIcon } from '../icon-style.js'
import { extensionUpdateAvailable } from './extensions.js'

/** One colour per app, so the home screen reads at a glance. */
var APP_COLOR = {
  status: 'green', card: 'pink', dex: 'purple', skins: 'purple', study: 'yellow', work: 'orange',
  shop: 'red', travel: 'blue', bag: 'teal', pomodoro: 'red', fishing: 'blue', settings: 'peach', update: 'lime', quit: 'peach', dev: 'brown',
}

/** 新 App 统一排在设置之前，末尾顺序不依赖注册或拼接时机。 */
export function orderHomeApps(apps) {
  const rank = key => key === 'dev' ? 4 : key === 'settings' ? 3 : key === 'quit' ? 2 : key.startsWith('ext:') ? 1 : 0
  return apps.slice().sort((a, b) => rank(a.key) - rank(b.key))
}

/** The home screen: who the pig is, its money, and one tile per app. */
export function renderHome(ui, apps) {
  var p = ui.view.pig
  var head = el('div', 'dp-title')
  head.appendChild(el('b', null, p.name + (p.sex !== null ? ' ' + p.sex.symbol : '') + ' Lv.' + p.level.level))
  head.appendChild(el('span', null, '🪙 ' + p.coins))
  ui.content.appendChild(head)
  const pages = Math.max(1, Math.ceil(apps.length / 9))
  ui.homePage = Math.max(0, Math.min(pages - 1, ui.homePage ?? 0))
  const clip = el('div', 'dp-home-clip')
  clip.setAttribute('data-home-swipe', 'true')
  const track = el('div', 'dp-home-track')
  const grids = []
  const dots = []
  for (let page = 0; page < pages; page += 1) {
    const grid = tileGrid()
    grid.className += ' dp-home-page'
    grid.setAttribute('data-home-page', String(page))
    for (const app of apps.slice(page * 9, page * 9 + 9)) {
      grid.appendChild(tile({
        emoji: app.emoji, icon: appIcon(app.key, app.emoji, 'dp-tile-e'), label: app.label, color: APP_COLOR[app.key] ?? 'blue',
        // 更新入口收进了设置：有新正式版时设置格子冒红点（G 批次）。
        tag: app.key === 'update' || app.key === 'settings' ? '' : alertFor(ui, app.key),
        badge: app.key === 'settings' ? (alertFor(ui, 'update') || (extensionUpdateAvailable(ui) ? '!' : '')) : '',
        data: { 'data-app': app.key },
        onPick: function () { ui.select(app.key) },
      }))
    }
    grids.push(grid)
    track.appendChild(grid)
  }
  clip.appendChild(track)
  ui.content.appendChild(clip)
  let dotRow = null
  if (pages > 1) {
    dotRow = el('div', 'dp-home-dots')
    for (let page = 0; page < pages; page += 1) {
      const dot = button('dp-home-dot', { 'data-home-dot': String(page), 'aria-label': '第 ' + (page + 1) + ' 页' }, function () { showPage(page) })
      dots.push(dot)
      dotRow.appendChild(dot)
    }
    ui.content.appendChild(dotRow)
  }
  function showPage(page) {
    const next = Math.max(0, Math.min(pages - 1, page))
    ui.homePage = next
    track.style.transform = 'translateX(-' + next * 100 + '%)'
    grids.forEach((grid, index) => { grid.setAttribute('data-active', String(index === next)); grid.setAttribute('aria-hidden', String(index !== next)); grid.inert = index !== next })
    dots.forEach((dot, index) => dot.setAttribute('aria-pressed', String(index === next)))
  }
  showPage(ui.homePage)
  let startX = null
  clip.addEventListener('pointerdown', event => { startX = event.clientX })
  clip.addEventListener('pointerup', event => {
    if (startX === null || Math.abs(event.clientX - startX) <= 40) return
    event.preventDefault()
    showPage(ui.homePage + (event.clientX < startX ? 1 : -1))
    startX = null
  })
  clip.addEventListener('pointercancel', () => { startX = null })
  // 版本号（C1）：一行小灰字，不占格子；3 秒内连点 7 次解锁调试模式。
  var version = el('div', 'dp-version', 'v' + (ui.view.version === '' ? '未知' : ui.view.version))
  version.setAttribute('data-version', 'true')
  version.addEventListener('click', function (event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
    ui.tapVersion()
  })
  ui.content.appendChild(version)
}

/**
 * The little word on an app's corner: what needs looking at in there. The
 * status app speaks for the pig itself (gone, ill, out); the others reuse the
 * alerts the panel already works out for the hidden icon bar.
 */
function alertFor(ui, key) {
  if (key === 'update') return ui.updateNotice?.unread ? '!' : ''
  var p = ui.view.pig
  if (key === 'status') {
    if (ui.view.dead) return '走了'
    if (p.illness !== null) return '生病'
    if (ui.view.activity !== null) return '在外面'
    return ''
  }
  var icon = ui.icons[key]
  return icon !== undefined && icon.getAttribute('data-alert') === 'true' ? '!' : ''
}

/**
 * An app's top row: 「‹」 back to the home screen, the app's name, and one grey
 * line on the right (the shop's money, say).
 */
export function appHeader(ui, app, info) {
  var row = el('div', 'dp-drill dp-app-head')
  var back = el('button', 'dp-drill-back')
  back.setAttribute('data-home', 'true')
  back.textContent = '‹'
  back.addEventListener('click', function (event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
    ui.select(app.key === 'extensions' ? 'settings' : 'home')
  })
  row.appendChild(back)
  var title = el('b', 'dp-drill-title dp-app-title')
  title.appendChild(appIcon(app.key, app.emoji, 'dp-app-title-icon'))
  title.appendChild(el('span', null, app.label))
  row.appendChild(title)
  if (info) row.appendChild(el('span', 'dp-drill-info', info))
  ui.content.appendChild(row)
}
