// @ts-check
/**
 * 旅行页签。
 *
 * 目的地与纪念品收藏。
 * @module dsh-piggy/client/tabs/travel
 */

import { button, el } from '../dom.js'
import { formatMinutes } from '../format.js'
import { CSS } from '../styles.js'

export function renderTravelTab(ui) {
  if (ui.view.trips.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供目的地。'))
    return
  }
  var list = el('div', 'dp-list')
  for (var i = 0; i < ui.view.trips.length; i += 1) {
    (function (trip) {
      var row = el('div', 'dp-item')
      row.appendChild(el('span', null, trip.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, trip.label))
      grow.appendChild(el('div', 'dp-dim', formatMinutes(trip.minutes) + ' · ' + trip.cost + ' 🪙'
        + (trip.bestRarity ? ' · 可带回 ' + trip.bestRarityEmoji + trip.bestRarity : '')))
      row.appendChild(grow)
      var go = button('dp-mini', { 'data-trip': trip.key }, function () { ui.send('trip', { trip: trip.key }) })
      go.textContent = '出发'
      go.disabled = !ui.view.canGoOut || !trip.affordable
      row.appendChild(go)
      list.appendChild(row)
    })(ui.view.trips[i])
  }
  ui.content.appendChild(list)

  var souvenirs = ui.view.pig.souvenirs
  var head = el('div', 'dp-title')
  head.style.marginTop = '10px'
  head.appendChild(el('b', null, '🎁 纪念品 ' + souvenirs.length))
  ui.content.appendChild(head)
  if (souvenirs.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '还没出过远门。'))
    return
  }

  var chips = el('div', 'dp-grid')
  for (var s = 0; s < souvenirs.length; s += 1) {
    (function (entry) {
      var chip = button('dp-item', { 'data-souvenir': entry.key }, function () {
        ui.souvenirPick = ui.souvenirPick === entry.key ? null : entry.key
        ui.renderContent()
      })
      chip.appendChild(el('span', null, entry.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, entry.label))
      grow.appendChild(el('div', 'dp-dim', entry.rarityEmoji + entry.rarityLabel
        + (entry.price > 0 ? ' · 值 ' + entry.price + ' 🪙' : '')))
      chip.appendChild(grow)
      chips.appendChild(chip)
    })(souvenirs[s])
  }
  ui.content.appendChild(chips)

  // The story card: tapping a souvenir is how the pig tells you where it
  // went and what it brought back.
  var picked = null
  for (var q = 0; q < souvenirs.length; q += 1) if (souvenirs[q].key === ui.souvenirPick) picked = souvenirs[q]
  if (picked !== null) {
    // Named uniquely: the CSS-guard test maps `var x = el(...)` names to
    // classes, and reusing `card` here shadowed the real .dp-card entry.
    var souvenirCard = el('div', 'dp-locked')
    souvenirCard.appendChild(el('div', null, picked.emoji + ' ' + picked.label + ' · ' + picked.rarityEmoji + picked.rarityLabel
      + (picked.fromLabel === '' ? '' : ' · 来自' + picked.fromLabel)))
    souvenirCard.appendChild(el('div', null, picked.story === ''
      ? '（这只纪念品是旧版本带回来的，没有留下故事。）'
      : '「' + picked.story + '」'))
    if (picked.price > 0) {
      var sell = button('dp-mini', { 'data-sell': picked.key }, function () {
        ui.souvenirPick = null
        ui.send('sell', { souvenir: picked.key })
      })
      sell.textContent = '卖掉 +' + picked.price + ' 🪙'
      sell.style.marginTop = '6px'
      souvenirCard.appendChild(sell)
    }
    ui.content.appendChild(souvenirCard)
  }
}
