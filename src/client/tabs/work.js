// @ts-check
/**
 * 打工页签。
 *
 * 工作列表、报酬与门槛。
 * @module dsh-pig/client/tabs/work
 */

import { button, el } from '../dom.js'

export function renderWorkTab(ui) {
  if (ui.view.jobs.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供工作列表。'))
    return
  }
  var list = el('div', 'dp-list')
  for (var i = 0; i < ui.view.jobs.length; i += 1) {
    (function (job) {
      var row = el('div', 'dp-item')
      row.appendChild(el('span', null, job.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, job.label))
      var line = job.minutes + ' 分钟 · 赚 ' + job.coins + ' 🪙'
      if (job.traitPoints > 0) {
        line += ' · 省 ' + job.speedPercent + '% 时间'
      }
      grow.appendChild(el('div', 'dp-dim', line))
      // Spell out which lessons are paying for this, or the linkage between
      // 学习 and 打工 is invisible.
      // Spell out which lesson is paying for this, and stop there — the
      // "go to 学习 to raise it" lecture belongs in the docs, not the panel.
      var byTrait = job.traitEmoji + job.traitLabel + ' ' + job.traitPoints
        + (job.payPercent > 0 ? ' · 报酬 +' + job.payPercent + '%' : '')
      grow.appendChild(el('div', 'dp-dim', byTrait))
      // A gate with no reason on screen is a bug report waiting to happen.
      var locked = job.qualified === false
      if (locked) grow.appendChild(el('div', 'dp-lock', '🔒 需要 ' + job.lockText))
      row.appendChild(grow)
      var go = button('dp-mini', { 'data-job': job.key }, function () { ui.send('work', { job: job.key }) })
      go.textContent = locked ? '没资格' : '出发'
      go.disabled = !ui.view.canGoOut || locked
      row.appendChild(go)
      list.appendChild(row)
    })(ui.view.jobs[i])
  }
  ui.content.appendChild(list)
}
