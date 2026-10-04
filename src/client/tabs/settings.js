// @ts-check
/**
 * 设置：都是这台设备上的显示偏好，不进存档。
 * 每项一行：标题 + 一句说明 + 一排分段按钮（或一个开关）。以前每个选项单独占一行、
 * 各带一个「使用」按钮，小猪大小一项就四行，用户反馈「菜单设计不合理」（2026-10-04）。
 */
import { button, el } from '../dom.js'
import { iconStyle, setIconStyle } from '../icon-style.js'
import { autoCollapseEnabled, setAutoCollapse } from '../auto-collapse.js'
import { desktopShell } from '../desktop-shell.js'
import { emojiStyle, hasBundledEmoji, setEmojiStyle, applyEmojiStyle } from '../emoji-style.js'
import { PIG_SIZES, displayedPigSize, pigSize, setPigSize } from '../pig-size.js'

/** 一项设置：标题、说明，下面放控件。 */
function section(ui, title, note) {
  const box = el('div', 'dp-set')
  const head = el('div', 'dp-set-head')
  head.appendChild(el('b', null, title))
  if (note) head.appendChild(el('small', 'dp-dim', note))
  box.appendChild(head)
  ui.content.appendChild(box)
  return { box, head }
}

/** 一排分段按钮；当前选中的那个按下去、不能再点。 */
function segmented({ box }, attr, options, current, onPick) {
  const row = el('div', 'dp-seg')
  for (const option of options) {
    const pick = button('dp-seg-btn', { [attr]: option.key, 'aria-pressed': String(option.key === current) }, function () { onPick(option.key) })
    pick.textContent = option.label
    pick.disabled = option.key === current
    row.appendChild(pick)
  }
  box.appendChild(row)
}

export function renderSettingsTab(ui) {
  const size = section(ui, '小猪大小', '只改这台设备上的显示大小，不改存档')
  const sizeLabels = { small: '小', standard: '标准', large: '大', extra: '特大' }
  segmented(size, 'data-pig-size', PIG_SIZES.map(key => ({ key, label: sizeLabels[key] })), pigSize(), function (key) {
    setPigSize(key)
    const stageSize = ui.view.hatched ? ui.view.pig.stage.size : ui.view.boxStage.size
    ui.host.style.setProperty('--pig-size', displayedPigSize(stageSize) + 'px')
    ui.renderContent()
    ui.fitPanel()
    desktopShell()?.syncGeometry?.()
  })

  if (desktopShell() !== null && hasBundledEmoji()) {
    const emoji = section(ui, 'Emoji 样式', '内置是随游戏附带的一整套 Noto 彩色 emoji，各系统看起来一样')
    segmented(emoji, 'data-emoji-style', [
      { key: 'bundled', label: '内置' },
      { key: 'system', label: '系统自带' },
    ], emojiStyle(), function (key) {
      setEmojiStyle(key)
      applyEmojiStyle(ui.host)
      ui.renderContent()
    })
  }

  const icons = section(ui, '主菜单图标', '手绘图标随游戏提供，设备之间看起来一致')
  segmented(icons, 'data-icon-style', [
    { key: 'system', label: 'Emoji' },
    { key: 'built-in', label: '手绘图标' },
  ], iconStyle(), function (key) {
    setIconStyle(key)
    ui.renderContent()
  })

  const close = section(ui, '点击别处时收起面板', '网页版点面板外、桌面版切到其他窗口时收起')
  const on = autoCollapseEnabled()
  const toggle = button('dp-switch', { 'data-auto-collapse': String(!on), 'aria-pressed': String(on) }, function () {
    setAutoCollapse(!autoCollapseEnabled())
    ui.renderContent()
  })
  toggle.appendChild(el('span', 'dp-switch-knob'))
  toggle.appendChild(el('span', 'dp-switch-text', on ? '开' : '关'))
  close.head.appendChild(toggle)
}
