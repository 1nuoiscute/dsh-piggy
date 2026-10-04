// @ts-check
/**
 * 「扩展」App：番茄钟、钓鱼……每个扩展一张卡片，可以单独开关（设计见 docs/design/extension-center.md）。
 * 开关存在存档里；关掉后它在界面上完全消失、后台也不再结算，数据保留，再打开原样恢复。
 * 进行中也能关：番茄钟放弃这一个，自动钓鱼的猪叫回来、鱼饵退回（卡片上提前说清楚）。
 */
import { button, el } from '../dom.js'

/** 关掉时会顺带收尾的事，提前写在卡片上。 @param {any} view @param {string} key */
function closingNote(view, key) {
  if (key === 'pomodoro' && view.pomodoro !== null && view.pomodoro.active) return '正在专注：关掉会放弃这一个，不给奖励'
  if (key === 'fishing' && view.activity?.kind === 'fishing') return '猪正在外面钓鱼：关掉会把它叫回来，鱼饵退回'
  return ''
}

export function renderExtensionsTab(ui) {
  const intro = el('div', 'dp-ext-intro')
  intro.appendChild(el('span', null, '用不上的玩法可以关掉：主菜单、商店、图鉴里都不再出现，数据会留着，随时打开恢复。'))
  ui.content.appendChild(intro)
  for (const extension of ui.view.extensions) {
    const card = el('div', 'dp-set dp-ext-card')
    card.setAttribute('data-extension', extension.key)
    const head = el('div', 'dp-set-head')
    head.appendChild(el('span', 'dp-ext-emoji', extension.emoji))
    head.appendChild(el('b', null, extension.label))
    const toggle = button('dp-switch', { 'data-extension-toggle': extension.key, 'aria-pressed': String(extension.on) }, function () {
      ui.send('setExtension', { key: extension.key, on: !extension.on })
    })
    toggle.appendChild(el('span', 'dp-switch-knob'))
    toggle.appendChild(el('span', 'dp-switch-text', extension.on ? '开' : '关'))
    head.appendChild(toggle)
    if (extension.description) head.appendChild(el('small', 'dp-dim', extension.description))
    card.appendChild(head)
    const note = extension.on ? closingNote(ui.view, extension.key) : ''
    if (note) card.appendChild(el('div', 'dp-ext-note', note))
    ui.content.appendChild(card)
  }
  ui.content.appendChild(el('div', 'dp-ext-later', '以后会在这里添加更多扩展'))
}
