// @ts-check
/** C4 图鉴。分类注册口给 C5 鱼类和 C6 皮肤直接复用。 */

import { el } from '../dom.js'
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
  const list = el('div', 'dp-list')
  for (const entry of entries) {
    const row = el('div', 'dp-item' + (entry.acquired ? '' : ' dp-dim'))
    row.setAttribute('data-dex-entry', entry.key)
    row.appendChild(el('span', null, entry.acquired ? entry.emoji : '◼'))
    const body = el('div', 'dp-grow')
    body.appendChild(el('b', null, entry.acquired ? entry.label : '未获得'))
    body.appendChild(el('div', 'dp-dim', entry.acquired ? '获得 ' + entry.count + ' 次' : entry.condition))
    if (!entry.acquired && entry.requirements.length > 0) {
      body.appendChild(el('div', 'dp-dim', entry.requirements.map(req => req.label + ' ' + req.have + '/' + req.need + (req.met ? ' ✓' : '')).join(' · ')))
    }
    row.appendChild(body)
    list.appendChild(row)
  }
  ui.content.appendChild(list)
}
