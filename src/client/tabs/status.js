// @ts-check
/**
 * 状态页签。
 *
 * 属性条、三维、体重金币与照顾入口。
 * @module dsh-piggy/client/tabs/status
 */

import { CARE_LABEL, MODES } from '../constants.js'
import { button, el } from '../dom.js'
import { labelledBar, pickerPanel } from '../widgets.js'

export function renderStatusTab(ui) {
  var p = ui.view.pig
  if (p === null) return
  renderBanners(ui)
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
  if (p.bodyWeight !== null) renderWeightInfo(ui, p.bodyWeight)


  // 签到进度：一行小字，不抢注意力（礼包攒着的时候顺带说一句）。
  var daily = ui.view.daily
  var dailyLine = el('div', 'dp-row')
  dailyLine.appendChild(el('span', null, '📅 签到'))
  dailyLine.appendChild(el('b', null, '第 ' + daily.signInDay + '/' + daily.cycle + ' 天'
    + (daily.canSignIn ? ' · 今天还没签' : '')
    + (daily.unclaimed > 0 ? ' · 🎁 ' + daily.unclaimed : '')))
  ui.content.appendChild(dailyLine)

  // C2：番茄钟今天完成了几个（没有番茄钟字段的老宿主不显示）。
  var pomodoro = ui.view.pomodoro
  if (pomodoro !== null && pomodoro.todayDone > 0) {
    var pomoRow = el('div', 'dp-row')
    pomoRow.appendChild(el('span', null, '🍅 番茄钟'))
    pomoRow.appendChild(el('b', null, '今天 ' + pomodoro.todayDone + ' 个'))
    ui.content.appendChild(pomoRow)
  }

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
  // 用户 2026-10-01：别把称呼印在面板上（「叫你『大爹』」那行删了），
  // 只留两个改名按钮 —— 一个改主人称呼，一个改猪的名字。
  if (ui.ownerEdit !== null || ui.pigNameEdit !== null) {
    var forPig = ui.pigNameEdit !== null
    var input = /** @type {HTMLInputElement} */ (el('input', 'dp-input'))
    input.value = forPig ? ui.pigNameEdit : ui.ownerEdit
    input.maxLength = 16
    input.setAttribute(forPig ? 'data-pig-input' : 'data-owner-input', 'true')
    input.addEventListener('input', function () {
      if (forPig) ui.pigNameEdit = input.value
      else ui.ownerEdit = input.value
    })
    var save = button('dp-mini', { 'data-name-save': forPig ? 'pig' : 'owner' }, function () {
      var name = ((forPig ? ui.pigNameEdit : ui.ownerEdit) || '').trim()
      if (forPig) ui.pigNameEdit = null
      else ui.ownerEdit = null
      if (name !== '') ui.send(forPig ? 'name' : 'owner', { name: name })
      ui.renderContent()
    })
    save.textContent = '好'
    var cancel = button('dp-mini dp-mini-plain', { 'data-name-cancel': 'true' }, function () {
      ui.ownerEdit = null
      ui.pigNameEdit = null
      ui.renderContent()
    })
    cancel.textContent = '算了'
    row.appendChild(input)
    row.appendChild(save)
    row.appendChild(cancel)
    return row
  }
  var renameOwner = button('dp-mini dp-mini-plain', { 'data-owner-edit': 'true' }, function () {
    ui.ownerEdit = ui.view.dialogue.ownerName
    ui.renderContent()
  })
  renameOwner.textContent = '✏️ 称呼'
  renameOwner.title = '现在叫「' + ui.view.dialogue.ownerName + '」'
  var renamePig = button('dp-mini dp-mini-plain', { 'data-pig-edit': 'true' }, function () {
    ui.pigNameEdit = ui.view.pig === null ? '' : ui.view.pig.name
    ui.renderContent()
  })
  renamePig.textContent = '✏️ 名字'
  renamePig.title = ui.view.pig === null ? '猪还没来' : '现在叫「' + ui.view.pig.name + '」'
  var quiet = button('dp-mini dp-mini-plain', { 'data-quiet': ui.view.dialogue.quiet ? 'on' : 'off' }, function () {
    ui.send('quiet', { on: !ui.view.dialogue.quiet })
  })
  quiet.textContent = ui.view.dialogue.quiet ? '🔕 免打扰中' : '🔔 免打扰'
  row.appendChild(renameOwner)
  row.appendChild(renamePig)
  row.appendChild(quiet)
  return row
}

/**
 * The pig's banners — gone, sick, or out — at the top of the status tab only
 * (B9: they used to sit above every tab, the shop included).
 */
