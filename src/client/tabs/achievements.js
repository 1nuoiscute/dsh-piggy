// @ts-check
/** Pig badges live in the catalogue, next to the memories they celebrate. */
import { ART_URL } from '../constants.js'
import { button, el } from '../dom.js'
import { drillHeader } from '../widgets.js'

export function renderAchievements(ui, entries) {
  const selected = entries.find(entry => entry.key === ui.drill.pick)
  drillHeader(ui, 'dex', '🏆 小猪成就', entries.filter(entry=>entry.acquired).length+'/'+entries.length)
  if (selected) return renderAchievementDetail(ui, selected)
  const intro = el('div', 'dp-ach-intro', '每一枚小猪徽章，都记着一段一起经历的日常。')
  ui.content.appendChild(intro)
  for (const group of [...new Set(entries.map(entry=>entry.group))]) {
    ui.content.appendChild(el('div', 'dp-ach-group', group))
    const grid = el('div', 'dp-ach-grid')
    for (const entry of entries.filter(item=>item.group===group)) {
      const card = button('dp-ach-card', { 'data-achievement':entry.key, 'data-earned':String(entry.acquired) }, function () {
        ui.drill.pick=entry.key; ui.renderContent(); ui.content.scrollTop=0
      })
      card.appendChild(badge(entry))
      card.appendChild(el('b', null, entry.label))
      card.appendChild(el('small', null, entry.acquired ? '已获得' : entry.progress+'/'+entry.target+' '+entry.unit))
      grid.appendChild(card)
    }
    ui.content.appendChild(grid)
  }
}

function badge(entry) {
  const image = /** @type {HTMLImageElement} */ (el('img', 'dp-ach-badge'))
  image.src=ART_URL+entry.art+'.svg'; image.alt=entry.label+' · 小猪徽章'
  return image
}

function dateLabel(entry) {
  if (entry.recovered || entry.firstAt===null) return '旧存档补录 · 完成日期未知'
  return '获得于 '+new Date(entry.firstAt).toLocaleDateString('zh-CN')
}

function renderAchievementDetail(ui, entry) {
  const back=button('dp-ach-back', {'data-achievement-back':'true'}, function () {
    ui.drill.pick=null; ui.renderContent(); ui.content.scrollTop=0
  })
  back.textContent='‹ 全部成就'; ui.content.appendChild(back)
  const card=el('div','dp-ach-detail'); card.setAttribute('data-earned',String(entry.acquired))
  card.setAttribute('data-achievement-detail',entry.key)
  card.appendChild(badge(entry)); card.appendChild(el('h3',null,entry.label))
  card.appendChild(el('p',null,entry.description))
  card.appendChild(el('b',null,entry.acquired?'已获得':entry.progress+' / '+entry.target+' '+entry.unit))
  card.appendChild(el('small',null,entry.acquired?dateLabel(entry):'解锁后永久保留这枚小猪徽章'))
  ui.content.appendChild(card)
}
