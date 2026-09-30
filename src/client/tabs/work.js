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
  // Thirty-odd jobs read better in the ladder's own tiers (B4): the shift
  // length is what marks a tier, so it doubles as the heading.
  var TIERS = [[45, '🌱 起步'], [60, '📚 小学毕业'], [120, '🏫 中学毕业'], [240, '🏛 大学毕业'], [Infinity, '🔬 研究生']]
  var tierOf = function (job) {
    var minutes = job.baseMinutes || job.minutes
    for (var t = 0; t < TIERS.length; t += 1) if (minutes <= TIERS[t][0]) return TIERS[t][1]
    return ''
  }
  var list = el('div', 'dp-list')
  var lastTier = null
  for (var i = 0; i < ui.view.jobs.length; i += 1) {
    (function (job) {
      var tier = tierOf(job)
      if (tier !== lastTier && ui.view.jobs.length > 12) {
        lastTier = tier
        var head = el('div', 'dp-title')
        head.appendChild(el('b', null, tier))
        list.appendChild(head)
      }
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
