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
import { section } from '../widgets.js'


/** One shelf cell: emoji, name, price/已拥有, and a count when the pig has some. */
function shopCell(ui, item) {
  var cell = button('dp-cell'
    + (item.needed ? ' dp-wanted' : '')
    + (item.kind === 'dress' ? ' dp-cell-dress' : (item.affordable ? '' : ' dp-poor'))
    + (item.owned ? ' dp-owned' : ''),
    { 'data-buy': item.key }, function () { ui.send('buy', { item: item.key }) })
  cell.appendChild(el('span', 'dp-cell-e', item.emoji))
  cell.appendChild(el('span', 'dp-cell-n', item.label))
  if (item.owned) {
    cell.appendChild(el('span', 'dp-cell-p', '已拥有'))
    cell.disabled = true
  } else if (item.kind === 'dress' && item.unlocked === false) {
    cell.appendChild(el('span', 'dp-cell-p', '🔒 Lv.' + item.level))
  } else {
    cell.appendChild(el('span', 'dp-cell-p', item.price + ' 🪙'))
  }
  var owned = num(ui.view.inventory[item.key], 0)
  if (owned > 0) cell.appendChild(el('b', 'dp-cell-c', '×' + owned))
  if (item.needed) cell.appendChild(el('b', 'dp-cell-tag', '需要'))
  if (item.owned && item.worn) cell.appendChild(el('b', 'dp-cell-tag', '穿着'))
  return cell
}

export function renderShopTab(ui) {
  if (ui.view.shop.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供货架。'))
    return
  }
  var head = el('div', 'dp-title')
  head.appendChild(el('b', null, '🛒 商店'))
  head.appendChild(el('span', null, '🪙 ' + ui.view.pig.coins))
  ui.content.appendChild(head)
  // 默认只列几个大类，点开才看到货（用户反馈 #3）。
  var ordered = ui.view.shop.slice().sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  )
  var kinds = []
  for (var k = 0; k < ordered.length; k += 1) if (kinds.indexOf(ordered[k].kind) < 0) kinds.push(ordered[k].kind)
  for (var s = 0; s < kinds.length; s += 1) {
    (function (kind) {
      var items = ordered.filter(function (item) { return item.kind === kind })
      var ownedCount = 0
      for (var o = 0; o < items.length; o += 1) if (items[o].owned || num(ui.view.inventory[items[o].key], 0) > 0) ownedCount += 1
      section(ui, 'shop:' + kind, (KIND_TITLE[kind] ?? kind) + ' · ' + items.length
        + (ownedCount > 0 ? '（有 ' + ownedCount + '）' : ''), function (body) {
        var grid = el('div', 'dp-shopgrid')
        for (var i = 0; i < items.length; i += 1) grid.appendChild(shopCell(ui, items[i]))
        body.appendChild(grid)
      })
    })(kinds[s])
  }
}
