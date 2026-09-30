// @ts-check
/**
 * 打工页签。
 *
 * 顶上按技能分（武力 / 魅力 / 智力），跟学习页的学段按钮一个样子；每份工作一行，
 * 只写时长和报酬，门槛收进「详情」里逐条打勾打叉（用户 2026-10-01：别堆一大段字）。
 * @module dsh-pig/client/tabs/work
 */

import { button, el } from '../dom.js'

/** The three skill buttons, in the order QQ Pet lists its traits. */
var SKILLS = [
  { key: 'strong', label: '💪 武力' },
  { key: 'charm', label: '✨ 魅力' },
  { key: 'intel', label: '🧠 智力' },
]

export function renderWorkTab(ui) {
  if (ui.view.jobs.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '宿主还没提供工作列表。'))
    return
  }
  // Older hosts send no trait per job: show them all, as one list.
  var bySkill = ui.view.jobs.some(function (job) { return job.trait !== '' })
  var jobs = ui.view.jobs
  if (bySkill) {
    var seg = el('div', 'dp-seg dp-seg-3')
    for (var s = 0; s < SKILLS.length; s += 1) {
      (function (skill) {
        var count = ui.view.jobs.filter(function (job) { return job.trait === skill.key && job.qualified }).length
        var btn = button(null, { 'data-skill': skill.key }, function () {
          ui.workTrait = skill.key
          ui.jobDetail = null
          ui.renderContent()
        })
        btn.textContent = skill.label + (count > 0 ? ' ' + count : '')
        btn.setAttribute('data-active', skill.key === ui.workTrait ? 'true' : 'false')
        seg.appendChild(btn)
      })(SKILLS[s])
    }
    ui.content.appendChild(seg)
    jobs = ui.view.jobs.filter(function (job) { return job.trait === ui.workTrait })
  }

  var list = el('div', 'dp-list')
  for (var i = 0; i < jobs.length; i += 1) {
    (function (job) {
      var locked = job.qualified === false
      var row = el('div', 'dp-item' + (locked ? ' dp-job-locked' : ''))
      row.appendChild(el('span', null, job.emoji))
      var grow = el('div', 'dp-grow')
      grow.appendChild(el('div', null, job.label))
      grow.appendChild(el('div', 'dp-dim', (locked ? '🔒 ' : '') + job.minutes + ' 分钟 · ' + job.coins + ' 🪙'))
      row.appendChild(grow)
      var open = ui.jobDetail === job.key
      var more = button('dp-mini dp-mini-plain', { 'data-job-detail': job.key }, function () {
        ui.jobDetail = open ? null : job.key
        ui.renderContent()
      })
      more.textContent = open ? '收起' : '详情'
      row.appendChild(more)
      var go = button('dp-mini', { 'data-job': job.key }, function () { ui.send('work', { job: job.key }) })
      go.textContent = '出发'
      go.disabled = !ui.view.canGoOut || locked
      row.appendChild(go)
      list.appendChild(row)
      if (open) list.appendChild(jobDetails(job))
    })(jobs[i])
  }
  ui.content.appendChild(list)
}

/** 详情: every condition with a tick or a cross, then what the job pays and costs. */
function jobDetails(job) {
  var box = el('div', 'dp-pick dp-job-detail')
  box.appendChild(el('div', 'dp-pick-head', job.qualified ? '✓ 条件都够了' : '还差这些'))
  for (var r = 0; r < job.requirements.length; r += 1) {
    var need = job.requirements[r]
    var have = need.kind === 'level' ? '（现在 Lv.' + need.have + '）'
      : need.kind === 'certificate' ? '（' + need.have + '/' + need.need + ' 次）'
        : need.kind === 'every' || need.kind === 'anyOf' ? '（' + need.have + '/' + need.need + ' 门）'
          : '（现在 ' + need.have + ' 节）'
    box.appendChild(el('div', need.met ? 'dp-req dp-req-ok' : 'dp-req', (need.met ? '✓ ' : '✗ ') + need.text + (need.met ? '' : ' ' + have)))
  }
  // A locked job from an older host has no checklist, only the summary line.
  if (job.requirements.length === 0 && job.lockText) box.appendChild(el('div', 'dp-req', '✗ ' + job.lockText))
  box.appendChild(el('div', 'dp-dim', job.traitEmoji + job.traitLabel + ' ' + job.traitPoints
    + (job.payPercent > 0 ? ' · 报酬 +' + job.payPercent + '%' : '')
    + ' · 饱食 ' + job.satiety + ' · 清洁 ' + job.cleanliness))
  return box
}
