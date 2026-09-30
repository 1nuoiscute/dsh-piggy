// @ts-check
/**
 * 学习页签。
 *
 * 九门课（B4）：每门课各算各的课时，格子里写这门课在哪个学段、下一节多久多少钱、
 * 还差几节毕业；下面是兴趣课和证书进度。
 * @module dsh-pig/client/tabs/study
 */

import { button, el } from '../dom.js'

export function renderStudyTab(ui) {
  if (ui.view.subjects.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供课程表。'))
    return
  }
  var grid = el('div', 'dp-grid')
  for (var i = 0; i < ui.view.subjects.length; i += 1) {
    (function (sub) {
      var btn = button('dp-item', { 'data-subject': sub.key }, function () {
        ui.send('study', { subject: sub.key })
      })
      btn.disabled = !ui.view.canGoOut || !sub.affordable
      btn.style.cursor = 'pointer'
      btn.style.textAlign = 'left'
      btn.appendChild(el('span', null, sub.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, sub.label + (sub.stageLabel ? ' · ' + sub.stageLabel : '')))
      // Kept short: two columns of a 292px panel. The count is what gates jobs.
      grow.appendChild(el('div', 'dp-dim', '上过 ' + sub.lessons + ' 节'
        + (sub.nextGraduation !== null ? ' · 差 ' + (sub.nextGraduation - sub.lessons) + ' 节毕业' : '')))
      grow.appendChild(el('div', 'dp-dim', sub.minutes + ' 分 · ' + sub.tuition + ' 🪙 · '
        + sub.traitEmoji + '+' + sub.gain))
      btn.appendChild(grow)
      grid.appendChild(btn)
    })(ui.view.subjects[i])
  }
  ui.content.appendChild(grid)

  // ---- 兴趣：随时能学，上满几次拿证，有些工作要凭证上岗 ----
  if (ui.view.interests.length > 0) {
    var ihead = el('div', 'dp-title')
    ihead.style.marginTop = '10px'
    ihead.appendChild(el('b', null, '🎯 兴趣 · 证书'))
    ui.content.appendChild(ihead)
    var ilist = el('div', 'dp-list')
    for (var n = 0; n < ui.view.interests.length; n += 1) {
      (function (entry) {
        var row = el('div', 'dp-item')
        row.appendChild(el('span', null, entry.emoji))
        var grow = el('div', 'dp-grow')
        grow.appendChild(el('div', null, entry.label))
        var progress = entry.certificate === ''
          ? (entry.times > 0 ? ' · 学过 ' + entry.times + ' 次' : '')
          : (entry.certified
            ? ' · 📜 已有' + entry.certificate
            : ' · 📜 ' + entry.certificate + ' ' + entry.times + '/' + entry.certificateAfter)
        grow.appendChild(el('div', 'dp-dim', entry.minutes + ' 分 · ' + entry.cost + ' 🪙 · '
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
}
