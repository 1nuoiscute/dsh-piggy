// @ts-check
/**
 * 学习页签。
 *
 * 三层小方块：学段方块（含「兴趣」）→ 这一段的课程方块 → 点开一门课的详情
 * 与「去上课」。第二、三层左上角都有「← 返回」。
 * @module dsh-pig/client/tabs/study
 */

import { STAGES } from '../constants.js'
import { button, el } from '../dom.js'
import { backRow, tile, tileGrid } from '../widgets.js'

/** The seg key that shows the interest list instead of a stage. */
export const INTEREST_TAB = 'interest'

/** Where a subject stands relative to one stage: 'current' | 'done' | 'ahead'. */
function standing(sub, stage) {
  if (stage === null || sub.stageKey === '') return 'current'
  if (sub.stageKey === stage.key) return 'current'
  if (stage.upTo !== null && sub.lessons >= stage.upTo) return 'done'
  return 'ahead'
}

/** "1-9" / "10+" — the badge on a stage tile. */
function spanOf(stage) {
  return stage.upTo === null ? String(stage.from + 1) + '+' : (stage.from + 1) + '-' + stage.upTo
}

export function renderStudyTab(ui) {
  if (ui.view.subjects.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供课程表。'))
    return
  }

  // ---- 第三层：一门课的详情 ----
  if (ui.studyCourse !== null) {
    var course = null
    var interest = null
    for (var c = 0; c < ui.view.subjects.length; c += 1) if (ui.view.subjects[c].key === ui.studyCourse) course = ui.view.subjects[c]
    for (var t = 0; t < ui.view.interests.length; t += 1) if (ui.view.interests[t].key === ui.studyCourse) interest = ui.view.interests[t]
    if (course !== null || interest !== null) {
      renderCourse(ui, course, interest)
      return
    }
    ui.studyCourse = null
  }

  // ---- 第一层：学段方块（+ 兴趣）----
  if (ui.stage === null) {
    var grid = tileGrid()
    var stageList = ui.view.stages.length > 0 ? ui.view.stages : STAGES
    for (var s = 0; s < stageList.length; s += 1) {
      (function (entry) {
        var detail = null
        for (var k = 0; k < ui.view.stages.length; k += 1) if (ui.view.stages[k].key === entry.key) detail = ui.view.stages[k]
        var locked = detail !== null && detail.unlocked === false
        grid.appendChild(tile({
          emoji: detail === null || detail.emoji === undefined ? '📚' : detail.emoji,
          label: entry.label,
          badge: detail === null ? '' : spanOf(detail),
          tag: locked ? '🔒' : '',
          note: locked ? (detail.progress === null ? '还没开' : detail.progress.done + '/' + detail.progress.need) : detail.tuition + ' 🪙',
          locked,
          data: { 'data-stage': entry.key },
          onPick: function () {
            ui.stage = entry.key
            ui.studyCourse = null
            ui.renderContent()
          },
        }))
      })(stageList[s])
    }
    if (ui.view.interests.length > 0) {
      grid.appendChild(tile({
        emoji: '🎯',
        label: '兴趣',
        badge: String(ui.view.interests.length),
        note: '随时能学',
        data: { 'data-stage': INTEREST_TAB },
        onPick: function () {
          ui.stage = INTEREST_TAB
          ui.studyCourse = null
          ui.renderContent()
        },
      }))
    }
    ui.content.appendChild(grid)
    return
  }

  // ---- 第二层：这一段的课程方块 ----
  if (ui.stage === INTEREST_TAB) {
    ui.content.appendChild(backRow('兴趣', function () {
      ui.stage = null
      ui.renderContent()
    }))
    var igrid = tileGrid()
    for (var n = 0; n < ui.view.interests.length; n += 1) {
      (function (entry) {
        igrid.appendChild(tile({
          emoji: entry.emoji,
          label: entry.label,
          badge: entry.certified ? '📜' : (entry.times > 0 ? String(entry.times) : ''),
          note: entry.traitEmoji + entry.traitLabel + ' +' + entry.gain,
          data: { 'data-interest-open': entry.key },
          onPick: function () {
            ui.studyCourse = entry.key
            ui.renderContent()
          },
        }))
      })(ui.view.interests[n])
    }
    ui.content.appendChild(igrid)
    return
  }

  var detail = null
  for (var d = 0; d < ui.view.stages.length; d += 1) if (ui.view.stages[d].key === ui.stage) detail = ui.view.stages[d]
  ui.content.appendChild(backRow(detail === null ? '学段' : detail.label, function () {
    ui.stage = null
    ui.renderContent()
  }))
  var subjects = tileGrid()
  for (var i = 0; i < ui.view.subjects.length; i += 1) {
    (function (sub) {
      var where = standing(sub, detail)
      var done = detail !== null && detail.upTo !== null ? sub.lessons - detail.from : sub.lessons
      subjects.appendChild(tile({
        emoji: sub.emoji,
        label: sub.label,
        badge: where === 'done' ? '✓' : where === 'ahead' ? '🔒' : String(done),
        note: sub.traitLabel,
        locked: where === 'ahead',
        dim: where === 'done',
        data: { 'data-subject': sub.key },
        onPick: function () {
          ui.studyCourse = sub.key
          ui.renderContent()
        },
      }))
    })(ui.view.subjects[i])
  }
  ui.content.appendChild(subjects)
}

