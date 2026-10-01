// @ts-check
/**
 * 背包页签（B8：动森手机式方块，跟商店一个样子）。
 *
 * 第一层：食物 / 洗浴 / 玩具 / 药品 / 复活 / 装扮 / 日记 / 纪念品，右上角写件数，空的变灰。
 * 第二层：道具点一下就用；装扮点一下穿上或脱下；日记和纪念品点一下，下面显示全文 / 故事。
 * @module dsh-piggy/client/tabs/bag
 */

import { KIND_ORDER } from '../constants.js'
import { button, el } from '../dom.js'
import { num } from '../values.js'
import { drillHeader, drillTo, tile, tileGrid } from '../widgets.js'
import { SHELF_COLOR, shelfParts } from './shop.js'

/** The consumable shelves, in shop order; 装扮 is its own category below. */
var CONSUMABLES = KIND_ORDER.filter(function (kind) { return kind !== 'dress' })

/** The non-shelf categories: what they are called and how they look. */
var EXTRA = {
  dress: { emoji: '👕', label: '装扮', color: 'pink' },
  diary: { emoji: '📔', label: '日记', color: 'brown' },
  souvenir: { emoji: '🎁', label: '纪念品', color: 'blue' },
}

/** 「2026-10-01」 → 「10-01」: the tile only has room for the month and day. */
function shortDay(day) {
  return day.length >= 10 ? day.slice(5) : day
}

export function renderBagTab(ui) {
  var open = ui.drill.bag
  if (open === 'dress') renderDress(ui)
  else if (open === 'diary') renderDiary(ui)
  else if (open === 'souvenir') renderSouvenirs(ui)
  else if (open !== null && CONSUMABLES.indexOf(open) >= 0) renderItems(ui, open)
  else renderCategories(ui)
}

/** What the pig owns of one shelf, with counts. */
function ownedOf(ui, kind) {
  return ui.view.shop.filter(function (item) {
    return item.kind === kind && num(ui.view.inventory[item.key], 0) > 0
  })
}

function renderCategories(ui) {
  var grid = tileGrid()
  for (var k = 0; k < CONSUMABLES.length; k += 1) {
    (function (kind) {
      var items = ownedOf(ui, kind)
      var count = items.reduce(function (sum, item) { return sum + num(ui.view.inventory[item.key], 0) }, 0)
      var parts = shelfParts(kind)
      grid.appendChild(tile({
        emoji: parts[0], label: parts[1], color: SHELF_COLOR[kind] ?? 'blue',
        badge: count > 0 ? String(count) : '', dim: count === 0,
        tag: items.some(function (item) { return item.needed }) ? '需要' : '',
        data: { 'data-bag': kind },
        onPick: function () { drillTo(ui, 'bag', kind) },
      }))
    })(CONSUMABLES[k])
  }
  var counts = {
    dress: ui.view.dress.filter(function (item) { return item.owned }).length,
    diary: ui.view.diary.length,
    souvenir: ui.view.pig.souvenirs.length,
  }
  for (var key in EXTRA) {
    (function (category) {
      var spec = EXTRA[category]
      grid.appendChild(tile({
        emoji: spec.emoji, label: spec.label, color: spec.color,
        badge: counts[category] > 0 ? String(counts[category]) : '', dim: counts[category] === 0,
        data: { 'data-bag': category },
        onPick: function () { drillTo(ui, 'bag', category) },
      }))
    })(key)
  }
  ui.content.appendChild(grid)
}

/** A consumable shelf: tap an item to use it. */
function renderItems(ui, kind) {
  var parts = shelfParts(kind)
  drillHeader(ui, 'bag', parts[0] + ' ' + parts[1], '点一下就用')
  var items = ownedOf(ui, kind)
  if (items.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '空的'))
    return
  }
  var grid = tileGrid()
  for (var i = 0; i < items.length; i += 1) {
    (function (item) {
      grid.appendChild(tile({
        emoji: item.emoji, label: item.label, color: SHELF_COLOR[kind] ?? 'blue', soft: true,
        badge: '×' + num(ui.view.inventory[item.key], 0), tag: item.needed ? '需要' : '',
        note: item.kind === 'promotion' ? item.useLabel : '',
        data: { 'data-use': item.key },
        onPick: function () { ui.send('use', { item: item.key }) },
      }))
    })(items[i])
  }
  ui.content.appendChild(grid)
}

