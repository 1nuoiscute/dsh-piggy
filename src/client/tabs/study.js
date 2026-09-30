// @ts-check
/**
 * 学习页签。
 *
 * 学段按钮、九门科目与兴趣课 —— 排版沿用 B4 以前的样子（用户喜欢这个）。
 * B4 起每门课各算各的课时，所以同一个学段里，每门课的状态可能不同：
 * 正在这个学段的能上，已经念完的打勾，还没念到的上锁。
 * @module dsh-pig/client/tabs/study
 */

import { STAGES } from '../constants.js'
import { button, el } from '../dom.js'

/** The seg key that shows the interest list instead of a stage. */
export const INTEREST_TAB = 'interest'

/** Where a subject stands relative to one stage: 'current' | 'done' | 'ahead'. */
function standing(sub, stage) {
  if (stage === null || sub.stageKey === '') return 'current'
  if (sub.stageKey === stage.key) return 'current'
  if (stage.upTo !== null && sub.lessons >= stage.upTo) return 'done'
  return 'ahead'
}

export function renderStudyTab(ui) {
  if (ui.view.subjects.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供课程表。'))
    return
  }
  // Prefer the host's own ladder: a client that hard-codes the stages would
  // keep offering one the host has never heard of.
  var stageList = ui.view.stages.length > 0 ? ui.view.stages : STAGES
  var seg = el('div', 'dp-seg')
  for (var s = 0; s < stageList.length; s += 1) {
    (function (entry) {
      var detail = null
      for (var k = 0; k < ui.view.stages.length; k += 1) if (ui.view.stages[k].key === entry.key) detail = ui.view.stages[k]
      var locked = detail !== null && detail.unlocked === false
      // Tuition lives in the note below rather than in the button: the stages
      // do not fit in a 292px panel with a price glued to each.
      var btn = button(null, { 'data-stage': entry.key }, function () {
        ui.stage = entry.key
        // 用户自己选过之后，轮询就不许再替他改（见 panel.js 的归位逻辑）。
        ui.stagePicked = true
        ui.renderContent()
      })
      // Locked is shown by the button's own dashed style, not a padlock in the
      // label: 「学无止境」 plus a padlock wrapped and stood taller than its neighbours.
      btn.textContent = entry.label
      btn.setAttribute('data-active', entry.key === ui.stage ? 'true' : 'false')
      btn.setAttribute('data-locked', locked ? 'true' : 'false')
      seg.appendChild(btn)
    })(stageList[s])
  }
  // 兴趣 sits beside the stages as one more button (the owner asked for it):
  // it swaps the subject grid for the interest list.
  if (ui.view.interests.length > 0) {
    var interestBtn = button(null, { 'data-stage': INTEREST_TAB }, function () {
      ui.stage = INTEREST_TAB
      ui.stagePicked = true
      ui.renderContent()
    })
    interestBtn.textContent = '🎯 兴趣'
    interestBtn.setAttribute('data-active', ui.stage === INTEREST_TAB ? 'true' : 'false')
    interestBtn.setAttribute('data-locked', 'false')
    seg.appendChild(interestBtn)
  }
  ui.content.appendChild(seg)

  if (ui.stage === INTEREST_TAB && ui.view.interests.length > 0) {
    renderInterests(ui)
    return
  }

  var detail = null
  for (var d = 0; d < ui.view.stages.length; d += 1) if (ui.view.stages[d].key === ui.stage) detail = ui.view.stages[d]
  if (detail !== null) {
    var span = detail.upTo !== null ? '第 ' + (detail.from + 1) + '–' + detail.upTo + ' 节' : '第 ' + (detail.from + 1) + ' 节起'
    var note = el('div', 'dp-empty', span + ' · ' + detail.minutes + ' 分钟 · 学费 ' + detail.tuition + ' 🪙 · 属性 +' + detail.gain)
    note.style.marginBottom = '7px'
    note.style.marginTop = '0'
    ui.content.appendChild(note)
    // A gated stage says exactly what it is waiting for.
    if (detail.unlocked === false && detail.progress !== null) {
      ui.content.appendChild(el('div', 'dp-locked',
        '🔒 要先' + detail.progress.label + '（现在最多 ' + detail.progress.done + ' 节）'))
    }
  }

  var grid = el('div', 'dp-grid')
  for (var i = 0; i < ui.view.subjects.length; i += 1) {
    (function (sub) {
      var where = standing(sub, detail)
      var btn = button('dp-item', { 'data-subject': sub.key }, function () {
        ui.send('study', { subject: sub.key })
      })
      btn.disabled = where !== 'current' || !ui.view.canGoOut || !sub.affordable
      btn.style.cursor = 'pointer'
      btn.style.textAlign = 'left'
      btn.appendChild(el('span', null, sub.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, sub.label))
      // Two short lines, as before: two columns of 292px do not fit more.
      var line
      if (where === 'done') line = '✓ 已毕业'
      else if (where === 'ahead') line = '🔒 还在' + (sub.stageLabel || '下一段')
      else if (detail !== null && detail.upTo !== null) line = sub.traitLabel + ' · ' + (sub.lessons - detail.from) + '/' + (detail.upTo - detail.from) + ' 节'
      else line = sub.traitLabel + ' · 上过 ' + sub.lessons + ' 节'
      grow.appendChild(el('div', 'dp-dim', line))
      btn.appendChild(grow)
      grid.appendChild(btn)
    })(ui.view.subjects[i])
  }
  ui.content.appendChild(grid)
}

/** The interest list, shown when the 兴趣 button is selected. */
function renderInterests(ui) {
  // Same note line as a stage: what this list is about, in one short row.
  var after = ui.view.interests[0].certificateAfter
  var note = el('div', 'dp-empty', after > 0 ? '随时能学 · 同一门上满 ' + after + ' 次拿证' : '随时能学')
  note.style.marginBottom = '7px'
  note.style.marginTop = '0'
  ui.content.appendChild(note)
  var ilist = el('div', 'dp-list')
  for (var n = 0; n < ui.view.interests.length; n += 1) {
    (function (entry) {
      var row = el('div', 'dp-item')
      row.appendChild(el('span', null, entry.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, entry.label))
      var progress = entry.certificate === ''
        ? (entry.times > 0 ? ' · 学过 ' + entry.times + ' 次' : '')
        : (entry.certified ? ' · 📜 有证' : ' · 📜 ' + entry.times + '/' + entry.certificateAfter)
      grow.appendChild(el('div', 'dp-dim', entry.minutes + ' 分钟 · ' + entry.cost + ' 🪙 · '
        + entry.traitEmoji + entry.traitLabel + ' +' + entry.gain + progress))
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
