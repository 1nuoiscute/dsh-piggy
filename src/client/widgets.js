// @ts-check
/**
 * 页签共用的小组件：属性条、道具选择器、效果行。
 *
 * 只负责画，不决定业务规则。
 * @module dsh-pig/client/widgets
 */

import { button, el, meter } from './dom.js'
import { num } from './values.js'

/**
 * 一个小方块（动森手游那种网格）：emoji 大、名字一行、右上角挂角标。
 *
 * 用户 2026-10-01：学段/货架/背包大类都是这种小块，点进去整屏换成下一层，
 * 左上角给「← 返回」。
 *
 * @param {{ emoji: string, label: string, badge?: string, tag?: string, note?: string,
 *   active?: boolean, locked?: boolean, dim?: boolean, disabled?: boolean,
 *   data?: Record<string, string>, onPick: () => void }} spec
 */
export function tile(spec) {
  var node = button('dp-tile'
    + (spec.active ? ' dp-tile-on' : '')
    + (spec.locked ? ' dp-tile-locked' : '')
    + (spec.dim ? ' dp-tile-dim' : ''), spec.data ?? {}, function (event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
    spec.onPick()
  })
  if (spec.disabled === true) node.disabled = true
  if (spec.badge !== undefined && spec.badge !== '') node.appendChild(el('b', 'dp-tile-badge', spec.badge))
  if (spec.tag !== undefined && spec.tag !== '') node.appendChild(el('b', 'dp-tile-tag', spec.tag))
  node.appendChild(el('span', 'dp-tile-e', spec.emoji))
  node.appendChild(el('span', 'dp-tile-n', spec.label))
  if (spec.note !== undefined && spec.note !== '') node.appendChild(el('span', 'dp-tile-note', spec.note))
  return node
}

/** The grid the tiles sit in. */
export function tileGrid() {
  return el('div', 'dp-tiles')
}

/** 「← 返回」：第二层左上角，点一下回到上一层。 */
export function backRow(text, onBack) {
  var row = el('div', 'dp-backrow')
  var back = button('dp-back', { 'data-back': 'true' }, function (event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
    onBack()
  })
  back.textContent = '← ' + text
  row.appendChild(back)
  return row
}

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
