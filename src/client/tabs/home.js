// @ts-check
/**
 * 主屏（B9，照动森手机）：打开面板先看到一格格 App 方块，点进去是那个页签，
 * 页签顶上「‹」回主屏。原来挂在底部图标上的提醒，改挂在方块左上角。
 * @module dsh-piggy/client/tabs/home
 */

import { el } from '../dom.js'
import { tile, tileGrid } from '../widgets.js'

/** One colour per app, so the home screen reads at a glance. */
var APP_COLOR = {
  status: 'green', card: 'pink', crown: 'purple', study: 'yellow', work: 'orange',
  shop: 'red', travel: 'blue', bag: 'teal', update: 'lime', quit: 'peach', dev: 'brown',
}

/** The home screen: who the pig is, its money, and one tile per app. */
export function renderHome(ui, apps) {
  var p = ui.view.pig
  var head = el('div', 'dp-title')
  head.appendChild(el('b', null, p.name + (p.sex !== null ? ' ' + p.sex.symbol : '') + ' Lv.' + p.level.level))
  head.appendChild(el('span', null, '🪙 ' + p.coins))
  ui.content.appendChild(head)
  var grid = tileGrid()
  for (var i = 0; i < apps.length; i += 1) {
    (function (app) {
      grid.appendChild(tile({
        emoji: app.emoji, label: app.label, color: APP_COLOR[app.key] ?? 'blue',
        tag: alertFor(ui, app.key),
        data: { 'data-app': app.key },
        onPick: function () { ui.select(app.key) },
      }))
    })(apps[i])
  }
  ui.content.appendChild(grid)
}

/**
 * The little word on an app's corner: what needs looking at in there. The
 * status app speaks for the pig itself (gone, ill, out); the others reuse the
 * alerts the panel already works out for the hidden icon bar.
 */
function alertFor(ui, key) {
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
    ui.select('home')
  })
  row.appendChild(back)
  row.appendChild(el('b', 'dp-drill-title', app.emoji + ' ' + app.label))
  if (info) row.appendChild(el('span', 'dp-drill-info', info))
  ui.content.appendChild(row)
}
