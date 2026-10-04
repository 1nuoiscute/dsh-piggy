// @ts-check
/** App icon appearance lives on this device, separate from the pig save. */
import { button, el } from '../dom.js'
import { iconStyle, setIconStyle } from '../icon-style.js'
import { autoCollapseEnabled, setAutoCollapse } from '../auto-collapse.js'
import { desktopShell } from '../desktop-shell.js'
import { PIG_SIZES, displayedPigSize, pigSize, setPigSize } from '../pig-size.js'

export function renderSettingsTab(ui) {
  const sizeIntro = el('div', 'dp-pick')
  sizeIntro.appendChild(el('b', null, '小猪大小'))
  sizeIntro.appendChild(el('span', null, '只调整这台设备上的显示大小，不改变存档。'))
  ui.content.appendChild(sizeIntro)
  const labels = { small: '小', standard: '标准', large: '大', extra: '特大' }
  for (const size of PIG_SIZES) {
    const row = el('div', 'dp-item dp-setting-row')
    row.appendChild(el('span', 'dp-setting-emoji', '🐖'))
    const copy = el('span', 'dp-grow')
    copy.appendChild(el('b', null, labels[size]))
    row.appendChild(copy)
    const pick = button('dp-mini', { 'data-pig-size': String(size) }, function () {
      setPigSize(size)
      const stageSize = ui.view.hatched ? ui.view.pig.stage.size : ui.view.boxStage.size
      ui.host.style.setProperty('--pig-size', displayedPigSize(stageSize) + 'px')
      ui.renderContent()
      ui.fitPanel()
      desktopShell()?.syncGeometry?.()
    })
    pick.textContent = pigSize() === size ? '使用中' : '使用'
    pick.disabled = pigSize() === size
    row.appendChild(pick)
    ui.content.appendChild(row)
  }

  const closeRow = el('div', 'dp-item dp-setting-row')
  closeRow.appendChild(el('span', 'dp-setting-emoji', '🪟'))
  const closeCopy = el('span', 'dp-grow')
  closeCopy.appendChild(el('b', null, '点击别处时收起面板'))
  closeCopy.appendChild(el('small', 'dp-dim', '网页版点面板外，桌面版切到其他窗口时收起'))
  closeRow.appendChild(closeCopy)
  const close = button('dp-mini', { 'data-auto-collapse': String(!autoCollapseEnabled()) }, function () {
    setAutoCollapse(!autoCollapseEnabled())
    ui.renderContent()
  })
  close.textContent = autoCollapseEnabled() ? '已开启' : '已关闭'
  closeRow.appendChild(close)
  ui.content.appendChild(closeRow)

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
