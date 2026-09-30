// @ts-check
/**
 * 背包页签。
 *
 * 和商店一个样子：默认只列几个大类（道具按种类分、家当、日记、纪念品），
 * 点开哪一类才看得到里面的东西（用户 2026-10-01：别一屏堆满）。
 * @module dsh-pig/client/tabs/bag
 */

import { KIND_ORDER, KIND_TITLE } from '../constants.js'
import { button, el } from '../dom.js'
import { kindLabel } from '../format.js'
import { num } from '../values.js'
import { section } from '../widgets.js'

/** 日记折叠时露出来的那句（到第一个句号为止）。 */
function firstSentence(text) {
  var stop = text.indexOf('。')
  return stop < 0 ? text : text.slice(0, stop + 1)
}

/** One owned consumable: emoji, name ×count, what it is, and a 使用 button. */
function itemRow(ui, item) {
  var row = el('div', 'dp-item' + (item.needed ? ' dp-wanted' : ''))
  row.appendChild(el('span', null, item.emoji))
  var grow = el('div', 'dp-grow')
  grow.appendChild(el('div', null, item.label + ' ×' + num(ui.view.inventory[item.key], 0)))
  grow.appendChild(el('div', 'dp-dim', kindLabel(item)))
  row.appendChild(grow)
  var use = button('dp-mini', { 'data-use': item.key }, function () { ui.send('use', { item: item.key }) })
  use.textContent = '使用'
  row.appendChild(use)
  return row
}

export function renderBagTab(ui) {
  var owned = []
  for (var i = 0; i < ui.view.shop.length; i += 1) {
    if (num(ui.view.inventory[ui.view.shop[i].key], 0) > 0) owned.push(ui.view.shop[i])
  }

  // ---- 道具：按种类分成几栏，每栏一个折叠头 ----
  var kinds = []
  for (var k = 0; k < owned.length; k += 1) if (kinds.indexOf(owned[k].kind) < 0) kinds.push(owned[k].kind)
  kinds.sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b))
  for (var s = 0; s < kinds.length; s += 1) {
    (function (kind) {
      var items = owned.filter(function (item) { return item.kind === kind })
      var total = 0
      for (var t = 0; t < items.length; t += 1) total += num(ui.view.inventory[items[t].key], 0)
      section(ui, 'bag:item:' + kind, (KIND_TITLE[kind] ?? kind) + ' · ' + total + ' 个', function (body) {
        var list = el('div', 'dp-list')
        for (var n = 0; n < items.length; n += 1) list.appendChild(itemRow(ui, items[n]))
        body.appendChild(list)
      })
    })(kinds[s])
  }
  if (owned.length === 0) ui.content.appendChild(el('div', 'dp-empty', '背包空空的 —— 去「商店」买点东西。'))

  // ---- 家当 ----
  var wornCount = 0
  for (var w = 0; w < ui.view.dress.length; w += 1) if (ui.view.dress[w].worn) wornCount += 1
  var ownedDress = ui.view.dress.filter(function (item) { return item.owned })
  if (ui.view.dress.length > 0) {
    section(ui, 'bag:dress', '👕 家当 ' + wornCount + '/' + ui.view.dress.length + ' 穿着中', function (body) {
      if (ownedDress.length === 0) {
        body.appendChild(el('div', 'dp-empty', '还没有装扮 —— 商店「装扮」那一栏，等级够了就能买。'))
        return
      }
      var list = el('div', 'dp-list')
      for (var n = 0; n < ownedDress.length; n += 1) {
        (function (item) {
          var row = el('div', 'dp-item')
          row.appendChild(el('span', null, item.emoji))
          var grow = el('div', 'dp-grow')
          grow.appendChild(el('div', null, item.label + (item.worn ? ' · 穿着' : '')))
          grow.appendChild(el('div', 'dp-dim', (item.slotLabel === '' ? '' : item.slotLabel + ' · ')
            + (item.blurb === '' ? 'Lv.' + item.level + ' 解锁' : item.blurb)))
          row.appendChild(grow)
          var toggle = button('dp-mini', { 'data-wear': item.key }, function () {
            ui.send('wear', { item: item.key, on: !item.worn })
          })
          toggle.textContent = item.worn ? '脱下' : '穿上'
          row.appendChild(toggle)
          list.appendChild(row)
        })(ownedDress[n])
      }
      body.appendChild(list)
    })
  }

  // ---- 日记：新到旧，先露首句，点开看全文 ----
  var diary = ui.view.diary
  if (diary.length > 0) {
    section(ui, 'bag:diary', '📔 日记 ' + diary.length + ' 篇', function (body) {
      var list = el('div', 'dp-list')
      for (var d = 0; d < diary.length; d += 1) {
        (function (entry) {
          var row = el('div', 'dp-item dp-diary')
          row.setAttribute('data-diary', entry.day)
          row.setAttribute('data-open', 'false')
          var grow = el('div', 'dp-grow')
          grow.appendChild(el('div', null, entry.day + '　' + firstSentence(entry.text)))
          var full = el('div', 'dp-dim dp-diary-full', entry.text)
          full.hidden = true
          grow.appendChild(full)
          row.appendChild(grow)
          row.addEventListener('click', function (event) {
            if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
            full.hidden = !full.hidden
            row.setAttribute('data-open', full.hidden ? 'false' : 'true')
          })
          list.appendChild(row)
        })(diary[d])
      }
      body.appendChild(list)
    })
  }

  // ---- 纪念品 ----
  var souvenirs = ui.view.pig.souvenirs
  section(ui, 'bag:souvenirs', '🎁 纪念品 ' + souvenirs.length, function (body) {
    body.appendChild(el('div', 'dp-empty', souvenirs.length === 0
      ? '收藏册还空着。'
      : souvenirs.map(entry => entry.emoji + entry.label).join(' · ')))
  })
}
