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
