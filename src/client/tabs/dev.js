// @ts-check
/**
 * 调试页签。
 *
 * 仅开发者模式可见：改数值、改时间、一键拿齐。
 * @module dsh-piggy/client/tabs/dev
 */

import { button, el } from '../dom.js'

export function renderDevTab(ui) {
  // 关掉调试模式就靠这个按钮（C1：没有快捷键，也不写 localStorage）。
  var topBar = el('div', 'dp-dev-row')
  var off = button('dp-mini dp-dev-btn', { 'data-dev': 'devOff' }, function () { ui.devOff() })
  off.textContent = '🔧 关闭调试'
  topBar.appendChild(off)
  ui.content.appendChild(topBar)
  ui.content.appendChild(el('div', 'dp-dev-note', '🔧 开发者模式 · 构建 v' + (ui.view.version === '' ? '未知' : ui.view.version)))
  if (ui.view.pig !== null && ui.view.pig.ageForced) {
    ui.content.appendChild(el('div', 'dp-dev-note',
      '⚠️ 年龄是调试改的（HUD 上有 🔧）—— 按「⏪ 年龄归零」才会重新按真实时间算'))
  }

  /** A row of small buttons under a caption. `off` greys one out, `note` explains why. */
  function group(title, entries, note) {
    var head = el('div', 'dp-title')
    head.appendChild(el('b', null, title))
    ui.content.appendChild(head)
    if (note !== undefined && note !== '') ui.content.appendChild(el('div', 'dp-dev-note', note))
    var wrap = el('div', 'dp-dev-row')
    for (var i = 0; i < entries.length; i += 1) {
      (function (entry) {
        var btn = button('dp-mini dp-dev-btn', { 'data-dev': entry.key }, function () { entry.run() })
        btn.textContent = entry.label
        if (entry.off === true) btn.disabled = true
        wrap.appendChild(btn)
      })(entries[i])
    }
    ui.content.appendChild(wrap)
  }

  var patch = function (body) { ui.send('dev', { patch: body }) }

  // 形态（C1）：一键变成每一种形态，不看条件。等级不够就**同一次补丁里**把等级顶到
  // 这一形态所在阶段的起始等级 —— 不然换了形态立绘也不动（formStageView 只在该阶段画）。
  // 起始等级由宿主从 data/life.js 发下来，这里不写死数字。
  // 这一组放在「还没有猪」之前：纸盒也要看得到，才知道该先做什么。
  var boxed = ui.view.hatched !== true || ui.view.pig === null
  var dead = ui.view.dead === true
  var why = boxed ? '先孵化' : (dead ? '先复活' : '')
  var forms = ui.view.forms === null ? [] : ui.view.forms.forms
  var formEntries = forms.map(function (form) {
    return {
      key: 'form:' + form.key,
      label: form.emoji + ' ' + form.label,
      off: boxed || dead,
      run: function () {
        var body = { form: form.key }
        var level = ui.view.pig === null ? 0 : ui.view.pig.level.level
        if (level < form.fromLevel) body.level = form.fromLevel
        patch(body)
      },
    }
  })
  formEntries.push({ key: 'form:none', label: '🐖 恢复普通', run: function () { patch({ form: null }) } })
  group('形态', formEntries, why)

  // 形态组之后才管「有没有猪」：纸盒也要看到上面那排（置灰 + 原因）。
  var p = ui.view.pig
  if (p === null) {
    ui.content.appendChild(el('div', 'dp-empty', '还没有猪。先「拆开纸盒」再调。'))
    return
  }

  group('状态', [
    { key: 'full', label: '😊 满状态', run: function () { patch({ satiety: 100, happiness: 100, cleanliness: 100, health: 5 }) } },
    { key: 'hungry', label: '🍎 饿', run: function () { patch({ satiety: 10 }) } },
    { key: 'dirty', label: '🫧 脏', run: function () { patch({ cleanliness: 10 }) } },
    { key: 'lonely', label: '🥺 孤单', run: function () { patch({ happiness: 10 }) } },
    { key: 'sleepy', label: '💤 困', run: function () { patch({ satiety: 90, happiness: 90, cleanliness: 90 }) } },
  ])

  // Five chains since B3: stage 1 of each, the last stage of one, and a cure.
  group('生病', [
    { key: 'cold1', label: '🤧 感冒', run: function () { patch({ illness: { chain: 0, stage: 1 }, health: 4 }) } },
    { key: 'cough1', label: '😷 咳嗽', run: function () { patch({ illness: { chain: 1, stage: 1 }, health: 4 }) } },
    { key: 'belly1', label: '🤢 肚子胀', run: function () { patch({ illness: { chain: 2, stage: 1 }, health: 4 }) } },
    { key: 'dizzy1', label: '😵 头晕', run: function () { patch({ illness: { chain: 3, stage: 1 }, health: 4 }) } },
    { key: 'skin1', label: '🩹 瘙痒', run: function () { patch({ illness: { chain: 4, stage: 1 }, health: 4 }) } },
    { key: 'cold4', label: '☠️ 肺炎', run: function () { patch({ illness: { chain: 0, stage: 4 }, health: 1 }) } },
    { key: 'cure', label: '💚 治好', run: function () { patch({ illness: null, health: 5 }) } },
  ])

  // The body follows the level since B2: these jump straight to each stage.
  group('等级', [
    { key: 'box', label: '📦 纸盒', run: function () { patch({ hatched: false }) } },
    { key: 'lv1', label: '幼年 Lv1', run: function () { patch({ hatched: true, level: 1 }) } },
    { key: 'lv10', label: '青年 Lv10', run: function () { patch({ level: 10 }) } },
    { key: 'lv40', label: '成年 Lv40', run: function () { patch({ level: 40 }) } },
    { key: 'lv60', label: '满级 Lv60', run: function () { patch({ level: 60 }) } },
    { key: 'real', label: '⏪ 天数归零', run: function () { ui.send('ageFromNow') } },
  ])

  // 番茄钟（C2）：一键完成当前这个（照常结算发奖）／把今天的完成数设成 8 测上限。
  group('番茄钟', [
    { key: 'pomoDone', label: '🍅 完成当前', run: function () { patch({ pomodoro: { finish: true } }) } },
    { key: 'pomoCap', label: '🔢 今天=8', run: function () { patch({ pomodoro: { todayDone: 8 } }) } },
  ])

  group('资源', [
    { key: 'coin100', label: '🪙 +100', run: function () { patch({ coins: p.coins + 100 }) } },
    { key: 'coin999', label: '🪙 9999', run: function () { patch({ coins: 9999 }) } },
    { key: 'traits', label: '🧠+5 ✨+5 💪+5', run: function () { patch({ traits: { intel: 5, charm: 5, strong: 5 } }) } },
    { key: 'all', label: '🎁 一键拿齐', run: function () { ui.send('giveAll') } },
  ])

  group('时间', [
    { key: 'real', label: '×1 真实', run: function () { ui.send('timeScale', { scale: 1 }) } },
    { key: 'fast12', label: '×12', run: function () { ui.send('timeScale', { scale: 12 }) } },
    { key: 'fast30', label: '×30', run: function () { ui.send('timeScale', { scale: 30 }) } },
    { key: 'fast60', label: '×60', run: function () { ui.send('timeScale', { scale: 60 }) } },
  ])

  group('生死', [
    { key: 'kill', label: '💀 弄死', run: function () { patch({ dead: true }) } },
    { key: 'revive', label: '✨ 复活', run: function () { patch({ dead: false, health: 5 }) } },
    { key: 'adopt', label: '📦 领养', run: function () { ui.send('adopt') } },
    { key: 'reset', label: '🔄 重置', run: function () { ui.send('reset') } },
  ])

  group('面板', [
    { key: 'open', label: '展开/收起', run: function () { ui.setOpen(ui.host.getAttribute('data-open') !== 'true') } },
    { key: 'away1', label: '⏩ +1 小时', run: function () { patch({ __advanceMs: 3600000 }) } },
    { key: 'away24', label: '⏩ +1 天', run: function () { patch({ __advanceMs: 86400000 }) } },
  ])

  ui.content.appendChild(el('div', 'dp-dev-note',
    '当前：' + p.stage.label + ' · 健康 ' + p.health + ' · 🪙 ' + p.coins
    + (p.illness === null ? '' : ' · ' + p.illness.name)))
}
