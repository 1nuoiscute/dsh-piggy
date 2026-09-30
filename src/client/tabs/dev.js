// @ts-check
/**
 * 调试页签。
 *
 * 仅开发者模式可见：改数值、改时间、一键拿齐。
 * @module dsh-pig/client/tabs/dev
 */

import { button, el } from '../dom.js'

export function renderDevTab(ui) {
  ui.content.appendChild(el('div', 'dp-dev-note', '🔧 开发者模式 · 构建 v' + (ui.view.version === '' ? '未知' : ui.view.version) + ' · Ctrl+Shift+D 关闭'))
  if (ui.view.pig !== null && ui.view.pig.ageForced) {
    ui.content.appendChild(el('div', 'dp-dev-note',
      '⚠️ 年龄是调试改的（HUD 上有 🔧）—— 按「⏪ 年龄归零」才会重新按真实时间算'))
  }

  var p = ui.view.pig
  if (p === null) {
    ui.content.appendChild(el('div', 'dp-empty', '还没有猪。先「拆开纸盒」再调。'))
    return
  }

  /** A row of small buttons under a caption. */
  function group(title, entries) {
    var head = el('div', 'dp-title')
    head.appendChild(el('b', null, title))
    ui.content.appendChild(head)
    var wrap = el('div', 'dp-dev-row')
    for (var i = 0; i < entries.length; i += 1) {
      (function (entry) {
        var btn = button('dp-mini dp-dev-btn', { 'data-dev': entry.key }, function () { entry.run() })
        btn.textContent = entry.label
        wrap.appendChild(btn)
      })(entries[i])
    }
    ui.content.appendChild(wrap)
  }

  var patch = function (body) { ui.send('dev', { patch: body }) }

  group('状态', [
    { key: 'full', label: '😊 满状态', run: function () { patch({ satiety: 100, happiness: 100, cleanliness: 100, health: 5 }) } },
    { key: 'hungry', label: '🍎 饿', run: function () { patch({ satiety: 10 }) } },
    { key: 'dirty', label: '🫧 脏', run: function () { patch({ cleanliness: 10 }) } },
    { key: 'lonely', label: '🥺 孤单', run: function () { patch({ happiness: 10 }) } },
    { key: 'sleepy', label: '💤 困', run: function () { patch({ satiety: 90, happiness: 90, cleanliness: 90 }) } },
  ])

  group('生病', [
    { key: 'cold1', label: '🤒 感冒一期', run: function () { patch({ illness: { chain: 0, stage: 1 }, health: 4 }) } },
    { key: 'cold4', label: '☠️ 肺炎', run: function () { patch({ illness: { chain: 0, stage: 4 }, health: 1 }) } },
    { key: 'cough', label: '🫁 肺结核', run: function () { patch({ illness: { chain: 1, stage: 4 }, health: 1 }) } },
    { key: 'belly', label: '🤢 胃癌', run: function () { patch({ illness: { chain: 2, stage: 4 }, health: 1 }) } },
    { key: 'cure', label: '💚 治好', run: function () { patch({ illness: null, health: 5 }) } },
  ])

  group('年龄', [
    { key: 'box', label: '📦 纸盒', run: function () { patch({ hatched: false }) } },
    { key: 'piglet', label: '小猪', run: function () { patch({ hatched: true, ageDays: 0.2 }) } },
    { key: 'young', label: '青年', run: function () { patch({ ageDays: 2 }) } },
    { key: 'middle', label: '中年', run: function () { patch({ ageDays: 5 }) } },
    { key: 'elder', label: '老年', run: function () { patch({ ageDays: 9 }) } },
    { key: 'gone', label: '🪦 老死', run: function () { patch({ ageDays: 20 }) } },
    { key: 'real', label: '⏪ 年龄归零', run: function () { ui.send('ageFromNow') } },
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
