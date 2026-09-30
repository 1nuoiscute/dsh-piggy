// @ts-check
/**
 * 背包页签。
 *
 * 和商店一个样子：第一层是几个大类方块（道具按种类分、家当、日记、纪念品），
 * 点一个整屏换成里面的方块，左上角「← 返回」。点道具方块就是使用/穿上。
 * @module dsh-pig/client/tabs/bag
 */

import { KIND_ORDER, KIND_TITLE } from '../constants.js'
import { el } from '../dom.js'
import { kindLabel } from '../format.js'
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

/** 日记：新到旧，先露首句；点一片看全文。 */
function firstSentence(text) {
  var stop = text.indexOf('。')
  return stop < 0 ? text : text.slice(0, stop + 1)
}

export function renderBagTab(ui) {
  var owned = []
  for (var i = 0; i < ui.view.shop.length; i += 1) {
    if (num(ui.view.inventory[ui.view.shop[i].key], 0) > 0) owned.push(ui.view.shop[i])
  }
  var kinds = []
  for (var k = 0; k < owned.length; k += 1) if (kinds.indexOf(owned[k].kind) < 0) kinds.push(owned[k].kind)
  kinds.sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b))

  var wornCount = 0
  for (var w = 0; w < ui.view.dress.length; w += 1) if (ui.view.dress[w].worn) wornCount += 1
  var diary = ui.view.diary
  var souvenirs = ui.view.pig.souvenirs

  // ---- 第三层：日记的一篇 / 纪念品的一张卡 ----
  if (ui.bagEntry !== null) {
    var entry = null
    for (var d = 0; d < diary.length; d += 1) if (diary[d].day === ui.bagEntry) entry = diary[d]
    var keepsake = null
    for (var t = 0; t < souvenirs.length; t += 1) if (souvenirs[t].key === ui.bagEntry) keepsake = souvenirs[t]
    if (entry !== null || keepsake !== null) {
      ui.content.appendChild(backRow(entry !== null ? entry.day : keepsake.label, function () {
        ui.bagEntry = null
        ui.renderContent()
      }))
      var card = el('div', 'dp-pick')
      if (entry !== null) {
        card.appendChild(el('div', 'dp-pick-head', '📔 ' + entry.day))
        card.appendChild(el('div', 'dp-dim', entry.text))
      } else {
        card.appendChild(el('div', 'dp-pick-head', keepsake.emoji + ' ' + keepsake.label))
        card.appendChild(el('div', 'dp-dim', (keepsake.rarityEmoji ?? '') + (keepsake.rarityLabel ?? '')
          + (keepsake.fromLabel === '' ? '' : ' · 来自' + keepsake.fromLabel)
          + (typeof keepsake.price === 'number' ? ' · 值 ' + keepsake.price + ' 🪙' : '')))
        if (typeof keepsake.story === 'string' && keepsake.story !== '') card.appendChild(el('div', 'dp-dim', keepsake.story))
      }
      ui.content.appendChild(card)
      return
    }
    ui.bagEntry = null
  }

  // ---- 第一层：大类方块 ----
  if (ui.bagSection === null) {
    var grid = tileGrid()
    for (var s = 0; s < kinds.length; s += 1) {
      (function (kind) {
        var items = owned.filter(function (item) { return item.kind === kind })
        var total = 0
        for (var n = 0; n < items.length; n += 1) total += num(ui.view.inventory[items[n].key], 0)
        grid.appendChild(tile({
          emoji: kindEmoji(kind),
          label: kindName(kind),
          badge: '×' + total,
          note: items.length + ' 种',
          data: { 'data-bag-section': 'item:' + kind },
          onPick: function () {
            ui.bagSection = 'item:' + kind
            ui.renderContent()
          },
        }))
      })(kinds[s])
    }
    if (owned.length === 0) ui.content.appendChild(el('div', 'dp-empty', '背包空空的。'))
    if (ui.view.dress.length > 0) {
      grid.appendChild(tile({
        emoji: '👕',
        label: '家当',
        badge: wornCount + '/' + ui.view.dress.length,
        note: '穿着中',
        data: { 'data-bag-section': 'dress' },
        onPick: function () {
          ui.bagSection = 'dress'
          ui.renderContent()
        },
      }))
    }
    if (diary.length > 0) {
      grid.appendChild(tile({
        emoji: '📔',
        label: '日记',
        badge: String(diary.length),
        note: diary[0].day.slice(5),
        data: { 'data-bag-section': 'diary' },
        onPick: function () {
          ui.bagSection = 'diary'
          ui.renderContent()
        },
      }))
    }
    grid.appendChild(tile({
      emoji: '🎁',
      label: '纪念品',
      badge: String(souvenirs.length),
      note: '收藏',
      data: { 'data-bag-section': 'souvenirs' },
      onPick: function () {
        ui.bagSection = 'souvenirs'
        ui.renderContent()
      },
    }))
    ui.content.appendChild(grid)
    return
  }

  // ---- 第二层：这一类里的方块 ----
  var section = ui.bagSection
  var title = section === 'dress' ? '家当' : section === 'diary' ? '日记' : section === 'souvenirs' ? '纪念品' : '道具'
  ui.content.appendChild(backRow(title, function () {
    ui.bagSection = null
    ui.renderContent()
  }))

  if (section === 'diary') {
    var days = tileGrid()
    for (var dd = 0; dd < diary.length; dd += 1) {
      (function (item) {
        days.appendChild(tile({
          emoji: '📔',
          label: item.day.slice(5),
          note: firstSentence(item.text).slice(0, 9),
          data: { 'data-diary': item.day },
          onPick: function () {
            ui.bagEntry = item.day
            ui.renderContent()
          },
        }))
      })(diary[dd])
    }
    ui.content.appendChild(days)
    return
  }

  if (section === 'souvenirs') {
    if (souvenirs.length === 0) {
      ui.content.appendChild(el('div', 'dp-empty', '收藏册还空着。'))
      return
    }
    var cabinet = tileGrid()
    for (var ss = 0; ss < souvenirs.length; ss += 1) {
      (function (item) {
        cabinet.appendChild(tile({
          emoji: item.emoji,
          label: item.label,
          badge: item.rarityEmoji ?? '',
          note: item.rarityLabel ?? '',
          data: { 'data-keepsake': item.key },
          onPick: function () {
            ui.bagEntry = item.key
            ui.renderContent()
          },
        }))
      })(souvenirs[ss])
    }
    ui.content.appendChild(cabinet)
    return
  }

  if (section === 'dress') {
    var ownedDress = ui.view.dress.filter(function (item) { return item.owned })
    if (ownedDress.length === 0) {
      ui.content.appendChild(el('div', 'dp-empty', '还没有装扮。'))
      return
    }
    var dress = tileGrid()
    for (var dq = 0; dq < ownedDress.length; dq += 1) {
      (function (item) {
        dress.appendChild(tile({
          emoji: item.emoji,
          label: item.label,
          badge: item.worn ? '穿' : '',
          note: (item.blurb === '' ? (item.slotLabel ?? '') : item.blurb),
          active: item.worn,
          data: { 'data-wear': item.key },
          onPick: function () {
            ui.send('wear', { item: item.key, on: !item.worn })
          },
        }))
      })(ownedDress[dq])
    }
    ui.content.appendChild(dress)
    return
  }

  var kind = section.slice('item:'.length)
  var items = owned.filter(function (item) { return item.kind === kind })
  var list = tileGrid()
  for (var n2 = 0; n2 < items.length; n2 += 1) {
    (function (item) {
      list.appendChild(tile({
        emoji: item.emoji,
        label: item.label,
        badge: '×' + num(ui.view.inventory[item.key], 0),
        note: kindLabel(item),
        data: { 'data-use': item.key },
        onPick: function () {
          ui.send('use', { item: item.key })
        },
      }))
    })(items[n2])
  }
  ui.content.appendChild(list)
}
