// @ts-check
/**
 * 学习页签。
 *
 * 学段阶梯、九门科目与兴趣课。
 * @module dsh-pig/client/tabs/study
 */

import { STAGES } from '../constants.js'
import { button, el } from '../dom.js'

export function renderStudyTab(ui) {
  if (ui.view.subjects.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供课程表。'))
    return
  }
  // Prefer the host's own ladder: a client that hard-codes seven stages
  // would keep offering a stage the host has never heard of.
  var stageList = ui.view.stages.length > 0 ? ui.view.stages : STAGES
  var seg = el('div', 'dp-seg')
  for (var s = 0; s < stageList.length; s += 1) {
    (function (entry) {
      var detail = null
      for (var k = 0; k < ui.view.stages.length; k += 1) if (ui.view.stages[k].key === entry.key) detail = ui.view.stages[k]
      var locked = detail !== null && detail.unlocked === false
      // Tuition lives in the note below rather than in the button: seven
      // stages do not fit in a 292px panel with a price glued to each.
      var btn = button(null, { 'data-stage': entry.key }, function () {
        ui.stage = entry.key
        ui.renderContent()
      })
      btn.textContent = entry.label + (locked ? ' 🔒' : '')
      btn.setAttribute('data-active', entry.key === ui.stage ? 'true' : 'false')
      btn.setAttribute('data-locked', locked ? 'true' : 'false')
      seg.appendChild(btn)
    })(stageList[s])
  }
  ui.content.appendChild(seg)

  var detail = null
  for (var d = 0; d < ui.view.stages.length; d += 1) if (ui.view.stages[d].key === ui.stage) detail = ui.view.stages[d]
  if (detail !== null) {
    var note = el('div', 'dp-empty', detail.minutes + ' 分钟 · 学费 ' + detail.tuition + ' 🪙 · 属性 +' + detail.gain)
    note.style.marginBottom = '7px'
    note.style.marginTop = '0'
    ui.content.appendChild(note)
    // A gated stage says exactly what it is waiting for.
    if (detail.unlocked === false && detail.progress !== null) {
      ui.content.appendChild(el('div', 'dp-locked',
        '🔒 要先念完' + detail.progress.label + '（' + detail.progress.done + '/' + detail.progress.need + '）'))
    }
  }

  // Only this stage's own courses. An empty list (old host) means "show
  // everything", never "show nothing".
  var wanted = detail !== null && detail.subjects.length > 0 ? detail.subjects : null
  var grid = el('div', 'dp-grid')
  for (var i = 0; i < ui.view.subjects.length; i += 1) {
    (function (sub) {
      if (wanted !== null && wanted.indexOf(sub.key) < 0) return
      var btn = button('dp-item', { 'data-subject': sub.key }, function () {
        ui.send('study', { subject: sub.key, stage: ui.stage })
      })
      if (detail !== null && detail.unlocked === false) btn.disabled = true
      btn.style.cursor = 'pointer'
      btn.style.textAlign = 'left'
      btn.appendChild(el('span', null, sub.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, sub.label))
      // The stage on screen is the count that matters; a host without the
      // per-stage table falls back to the lifetime total. Kept short —
      // two columns of 292px do not fit "这一级上过 N 次".
      var perStage = sub.levels[ui.stage]
      var times = typeof perStage === 'number' ? perStage : sub.level
      grow.appendChild(el('div', 'dp-dim', sub.traitLabel + ' · 本级 ' + times + ' 次'))
      btn.appendChild(grow)
      grid.appendChild(btn)
    })(ui.view.subjects[i])
  }
  ui.content.appendChild(grid)

  // ---- 兴趣：不按学段排队，随时能学，加的是同三条属性 ----
  if (ui.view.interests.length > 0) {
    var ihead = el('div', 'dp-title')
    ihead.style.marginTop = '10px'
    ihead.appendChild(el('b', null, '🎯 兴趣'))
    ui.content.appendChild(ihead)
    var ilist = el('div', 'dp-list')
    for (var n = 0; n < ui.view.interests.length; n += 1) {
      (function (entry) {
        var row = el('div', 'dp-item')
        row.appendChild(el('span', null, entry.emoji))
        var grow = el('div', 'dp-grow')
        grow.appendChild(el('div', null, entry.label))
        grow.appendChild(el('div', 'dp-dim', entry.minutes + ' 分钟 · ' + entry.cost + ' 🪙 · '
          + entry.traitEmoji + entry.traitLabel + ' +' + entry.gain
          + (entry.times > 0 ? ' · 学过 ' + entry.times + ' 次' : '')))
        row.appendChild(grow)
        var go = button('dp-mini', { 'data-interest': entry.key }, function () {
          ui.send('interest', { interest: entry.key })
        })
        go.textContent = entry.times > 0 ? '再学' : '去学'
        go.disabled = !ui.view.canGoOut || !entry.affordable
        row.appendChild(go)
        ilist.appendChild(row)
      })(ui.view.interests[n])
    }
    ui.content.appendChild(ilist)
  }
}
