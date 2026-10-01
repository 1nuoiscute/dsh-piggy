// @ts-check
/** C4 图鉴。分类注册口给 C5 鱼类和 C6 皮肤直接复用。 */

import { ART_URL } from '../constants.js'
import { button, el } from '../dom.js'
import { drillHeader, drillTo, tile, tileGrid } from '../widgets.js'

const SECTIONS = []

/** Register or replace one collection category. */
export function registerDexSection(section) {
  if (section === null || typeof section !== 'object' || typeof section.key !== 'string') return
  const index = SECTIONS.findIndex(entry => entry.key === section.key)
  if (index >= 0) SECTIONS[index] = section
  else SECTIONS.push(section)
}

for (const section of [
  { key: 'forms', label: '形态', emoji: '🐷', color: 'pink' },
  { key: 'skins', label: '皮肤', emoji: '🎨', color: 'purple' },
  { key: 'fish', label: '鱼类', emoji: '🐟', color: 'blue' },
  { key: 'items', label: '道具', emoji: '🎒', color: 'orange' },
  { key: 'souvenirs', label: '纪念品', emoji: '🧳', color: 'teal' },
]) registerDexSection(section)

export function renderDexTab(ui) {
  const picked = ui.drill.dex
  if (picked === null) return renderSections(ui)
  const section = SECTIONS.find(entry => entry.key === picked)
  if (section === undefined) return drillTo(ui, 'dex', null)
  renderEntries(ui, section)
}

function renderSections(ui) {
  const grid = tileGrid()
  for (const section of SECTIONS) {
    const entries = ui.view.dex[section.key] ?? []
    const got = entries.filter(entry => entry.acquired).length
    grid.appendChild(tile({
      emoji: section.emoji, label: section.label, color: section.color,
      note: entries.length === 0 ? '等待收录' : got + '/' + entries.length,
      data: { 'data-dex-section': section.key },
      onPick: function () { drillTo(ui, 'dex', section.key) },
    }))
  }
  ui.content.appendChild(grid)
}

function renderEntries(ui, section) {
  const entries = ui.view.dex[section.key] ?? []
  const acquired = entries.filter(entry => entry.acquired).length
  drillHeader(ui, 'dex', section.emoji + ' ' + section.label, acquired + '/' + entries.length)
  if (entries.length === 0) {
    ui.content.appendChild(el('div', 'dp-empty', '这一页还没有收录内容'))
    return
  }
  const list = el('div', 'dp-dex-grid')
  for (const entry of entries) {
    list.appendChild(entryCard(ui, entry, section.label))
  }
  ui.content.appendChild(list)
  const picked = entries.find(entry => entry.key === ui.drill.pick)
  if (picked !== undefined) ui.content.appendChild(detailCard(picked, section.label))
}

function entryCard(ui, entry, sectionLabel) {
  const card = button('dp-dex-card' + (entry.acquired ? '' : ' dp-dex-card-locked'),
    { 'data-dex-entry': entry.key }, function () {
      ui.drill.pick = ui.drill.pick === entry.key ? null : entry.key
      ui.renderContent()
    })
  const art = el('span', 'dp-dex-artbox')
  appendArt(art, entry)
  if (!entry.acquired) art.appendChild(el('span', 'dp-dex-lock', '🔒'))
  card.appendChild(art)
  card.appendChild(el('span', 'dp-dex-caption', entry.acquired ? entry.label : '未知' + sectionLabel))
  tilt(card)
  return card
}

function detailCard(entry, sectionLabel) {
  const wrap = el('div', 'dp-dex-detail')
  wrap.setAttribute('data-dex-detail', entry.key)
  const card = el('div', 'dp-dex-big' + (entry.acquired ? '' : ' dp-dex-big-locked'))
  const art = el('div', 'dp-dex-big-art')
  appendArt(art, entry)
  if (!entry.acquired) art.appendChild(el('span', 'dp-dex-lock', '🔒'))
  card.appendChild(art)
  card.appendChild(el('div', 'dp-dex-big-title', entry.acquired ? entry.emoji + ' ' + entry.label : '🔒 未知' + sectionLabel))
  if (entry.acquired) {
    card.appendChild(el('div', 'dp-dex-story', entry.description || '这段故事还没有写进图鉴。'))
    card.appendChild(el('div', 'dp-dex-foot', firstSeen(entry.firstAt) + ' · 获得 ' + entry.count + ' 次'))
  } else {
    const riddle = el('div', 'dp-dex-riddle')
    riddle.appendChild(el('b', null, '解锁谜面'))
    riddle.appendChild(el('span', null, entry.hint || '它藏在一次尚未启程的相遇里。'))
    card.appendChild(riddle)
  }
  wrap.appendChild(card)
  tilt(card)
  return wrap
}

function appendArt(parent, entry) {
  if (entry.art) {
    const img = /** @type {HTMLImageElement} */ (el('img', 'dp-dex-art'))
    img.src = ART_URL + entry.art + '.svg'
    img.alt = entry.acquired ? entry.label : ''
    parent.appendChild(img)
  } else {
    parent.appendChild(el('span', 'dp-dex-emoji', entry.acquired ? entry.emoji : '◆'))
  }
}

function firstSeen(value) {
  if (typeof value !== 'number') return '首次发现时间未知'
  return '首次发现 ' + new Date(value).toLocaleDateString('zh-CN')
}

function tilt(node) {
  node.addEventListener('pointermove', function (event) {
    const box = node.getBoundingClientRect()
    const x = ((event.clientX ?? box.left + box.width / 2) - box.left) / Math.max(1, box.width) - .5
    const y = ((event.clientY ?? box.top + box.height / 2) - box.top) / Math.max(1, box.height) - .5
    node.style.setProperty('--dex-rx', (-y * 7).toFixed(2) + 'deg')
    node.style.setProperty('--dex-ry', (x * 9).toFixed(2) + 'deg')
  })
  node.addEventListener('pointerleave', function () {
    node.style.removeProperty('--dex-rx')
    node.style.removeProperty('--dex-ry')
  })
}
