// @ts-check
/**
 * 状态页签。
 *
 * 属性条、三维、体重金币与照顾入口。
 * @module dsh-pig/client/tabs/status
 */

import { CARE_LABEL, MODES } from '../constants.js'
import { button, el } from '../dom.js'
import { labelledBar, pickerPanel } from '../widgets.js'

export function renderStatusTab(ui) {
  var p = ui.view.pig
  if (p === null) return
  labelledBar(ui, '🍚 饱食', p.satiety, p.satiety + '%')
  labelledBar(ui, '❤️ 心情', p.happiness, p.happiness + '%', 'dp-mood')
  labelledBar(ui, '🫧 清洁', p.cleanliness, p.cleanliness + '%', 'dp-clean')
  labelledBar(ui, '💚 健康', p.healthPercent, p.health + '/' + ui.view.maxHealth, 'dp-health')

  var traits = el('div', 'dp-traits')
  traits.appendChild(el('span', null, '🧠 智力 ' + p.traits.intel))
  traits.appendChild(el('span', null, '✨ 魅力 ' + p.traits.charm))
  traits.appendChild(el('span', null, '💪 武力 ' + p.traits.strong))
  ui.content.appendChild(traits)

  var info = el('div', 'dp-row')
  info.appendChild(el('span', null, '⚖️ 体重 ' + p.weight))
  info.appendChild(el('b', null, '🪙 ' + p.coins))
  ui.content.appendChild(info)

  var lvl = el('div', 'dp-row')
  lvl.appendChild(el('span', null, '⭐ 等级'))
  lvl.appendChild(el('b', null, 'Lv.' + p.level.level + ' ' + p.level.titleEmoji + p.level.titleLabel
    + (p.level.maxed ? ' · 满级' : ' · 还差 ' + Math.ceil(p.level.toNext) + ' 成长')))
  ui.content.appendChild(lvl)

  var age = el('div', 'dp-row')
  age.appendChild(el('span', null, '🏠 陪伴'))
  age.appendChild(el('b', null, p.ageLabel + (p.ageForced ? ' 🔧' : '') + (p.daysToNextStage === null ? ' · 已长成' : '')))
  ui.content.appendChild(age)

  var grid = el('div', 'dp-actions')
  for (var i = 0; i < MODES.length; i += 1) {
    (function (key) {
      var info = ui.view.actions[key]
      var shelf = ui.view.care[key] ?? []
      var needsItem = shelf.length > 0
      var btn = button('dp-btn', { 'data-action': key }, function () {
        // Feeding, washing and playing all spend something, so the button
        // opens the pig's bag instead of guessing what to use.
        if (needsItem) {
          ui.picker = ui.picker === key ? null : key
          ui.renderContent()
        } else {
          ui.send(key)
        }
      })
      btn.setAttribute('data-open-picker', ui.picker === key ? 'true' : 'false')
      btn.appendChild(el('span', null, CARE_LABEL[key][1]))
      btn.appendChild(el('span', null, CARE_LABEL[key][0]))
      if (needsItem) btn.appendChild(el('span', 'dp-count', String(shelf.length)))
      // Trust but verify: a dead pig cannot be cared for even if the host
      // forgot to clear its readiness flags.
      if (!info.ready || ui.view.dead) {
        btn.disabled = true
        if (ui.view.dead) btn.appendChild(el('span', 'dp-wait', '—'))
        else if (info.waitSeconds > 0) btn.appendChild(el('span', 'dp-wait', info.waitSeconds + 's'))
        else if (info.blocked === 'away') btn.appendChild(el('span', 'dp-wait', '不在家'))
      }
      grid.appendChild(btn)
    })(MODES[i])
  }
  ui.content.appendChild(grid)

  if (ui.picker !== null && (ui.view.care[ui.picker] ?? []).length > 0) ui.content.appendChild(pickerPanel(ui, ui.picker))

  ui.content.appendChild(talkRow(ui))

  if (p.memories.length > 0) {
    ui.content.appendChild(el('div', 'dp-memo', p.memories.slice(-3).join('\n')))
  }
}

/**
 * B6: what the pig calls its owner, and 免打扰 — one row, two small controls.
 * While the name is being typed, polls leave the panel alone (see panel.js),
 * so the input keeps its focus.
 */
function talkRow(ui) {
  var row = el('div', 'dp-row dp-talk')
  if (ui.ownerEdit !== null) {
    var input = /** @type {HTMLInputElement} */ (el('input', 'dp-input'))
    input.value = ui.ownerEdit
    input.maxLength = 12
    input.setAttribute('data-owner-input', 'true')
    input.addEventListener('input', function () { ui.ownerEdit = input.value })
    var save = button('dp-mini', { 'data-owner-save': 'true' }, function () {
      var name = (ui.ownerEdit || '').trim()
      ui.ownerEdit = null
      if (name !== '') ui.send('owner', { name: name })
      ui.renderContent()
    })
    save.textContent = '好'
    var cancel = button('dp-mini dp-mini-plain', { 'data-owner-cancel': 'true' }, function () {
      ui.ownerEdit = null
      ui.renderContent()
    })
    cancel.textContent = '算了'
    row.appendChild(input)
    row.appendChild(save)
    row.appendChild(cancel)
    return row
  }
  var who = el('span', null, '🙋 叫你「' + ui.view.dialogue.ownerName + '」')
  var rename = button('dp-mini dp-mini-plain', { 'data-owner-edit': 'true' }, function () {
    ui.ownerEdit = ui.view.dialogue.ownerName
    ui.renderContent()
  })
  rename.textContent = '改'
  var quiet = button('dp-mini dp-mini-plain', { 'data-quiet': ui.view.dialogue.quiet ? 'on' : 'off' }, function () {
    ui.send('quiet', { on: !ui.view.dialogue.quiet })
  })
  quiet.textContent = ui.view.dialogue.quiet ? '🔕 免打扰中' : '🔔 免打扰'
  row.appendChild(who)
  row.appendChild(rename)
  row.appendChild(quiet)
  return row
}
