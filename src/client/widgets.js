// @ts-check
/**
 * 页签共用的小组件：属性条、道具选择器、效果行。
 *
 * 只负责画，不决定业务规则。
 * @module dsh-pig/client/widgets
 */

import { button, el, meter } from './dom.js'

/**
 * 折叠分组：默认收起，点标题展开，再点收起；同一个区域同时只开一个。
 *
 * 用户 2026-10-01：列表默认只该看到几个大类标题，细节点开才看到，
 * 这样一屏不用堆一大段字。
 *
 * @param {object} ui
 * @param {string} key - 区域内的唯一 key（如 `shop:food`）
 * @param {string} title - 标题行（emoji + 名字 + 数量）
 * @param {(body: object) => void} paint - 展开时往 body 里画内容
 */
export function section(ui, key, title, paint) {
  var open = ui.openSection === key
  var head = button('dp-section' + (open ? ' dp-section-open' : ''), { 'data-section': key }, function (event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
    ui.openSection = open ? null : key
    ui.renderContent()
  })
  head.appendChild(el('span', 'dp-section-t', title))
  head.appendChild(el('b', 'dp-section-c', open ? '收起' : '展开'))
  ui.content.appendChild(head)
  if (!open) return
  var body = el('div', 'dp-section-body')
  paint(body)
  ui.content.appendChild(body)
}
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
