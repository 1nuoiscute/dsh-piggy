// @ts-check
/**
 * 页签共用的小组件：属性条、道具选择器、效果行。
 *
 * 只负责画，不决定业务规则。
 * @module dsh-pig/client/widgets
 */

import { button, el, meter } from './dom.js'
import { num } from './values.js'

export function labelledBar(ui, label, value, valueText, variant) {
  var row = el('div', 'dp-row')
  row.appendChild(el('span', null, label))
  row.appendChild(el('b', null, valueText))
  ui.content.appendChild(row)
  ui.content.appendChild(meter(value, variant))
}

export function pickerPanel(ui, action) {
  var wrap = el('div', 'dp-pick')
  var asks = { feed: '喂点什么？', bathe: '用哪个洗澡？', play: '拿哪个玩具？' }
  wrap.appendChild(el('div', 'dp-pick-head', asks[action] ?? '用哪个？'))
  var list = el('div', 'dp-list')
  var shelf = ui.view.care[action] ?? []
  for (var i = 0; i < shelf.length; i += 1) {
    (function (item) {
      var row = el('div', 'dp-item')
      row.appendChild(el('span', null, item.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, item.label + (item.default ? '（自带）' : ' ×' + num(item.count, 0))))
      grow.appendChild(el('div', 'dp-dim', careEffectLine(action, item)))
      row.appendChild(grow)
      var use = button('dp-mini', { 'data-care': action + ':' + item.key }, function () {
        ui.picker = null
        ui.send(action, { item: item.key })
      })
      use.textContent = '用'
      row.appendChild(use)
      list.appendChild(row)
    })(shelf[i])
  }
  wrap.appendChild(list)
  var cancel = button('dp-cancel', {}, function () { ui.picker = null; ui.renderContent() })
  cancel.textContent = '算了'
  wrap.appendChild(cancel)
  return wrap
}

export function careEffectLine(action, item) {
  var parts = []
  if (action === 'feed') {
    parts.push('饱食 +' + item.satiety)
    if (item.happiness) parts.push('心情 +' + item.happiness)
  } else if (action === 'bathe') {
    parts.push('清洁 +' + item.cleanliness)
    if (item.happiness) parts.push('心情 +' + item.happiness)
  } else {
    parts.push('心情 +' + item.happiness)
    if (item.satiety) parts.push('饱食 ' + item.satiety)
  }
  return parts.join(' · ')
}

// ---------------------------------------------------------------------------
// 方块（动森手机那种）：学习 / 商店 / 背包的两层都用它（B8，用户 2026-10-01）。
// 第一层是彩色大方块；点进去整屏换成第二层，左上角「‹ 返回」。
// ---------------------------------------------------------------------------

/** The grid tiles sit in: always three columns. */
export function tileGrid() {
  return el('div', 'dp-tiles')
}

/**
 * One tile: a coloured rounded square with a big emoji, one short line under
 * it, an optional second line, a count in the top-right corner and a small
 * tag in the top-left. `soft` is the paler second-layer look.
 * @param {{ emoji: string, label: string, color: string, note?: string, badge?: string, tag?: string,
 *   soft?: boolean, locked?: boolean, dim?: boolean, disabled?: boolean, active?: boolean,
 *   data?: Record<string, string>, onPick: () => void }} spec
 */
export function tile(spec) {
  var node = button('dp-tile' + (spec.soft ? ' dp-tile-soft' : ''), spec.data ?? {}, function () { spec.onPick() })
  node.setAttribute('data-color', spec.color)
  if (spec.locked) node.setAttribute('data-locked', 'true')
  if (spec.dim) node.setAttribute('data-dim', 'true')
  if (spec.active) node.setAttribute('data-active', 'true')
  if (spec.disabled === true) node.disabled = true
  var icon = el('span', 'dp-tile-icon')
  icon.appendChild(el('span', 'dp-tile-e', spec.emoji))
  if (spec.badge) icon.appendChild(el('b', 'dp-tile-badge', spec.badge))
  if (spec.tag) icon.appendChild(el('b', 'dp-tile-tag', spec.tag))
  node.appendChild(icon)
  node.appendChild(el('span', 'dp-tile-n', spec.label))
  if (spec.note) node.appendChild(el('span', 'dp-tile-note', spec.note))
  return node
}

/**
 * Open a category (or go back with `key` null). The new layer starts at the
 * top: the old scroll offset belonged to a different screen.
 * @param {object} ui
 * @param {'study'|'shop'|'bag'|'work'} tab
 * @param {string|null} key
 */
export function drillTo(ui, tab, key) {
  ui.drill[tab] = key
  ui.drill.pick = null
  ui.renderContent()
  ui.content.scrollTop = 0
}

/**
 * The second layer's top row: 「‹」 back, the category's name, and one grey
 * line of what is true for everything in it (so no tile has to repeat it).
 */
export function drillHeader(ui, tab, title, info) {
  var row = el('div', 'dp-drill')
  var back = button('dp-drill-back', { 'data-back': tab }, function () { drillTo(ui, tab, null) })
  back.textContent = '‹'
  row.appendChild(back)
  row.appendChild(el('b', 'dp-drill-title', title))
  if (info) row.appendChild(el('span', 'dp-drill-info', info))
  ui.content.appendChild(row)
}
