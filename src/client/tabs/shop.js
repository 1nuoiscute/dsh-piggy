// @ts-check
/**
 * 商店页签。
 *
 * 两层小方块：先是几个货架方块（食物 / 洗浴 / 玩具 / 装扮 / 药品 / 复活），
 * 点一个整屏换成那一架的货物方块，左上角「← 返回」。点货物方块就是买。
 * @module dsh-pig/client/tabs/shop
 */

import { KIND_ORDER, KIND_TITLE } from '../constants.js'
import { el } from '../dom.js'
import { num } from '../values.js'
import { backRow, tile, tileGrid } from '../widgets.js'

/** The emoji alone: KIND_TITLE carries the emoji as a prefix. */
function kindEmoji(kind) {
  var title = KIND_TITLE[kind] ?? kind
  var space = title.indexOf(' ')
  return space < 0 ? '📦' : title.slice(0, space)
}

/** The name alone, without the emoji prefix. */
function kindName(kind) {
  var title = KIND_TITLE[kind] ?? kind
  var space = title.indexOf(' ')
  return space < 0 ? title : title.slice(space + 1)
}

/** One item tile: emoji, name, price / 已拥有, and a count badge. */
function itemTile(ui, item) {
  var owned = num(ui.view.inventory[item.key], 0)
  var locked = item.kind === 'dress' && item.unlocked === false
  return tile({
    emoji: item.emoji,
    label: item.label,
    badge: item.owned || owned === 0 ? '' : '×' + owned,
    note: item.owned ? '已拥有' : (locked ? '🔒 Lv.' + item.level : item.price + ' 🪙'),
    locked,
    // Affordability is colour, not a lock: a tap still explains what is missing.
    dim: item.owned || (!item.affordable && item.kind !== 'dress'),
    disabled: item.owned,
    tag: (item.needed ? '需要' : '') + (item.owned && item.worn ? '穿着' : ''),
    data: { 'data-buy': item.key },
    onPick: function () { ui.send('buy', { item: item.key }) },
  })
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

  // The host sends the shop in shelf order, but sort defensively so a
  // reordered table cannot produce duplicate shelves.
  var ordered = ui.view.shop.slice().sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  )
  var kinds = []
  for (var k = 0; k < ordered.length; k += 1) if (kinds.indexOf(ordered[k].kind) < 0) kinds.push(ordered[k].kind)

  // ---- 第一层：货架方块 ----
  if (ui.shopKind === null) {
    var shelves = tileGrid()
    for (var s = 0; s < kinds.length; s += 1) {
      (function (kind) {
        var items = ordered.filter(function (item) { return item.kind === kind })
        var buyable = items.filter(function (item) {
          if (item.owned) return false
          return item.kind === 'dress' ? item.unlocked !== false : item.affordable
        }).length
        shelves.appendChild(tile({
          emoji: kindEmoji(kind),
          label: kindName(kind),
          badge: String(items.length),
          note: buyable > 0 ? buyable + ' 件可买' : '暂时买不了',
          data: { 'data-shelf': kind },
          onPick: function () {
            ui.shopKind = kind
            ui.renderContent()
          },
        }))
      })(kinds[s])
    }
    ui.content.appendChild(shelves)
    return
  }

  // ---- 第二层：这一架的货物方块 ----
  var kind = kinds.indexOf(ui.shopKind) >= 0 ? ui.shopKind : kinds[0]
  ui.content.appendChild(backRow(kindName(kind), function () {
    ui.shopKind = null
    ui.renderContent()
  }))
  var grid = tileGrid()
  var shelf = ordered.filter(function (item) { return item.kind === kind })
  for (var i = 0; i < shelf.length; i += 1) grid.appendChild(itemTile(ui, shelf[i]))
  ui.content.appendChild(grid)
}
