// @ts-check
/** C6 换肤：内置与玩家皮肤共用一张货架，导入 ZIP 后立即穿上。 */

import { ART_URL } from '../constants.js'
import { button, el } from '../dom.js'

export function renderSkinsTab(ui) {
  const intro = el('div', 'dp-skin-intro')
  intro.appendChild(el('b', null, '给猪猪换件新衣服'))
  intro.appendChild(el('span', null, '形态会优先显示；恢复普通形态后，选中的皮肤仍会保留。'))
  ui.content.appendChild(intro)

  const grid = el('div', 'dp-skin-grid')
  for (const skin of ui.view.skins.entries) grid.appendChild(skinCard(ui, skin))
  ui.content.appendChild(grid)
  ui.content.appendChild(importCard(ui))
}

function skinCard(ui, skin) {
  const card = el('div', 'dp-skin-card' + (skin.current ? ' dp-skin-current' : ''))
  const img = /** @type {HTMLImageElement} */ (el('img', 'dp-skin-art'))
  img.src = ART_URL + skin.art + '.svg'
  img.alt = skin.label
  card.appendChild(img)
  const copy = el('span', 'dp-skin-copy')
  copy.appendChild(el('b', null, skin.emoji + ' ' + skin.label))
  copy.appendChild(el('small', null, skin.description || ('作者：' + skin.author)))
  card.appendChild(copy)
  const pick = button('dp-skin-pick', { 'data-skin': skin.key }, function () { ui.send('skin', { skin: skin.key }) })
  pick.textContent = skin.current ? '使用中' : '使用'
  pick.disabled = skin.current
  card.appendChild(pick)
  return card
}

function importCard(ui) {
  const wrap = el('label', 'dp-skin-import')
  wrap.appendChild(el('b', null, '📦 导入自己的皮肤'))
  wrap.appendChild(el('span', null, '选择按教程制作的 ZIP；导入成功后会自动使用。'))
  const input = /** @type {HTMLInputElement} */ (el('input'))
  input.type = 'file'
  input.accept = '.zip,application/zip'
  input.setAttribute('accept', '.zip,application/zip')
  input.setAttribute('data-skin-import', 'zip')
  input.addEventListener('change', function () {
    const file = input.files?.[0]
    if (!file) return
    fetch('/dsh-piggy/skins/import', { method: 'POST', headers: { 'content-type': 'application/zip' }, body: file })
      .then(response => response.json())
      .then(data => {
        if (data.ok !== true) return ui.showBubble('导入失败：' + ((data.errors || [data.reason]).join('；') || '请检查皮肤包'))
        ui.view = data
        ui.renderContent()
        ui.showBubble('皮肤导入成功 🎨')
      })
      .catch(() => ui.showBubble('导入失败：无法读取皮肤包'))
  })
  wrap.appendChild(input)
  wrap.appendChild(el('span', 'dp-skin-file', '选择 ZIP'))
  return wrap
}