function renderBanners(ui) {
  if (ui.view.pig !== null && ui.view.dead) {
    var dead = el('div', 'dp-alert dp-dead')
    dead.appendChild(el('b', null, '🪦 ' + ui.view.pig.name + ' 走了' + (ui.view.pig.soul ? '，灵魂还留在墓碑上 👻' : '')))
    dead.appendChild(el('div', null, ui.view.pig.soul
      ? '用还魂丹可以把它叫回来，也可以领养新的'
      : '背包里的还魂丹就能救回来'))
    ui.content.appendChild(dead)
    // Adopting is available the moment the pig dies — not only once the
    // soul turns up a day later. Waiting a day to start over was a
    // mistake: the grave is already a dead end with nothing to do.
    var adoptWrap = el('div', 'dp-actions')
    var adopt = button('dp-btn dp-btn-wide', { 'data-action': 'adopt' }, function () { ui.send('adopt') })
    adopt.appendChild(el('span', null, '📦'))
    adopt.appendChild(el('span', null, '领养新猪'))
    adoptWrap.appendChild(adopt)
    ui.content.appendChild(adoptWrap)
  } else if (ui.view.pig !== null && ui.view.pig.illness !== null) {
    var illness = ui.view.pig.illness
    var sick = el('div', 'dp-alert dp-sick')
    sick.appendChild(el('b', null, '🤒 ' + illness.name + '（第 ' + illness.stage + '/4 期）'))
    // B3: every stage has its own cure, and the wrong one makes it worse,
    // so the alert always names the exact medicine.
    sick.appendChild(el('div', null, '需要「' + illness.cureEmoji + illness.cure + '」—— 吃错药会加重'))
    var needed = null
    var shelf = ui.view.shop || []
    for (var c = 0; c < shelf.length; c += 1) {
      if (shelf[c].needed) needed = shelf[c]
    }
    // Hosts from before B3 do not flag the cure: match it by stage tier,
    // then by name.
    for (var t = 0; needed === null && t < shelf.length; t += 1) {
      if (shelf[t].kind === 'medicine' && shelf[t].tier === illness.stage) needed = shelf[t]
    }
    for (var n = 0; needed === null && n < shelf.length; n += 1) {
      if (shelf[n].label === illness.cure) needed = shelf[n]
    }
    if (ui.view.canGoOut) {
      sick.appendChild(el('div', 'dp-dim', '带病出门报酬减半、病情更快'))
    }
    if (needed !== null && ui.view.canGoOut && ui.view.pig.coins < needed.price) {
      sick.appendChild(el('div', 'dp-dim', '还差 ' + needed.price + ' 🪙 买「' + needed.label + '」，先去打工'))
    }
    ui.content.appendChild(sick)
    if (illness.doctorFee !== null) {
      var clinic = el('div', 'dp-actions')
      var doctor = button('dp-btn dp-btn-wide', { 'data-action': 'doctor' }, function () { ui.send('doctor') })
      doctor.appendChild(el('span', null, '🏥'))
      doctor.appendChild(el('span', null, '看医生（' + illness.doctorFee + ' 🪙）'))
      clinic.appendChild(doctor)
      ui.content.appendChild(clinic)
    }
  } else if (ui.view.pig !== null && ui.view.activity !== null) {
    var away = el('div', 'dp-alert dp-work')
    away.appendChild(el('b', null, ui.view.activity.emoji + ' 在外面：' + ui.view.activity.label))
    away.appendChild(el('div', null, '还有 ' + ui.view.activity.secondsLeft + ' 秒'))
    ui.content.appendChild(away)
    var wrap = el('div', 'dp-actions')
    var call = button('dp-btn dp-btn-wide', { 'data-action': 'calloff' }, function () { ui.send('calloff') })
    call.appendChild(el('span', null, '↩️'))
    call.appendChild(el('span', null, '叫它回来'))
    wrap.appendChild(call)
    ui.content.appendChild(wrap)
  }
}

/** Body targets come from the core; this tab only presents them. */
function renderWeightInfo(ui, weight) {
  var label = weight.isFat ? (weight.visible ? '肥猪' : '体重偏高') : '普通体型'
  var line = el('div', 'dp-row')
  line.appendChild(el('span', null, label + ' · 参考 ' + weight.ideal))
  line.appendChild(el('span', null, weight.isFat ? '减到 ' + weight.restoreAt + ' 恢复' : weight.fatAt + ' 变胖'))
  ui.content.appendChild(line)
  var exercise = el('div', 'dp-row')
  exercise.appendChild(el('span', null, '今日玩耍减重剩余 ' + weight.playsLeft + ' 次'))
  ui.content.appendChild(exercise)
}
