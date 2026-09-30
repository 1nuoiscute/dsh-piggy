// @ts-check
/**
 * 商店页签。
 *
 * 按类别分组的货架。
 * @module dsh-pig/client/tabs/shop
 */

import { KIND_ORDER, KIND_TITLE } from '../constants.js'
import { button, el } from '../dom.js'
import { num } from '../values.js'

export function renderShopTab(ui) {
  if (ui.view.shop.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供货架。'))
    return
  }
  var head = el('div', 'dp-title')
  head.appendChild(el('b', null, '🛒 商店'))
  head.appendChild(el('span', null, '🪙 ' + ui.view.pig.coins))
  ui.content.appendChild(head)
  var list = el('div', 'dp-shopgrid')
  var shelf = ''
  // The host sends the shop in shelf order, but sort defensively so a
  // reordered table cannot produce duplicate headers.
  var ordered = ui.view.shop.slice().sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  )
  for (var i = 0; i < ordered.length; i += 1) {
    (function (item) {
      // Shelves, so 21 items read as five short lists instead of one long one.
      if (item.kind !== shelf) {
        shelf = item.kind
        list.appendChild(el('div', 'dp-shelf', KIND_TITLE[shelf] ?? shelf))
      }
      // A grid cell, not a list row: 45 items in a 292px column meant
      // endless scrolling and you could never see a shelf at a glance.
      var cell = button('dp-cell'
        + (item.needed ? ' dp-wanted' : '')
        + (item.kind === 'dress' ? ' dp-dress' : (item.affordable ? '' : ' dp-poor'))
        + (item.owned ? ' dp-owned' : ''),
        { 'data-buy': item.key }, function () { ui.send('buy', { item: item.key }) })
      cell.appendChild(el('span', 'dp-cell-e', item.emoji))
      cell.appendChild(el('span', 'dp-cell-n', item.label))
      // 家当 has no count and no repeat purchase: it says "已拥有", or the
      // level it is waiting for — never a price the pig cannot use.
      if (item.owned) {
        cell.appendChild(el('span', 'dp-cell-p', '已拥有'))
        cell.disabled = true
      } else if (item.kind === 'dress' && item.unlocked === false) {
        cell.appendChild(el('span', 'dp-cell-p', '🔒 Lv.' + item.level))
      } else {
        cell.appendChild(el('span', 'dp-cell-p', item.price + ' 🪙'))
      }
      // The shop listing has no count of its own; the inventory map is where
      // "how many do I have" actually lives (same source as the bag tab).
      var owned = num(ui.view.inventory[item.key], 0)
      if (owned > 0) cell.appendChild(el('b', 'dp-cell-c', '×' + owned))
      if (item.needed) cell.appendChild(el('b', 'dp-cell-tag', '需要'))
      if (item.owned && item.worn) cell.appendChild(el('b', 'dp-cell-tag', '穿着'))
      list.appendChild(cell)
    })(ordered[i])
  }
  ui.content.appendChild(list)
}
