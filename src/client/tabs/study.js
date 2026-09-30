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
import { section } from '../widgets.js'

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
  if (detail !== null && detail.unlocked === false && detail.progress !== null) {
    ui.content.appendChild(el('div', 'dp-locked',
      '🔒 要先' + detail.progress.label + '（现在最多 ' + detail.progress.done + ' 节）'))
  }

  // 默认只看到科目名字与进度；点开一门才展开它的细节和「去上课」（用户反馈 #3）。
  for (var i = 0; i < ui.view.subjects.length; i += 1) {
    (function (sub) {
      var where = standing(sub, detail)
      var state = where === 'done' ? '✓ 已毕业'
        : where === 'ahead' ? '🔒 还在' + (sub.stageLabel || '下一段')
          : sub.traitLabel + ' · ' + (detail !== null && detail.upTo !== null
            ? (sub.lessons - detail.from) + '/' + (detail.upTo - detail.from) + ' 节'
            : '上过 ' + sub.lessons + ' 节')
      section(ui, 'study:' + sub.key, sub.emoji + ' ' + sub.label + '　' + state, function (body) {
        var facts = []
        if (detail !== null) {
          var span = detail.upTo !== null ? '第 ' + (detail.from + 1) + '–' + detail.upTo + ' 节' : '第 ' + (detail.from + 1) + ' 节起'
          facts.push(span + ' · ' + detail.minutes + ' 分钟 · 学费 ' + detail.tuition + ' 🪙 · ' + sub.traitLabel + ' +' + detail.gain)
        }
        if (typeof sub.blurb === 'string' && sub.blurb !== '') facts.push(sub.blurb)
        for (var f = 0; f < facts.length; f += 1) body.appendChild(el('div', 'dp-dim', facts[f]))
        var go = button('dp-mini', { 'data-subject': sub.key }, function () { ui.send('study', { subject: sub.key }) })
        go.textContent = '去上课'
        go.disabled = where !== 'current' || !ui.view.canGoOut || !sub.affordable
        body.appendChild(go)
      })
    })(ui.view.subjects[i])
  }
}

/** The interest list, shown when the 兴趣 button is selected. */
function renderInterests(ui) {
  // Same note line as a stage: what this list is about, in one short row.
  var after = ui.view.interests[0].certificateAfter
  var note = el('div', 'dp-empty', after > 0 ? '随时能学 · 同一门上满 ' + after + ' 次拿证' : '随时能学')
  note.style.marginBottom = '7px'
  note.style.marginTop = '0'
  ui.content.appendChild(note)
  for (var n = 0; n < ui.view.interests.length; n += 1) {
    (function (entry) {
      var progress = entry.certificate === ''
        ? (entry.times > 0 ? ' · 学过 ' + entry.times + ' 次' : '')
        : (entry.certified ? ' · 📜 有证' : ' · 📜 ' + entry.times + '/' + entry.certificateAfter)
      section(ui, 'interest:' + entry.key, entry.emoji + ' ' + entry.label + '　' + entry.traitEmoji + entry.traitLabel + progress, function (body) {
        body.appendChild(el('div', 'dp-dim', entry.minutes + ' 分钟 · ' + entry.cost + ' 🪙 · ' + entry.traitLabel + ' +' + entry.gain))
        if (typeof entry.blurb === 'string' && entry.blurb !== '') body.appendChild(el('div', 'dp-dim', entry.blurb))
        var go = button('dp-mini', { 'data-interest': entry.key }, function () { ui.send('interest', { interest: entry.key }) })
        go.textContent = entry.times > 0 ? '再学' : '去学'
        go.disabled = !ui.view.canGoOut || !entry.affordable
        body.appendChild(go)
      })
    })(ui.view.interests[n])
  }
}

