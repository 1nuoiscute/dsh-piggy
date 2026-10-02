// @ts-check
/** App icon appearance lives on this device, separate from the pig save. */
import { button, el } from '../dom.js'
import { iconStyle, setIconStyle } from '../icon-style.js'

export function renderSettingsTab(ui) {
  const intro = el('div', 'dp-pick')
  intro.appendChild(el('b', null, '图标显示'))
  intro.appendChild(el('span', null, '选择主菜单 App 图标的样子。内置图标随游戏提供，设备之间看起来一致。'))
  ui.content.appendChild(intro)
  const chosen = iconStyle()
  for (const option of [
    { key: 'system', title: '系统 Emoji', detail: '使用这台设备自带的表情图标', icon: '🐖' },
    { key: 'built-in', title: '内置图标', detail: '使用游戏附带的手绘 SVG 图标', icon: '🎨' },
  ]) {
    const row = el('div', 'dp-item dp-setting-row')
    row.appendChild(el('span', 'dp-setting-emoji', option.icon))
    const copy = el('span', 'dp-grow')
    copy.appendChild(el('b', null, option.title))
    copy.appendChild(el('small', 'dp-dim', option.detail))
    row.appendChild(copy)
    const pick = button('dp-mini', { 'data-icon-style': option.key }, function () {
      setIconStyle(option.key)
      ui.renderContent()
    })
    pick.textContent = chosen === option.key ? '使用中' : '使用'
    pick.disabled = chosen === option.key
    row.appendChild(pick)
    ui.content.appendChild(row)
  }
}
