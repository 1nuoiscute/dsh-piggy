// @ts-check
/**
 * 背包页签。
 *
 * 道具数量、家当与装扮点位。
 * @module dsh-pig/client/tabs/bag
 */

import { button, el } from '../dom.js'
import { kindLabel } from '../format.js'
import { num } from '../values.js'

/** 日记折叠时露出来的那句（到第一个句号为止）。 */
function firstSentence(text) {
  var stop = text.indexOf('。')
  return stop < 0 ? text : text.slice(0, stop + 1)
}

export function renderBagTab(ui) {
  var owned = []
  for (var i = 0; i < ui.view.shop.length; i += 1) {
    if (num(ui.view.inventory[ui.view.shop[i].key], 0) > 0) owned.push(ui.view.shop[i])
  }
  if (owned.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '背包空空的。'))
  } else {
    var list = el('div', 'dp-list')
    for (var j = 0; j < owned.length; j += 1) {
      (function (item) {
        var row = el('div', 'dp-item' + (item.needed ? ' dp-wanted' : ''))
        row.appendChild(el('span', null, item.emoji))
        var grow = el('div', 'dp-grow')
        grow.appendChild(el('div', null, item.label + ' ×' + num(ui.view.inventory[item.key], 0)))
        grow.appendChild(el('div', 'dp-dim', kindLabel(item)))
        row.appendChild(grow)
        var use = button('dp-mini', { 'data-use': item.key }, function () { ui.send('use', { item: item.key }) })
        use.textContent = '使用'
        row.appendChild(use)
        list.appendChild(row)
      })(owned[j])
    }
    ui.content.appendChild(list)
  }

  // 家当: owned dress, with wear/take-off. Hidden entirely on an old host
  // that never sent the shelf, so the panel does not show a dead section.
  if (ui.view.dress.length > 0) {
    var dhead = el('div', 'dp-title')
    dhead.style.marginTop = '10px'
    var wornCount = 0
    for (var w = 0; w < ui.view.dress.length; w += 1) if (ui.view.dress[w].worn) wornCount += 1
    dhead.appendChild(el('b', null, '👕 家当 ' + wornCount + '/' + ui.view.dress.length + ' 穿着中'))
    ui.content.appendChild(dhead)
    var ownedDress = []
    for (var m = 0; m < ui.view.dress.length; m += 1) if (ui.view.dress[m].owned) ownedDress.push(ui.view.dress[m])
    if (ownedDress.length === 0) {
      ui.content.appendChild(el('div', 'dp-empty', '还没有装扮。'))
    } else {
      var dlist = el('div', 'dp-list')
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
          dlist.appendChild(row)
        })(ownedDress[n])
      }
      ui.content.appendChild(dlist)
    }
  }

  // ---- 日记：新到旧，先露首句，点开看全文 ----
  var diary = ui.view.diary
  if (diary.length > 0) {
    var dhead = el('div', 'dp-title')
    dhead.style.marginTop = '10px'
    dhead.appendChild(el('b', null, '📔 日记 ' + diary.length))
    ui.content.appendChild(dhead)
    var dlist = el('div', 'dp-list')
    for (var d = 0; d < diary.length; d += 1) {
      (function (entry) {
        var row = el('div', 'dp-item dp-diary')
        row.setAttribute('data-diary', entry.day)
        row.setAttribute('data-open', 'false')
        var grow = el('div', 'dp-grow')
        var head = el('div', null, entry.day + '　' + firstSentence(entry.text))
        var full = el('div', 'dp-dim dp-diary-full', entry.text)
        full.hidden = true
        grow.appendChild(head)
        grow.appendChild(full)
        row.appendChild(grow)
        row.addEventListener('click', function (event) {
          if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
          full.hidden = !full.hidden
          row.setAttribute('data-open', full.hidden ? 'false' : 'true')
        })
        dlist.appendChild(row)
      })(diary[d])
    }
    ui.content.appendChild(dlist)
  }

  var souvenirs = ui.view.pig.souvenirs
  var head = el('div', 'dp-title')
  head.style.marginTop = '10px'
  head.appendChild(el('b', null, '🎁 纪念品 ' + souvenirs.length))
  ui.content.appendChild(head)
  ui.content.appendChild(el('div', 'dp-empty', souvenirs.length === 0
    ? '收藏册还空着。'
    : souvenirs.map(entry => entry.emoji + entry.label).join(' · ')))
}
