// @ts-check
/**
 * 商店页签（B8：动森手机式方块）。
 *
 * 第一层：六个货架方块。第二层：这个货架的货，点方块就是买。
 * @module dsh-piggy/client/tabs/shop
 */

import { KIND_ORDER, KIND_TITLE } from '../constants.js'
import { animatePurchase } from '../interaction-motion.js'
import { el } from '../dom.js'
import { num } from '../values.js'
import { drillHeader, drillTo, tile, tileGrid } from '../widgets.js'

/** One colour per shelf, so the inner layer still says which shelf it is. */
export var SHELF_COLOR = { food: 'red', bath: 'teal', toy: 'yellow', bait: 'blue', medicine: 'green', revive: 'purple', promotion: 'blue' }

/** A shelf title 「<emoji> 食物」 split into its emoji and its name. */
export function shelfParts(kind) {
  var title = KIND_TITLE[kind] ?? kind
  var space = title.indexOf(' ')
  return space < 0 ? ['🛒', title] : [title.slice(0, space), title.slice(space + 1)]
}

export function renderShopTab(ui) {
  if (ui.view.shop.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供货架。'))
    return
  }
  var coins = '🪙 ' + ui.view.pig.coins
  var shelf = ui.drill.shop
  if (shelf === null || KIND_ORDER.indexOf(shelf) < 0) {
    renderShelves(ui)
    return
  }
  var parts = shelfParts(shelf)
  drillHeader(ui, 'shop', parts[0] + ' ' + parts[1], coins)
  var grid = tileGrid()
  var items = ui.view.shop.filter(function (item) { return item.kind === shelf })
  var boughtTile = null
  for (var i = 0; i < items.length; i += 1) {
    var node = itemTile(ui, items[i], SHELF_COLOR[shelf])
    grid.appendChild(node)
    if (items[i].key === ui.justBought) boughtTile = node
  }
  ui.content.appendChild(grid)
  if (boughtTile !== null) animatePurchase(boughtTile)
}

/** The top layer; its title row (with the money) is the app header. */
function renderShelves(ui) {
  var grid = tileGrid()
  for (var k = 0; k < KIND_ORDER.length; k += 1) {
    (function (kind) {
      var items = ui.view.shop.filter(function (item) { return item.kind === kind })
      if (items.length === 0) return
      var parts = shelfParts(kind)
      var needed = items.some(function (item) { return item.needed })
      grid.appendChild(tile({
        emoji: parts[0], label: parts[1], color: SHELF_COLOR[kind] ?? 'blue',
        tag: needed ? '需要' : '',
        data: { 'data-shelf': kind },
        onPick: function () { drillTo(ui, 'shop', kind) },
      }))
    })(KIND_ORDER[k])
  }
  ui.content.appendChild(grid)
}

/** A thing on the shelf: tap to buy. 家当 says 已拥有 or the level it waits for. */
function itemTile(ui, item, color) {
  var owned = num(ui.view.inventory[item.key], 0)
  var note = item.price + ' 🪙'
  if (item.owned) note = '已拥有'
  else if (item.kind === 'dress' && item.unlocked === false) note = '🔒 Lv.' + item.level
  return tile({
    emoji: item.emoji, label: item.label, color: color, soft: true, note: note,
    badge: owned > 0 ? '×' + owned : '',
    tag: item.needed ? '需要' : (item.owned && item.worn ? '穿着' : ''),
    dim: !item.owned && (!item.affordable || (item.kind === 'dress' && item.unlocked === false)),
    disabled: item.owned === true,
    data: { 'data-buy': item.key },
    onPick: function () { ui.send('buy', { item: item.key }) },
  })
}