/** 第三层：一门课到底给什么，以及「去上课」/「去学」。 */
function renderCourse(ui, course, interest) {
  var entry = course !== null ? course : interest
  var isInterest = course === null
  ui.content.appendChild(backRow(entry.label, function () {
    ui.studyCourse = null
    ui.renderContent()
  }))

  var card = el('div', 'dp-pick')
  card.appendChild(el('div', 'dp-pick-head', entry.emoji + ' ' + entry.label))
  if (isInterest) {
    card.appendChild(el('div', 'dp-dim', entry.minutes + ' 分钟 · ' + entry.cost + ' 🪙 · '
      + entry.traitEmoji + entry.traitLabel + ' +' + entry.gain))
    if (typeof entry.blurb === 'string' && entry.blurb !== '') card.appendChild(el('div', 'dp-dim', entry.blurb))
    if (entry.times > 0) card.appendChild(el('div', 'dp-dim', '学过 ' + entry.times + ' 次'))
    var learn = button('dp-btn dp-btn-wide', { 'data-interest': entry.key }, function () {
      ui.send('interest', { interest: entry.key })
    })
    learn.textContent = entry.times > 0 ? '再学一次' : '去学'
    learn.disabled = !ui.view.canGoOut || !entry.affordable
    card.appendChild(learn)
    ui.content.appendChild(card)
    return
  }

  var detail = null
  for (var d = 0; d < ui.view.stages.length; d += 1) if (ui.view.stages[d].key === ui.stage) detail = ui.view.stages[d]
  var where = standing(course, detail)
  var done = detail !== null && detail.upTo !== null ? course.lessons - detail.from : course.lessons
  if (detail !== null) {
    card.appendChild(el('div', 'dp-dim', detail.minutes + ' 分钟 · 学费 ' + detail.tuition + ' 🪙 · '
      + course.traitLabel + ' +' + detail.gain))
  }
  card.appendChild(el('div', 'dp-dim', '这一段上过 ' + done + ' 节'))
  if (typeof course.blurb === 'string' && course.blurb !== '') card.appendChild(el('div', 'dp-dim', course.blurb))
  if (where === 'done') card.appendChild(el('div', 'dp-dim', '✓ 这一段已经念完了'))
  if (where === 'ahead') card.appendChild(el('div', 'dp-dim', '🔒 还在' + (course.stageLabel || '下一段')))
  var go = button('dp-btn dp-btn-wide', { 'data-subject': course.key }, function () {
    ui.send('study', { subject: course.key })
  })
  go.textContent = '去上课'
  go.disabled = where !== 'current' || !ui.view.canGoOut || !course.affordable
  card.appendChild(go)
  ui.content.appendChild(card)
}