/** 家当: tap to put it on or take it off; one piece per slot. */
function renderDress(ui) {
  var owned = ui.view.dress.filter(function (item) { return item.owned })
  var worn = owned.filter(function (item) { return item.worn }).length
  drillHeader(ui, 'bag', '👕 装扮', worn + ' 件穿着')
  if (owned.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '还没有装扮'))
    return
  }
  var grid = tileGrid()
  for (var i = 0; i < owned.length; i += 1) {
    (function (item) {
      grid.appendChild(tile({
        emoji: item.emoji, label: item.label, color: EXTRA.dress.color, soft: true,
        note: item.slotLabel, tag: item.worn ? '穿着' : '', active: item.worn,
        data: { 'data-wear': item.key },
        onPick: function () { ui.send('wear', { item: item.key, on: !item.worn }) },
      }))
    })(owned[i])
  }
  ui.content.appendChild(grid)
}

/** 日记: one tile per day, newest first; the picked day's page opens below. */
function renderDiary(ui) {
  drillHeader(ui, 'bag', '📔 日记', ui.view.diary.length + ' 篇')
  if (ui.view.diary.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '还没有日记'))
    return
  }
  var grid = tileGrid()
  var picked = null
  for (var d = 0; d < ui.view.diary.length; d += 1) {
    (function (entry) {
      var active = ui.drill.pick === entry.day
      if (active) picked = entry
      grid.appendChild(tile({
        emoji: '📔', label: shortDay(entry.day), color: EXTRA.diary.color, soft: true, active: active,
        data: { 'data-diary': entry.day },
        onPick: function () {
          ui.drill.pick = active ? null : entry.day
          ui.renderContent()
        },
      }))
    })(ui.view.diary[d])
  }
  ui.content.appendChild(grid)
  if (picked !== null) {
    var page = el('div', 'dp-pick dp-tile-card dp-diary-page')
    page.appendChild(el('div', 'dp-pick-head', picked.day))
    page.appendChild(el('div', null, picked.text))
    ui.content.appendChild(page)
  }
}

/** 纪念品: tap one for its story, and sell it from there. */
function renderSouvenirs(ui) {
  var list = ui.view.pig.souvenirs
  drillHeader(ui, 'bag', '🎁 纪念品', list.length + ' 件')
  if (list.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '收藏册还空着'))
    return
  }
  var grid = tileGrid()
  var picked = null
  for (var s = 0; s < list.length; s += 1) {
    (function (entry, index) {
      var id = entry.key + '#' + index
      var active = ui.drill.pick === id
      if (active) picked = entry
      grid.appendChild(tile({
        emoji: entry.emoji, label: entry.label, color: EXTRA.souvenir.color, soft: true, active: active,
        note: entry.rarityEmoji + entry.rarityLabel,
        data: { 'data-souvenir': id },
        onPick: function () {
          ui.drill.pick = active ? null : id
          ui.renderContent()
        },
      }))
    })(list[s], s)
  }
  ui.content.appendChild(grid)
  if (picked === null) return
  var story = el('div', 'dp-pick dp-tile-card')
  story.appendChild(el('div', 'dp-pick-head', picked.emoji + ' ' + picked.label
    + (picked.fromLabel === '' ? '' : ' · ' + picked.fromLabel)))
  story.appendChild(el('div', null, picked.story === '' ? '（旧版本带回来的，没有故事）' : '「' + picked.story + '」'))
  if (picked.price > 0) {
    var sold = picked
    var sell = button('dp-mini', { 'data-sell': sold.key }, function () {
      ui.drill.pick = null
      ui.send('sell', { souvenir: sold.key })
    })
    sell.textContent = '卖掉 +' + sold.price + ' 🪙'
    sell.style.marginTop = '6px'
    story.appendChild(sell)
  }
  ui.content.appendChild(story)
}
