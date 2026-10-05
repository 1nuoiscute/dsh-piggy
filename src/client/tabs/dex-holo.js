// @ts-check
/** 下载扩展的闪卡图鉴。 */
import { button, el } from '../dom.js'
import { drillHeader } from '../widgets.js'

const stars = count => '★'.repeat(Math.max(0, Number(count) || 0))

function card(entry, large, onPick) {
  const acquired = entry.acquired === true
  const node = button('dp-holo' + (large ? ' dp-holo-large' : ''), { 'data-s': String(entry.stars), 'data-missing': String(!acquired), 'data-dex-entry': entry.key }, onPick)
  const face = el('span', 'dp-holo-face')
  face.appendChild(el('span', 'dp-holo-doll', entry.emoji))
  face.appendChild(el('b', 'dp-holo-name', acquired ? entry.label : '？？？'))
  face.appendChild(el('span', 'dp-holo-stars', stars(entry.stars)))
  node.appendChild(face)
  if (acquired) tilt(node)
  return node
}

function tilt(node) {
  node.addEventListener('pointermove', event => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const box = node.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / Math.max(1, box.width)))
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / Math.max(1, box.height)))
    node.style.setProperty('--rx', ((.5 - y) * 10).toFixed(1) + 'deg')
    node.style.setProperty('--ry', ((x - .5) * 14).toFixed(1) + 'deg')
    node.style.setProperty('--hx', Math.round(x * 100) + '%')
    node.style.setProperty('--hy', Math.round(y * 100) + '%')
  })
  node.addEventListener('pointerleave', () => {
    for (const name of ['--rx', '--ry', '--hx', '--hy']) node.style.removeProperty(name)
  })
}

/** @param {any} ui @param {any} section */
export function renderHoloSection(ui, section) {
  const entries = section.entries ?? []
  const chosen = entries.find(entry => entry.key === ui.drill.pick)
  const title = section.emoji + ' ' + section.label
  if (chosen) {
    drillHeader(ui, 'dex', title, chosen.acquired ? '已收录' : '未解锁')
    const back = button('dp-mini dp-mini-plain', { 'data-dex-detail-back': section.key }, () => { ui.drill.pick = null; ui.renderContent() })
    back.textContent = '‹ 返回摆件墙'
    ui.content.appendChild(back)
    const detail = el('div', 'dp-holo-detail')
    detail.setAttribute('data-dex-detail', chosen.key)
    detail.appendChild(card(chosen, true, () => {}))
    const copy = el('div', 'dp-holo-copy')
    copy.appendChild(el('b', null, chosen.acquired ? chosen.label : '？？？'))
    copy.appendChild(el('span', 'dp-holo-rating', stars(chosen.stars)))
    const potential = el('div', 'dp-holo-potential')
    for (let i = 1; i <= 6; i += 1) {
      const cell = el('i')
      cell.setAttribute('data-on', String(chosen.acquired && i <= chosen.potential))
      potential.appendChild(cell)
    }
    copy.appendChild(potential)
    copy.appendChild(el('p', null, chosen.acquired ? chosen.blurb : '还没有寻访到。'))
    detail.appendChild(copy)
    ui.content.appendChild(detail)
  } else drillHeader(ui, 'dex', title, entries.filter(entry => entry.acquired).length + '/' + entries.length)

  for (const rarity of [6, 5, 4, 3]) {
    const list = entries.filter(entry => entry.stars === rarity)
    if (list.length === 0) continue
    ui.content.appendChild(el('h4', 'dp-holo-tier', rarity + ' 星 ' + stars(rarity)))
    const grid = el('div', 'dp-holo-grid')
    for (const entry of list) grid.appendChild(card(entry, false, () => { ui.drill.pick = entry.key; ui.renderContent(); ui.content.scrollTop = 0 }))
    ui.content.appendChild(grid)
  }
}
