// 菜园面板：地块和仓库只根据宿主快照绘制，临时选种与动画留在本页。
;(function () {
  'use strict'
  var selected = null
  var effects = {}
  var styleId = 'dsh-piggy-farm-style'
  var css = [
    '.fm{display:grid;gap:11px;color:var(--ac-text,#794f27)}',
    '.fm-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:800}',
    '.fm-chip{padding:4px 9px;border-radius:999px;background:var(--ac-bg-input,#fffbe7);border:2px solid var(--ac-border-light,#e5dcc6);font-size:11px}',
    '.fm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '.fm-plot{position:relative;overflow:hidden;min-height:126px;padding:10px 7px;border-radius:17px;background:var(--ac-bg-content,#f7f3df);border:2px solid var(--ac-border-light,#e5dcc6);display:grid;justify-items:center;align-content:center;gap:4px;text-align:center}',
    '.fm-plot.fm-ripe{background:#f1fae9;border-color:#9fd7a9}.fm-plot.fm-locked{opacity:.72}',
    '.fm-emoji{font-size:30px;line-height:1.1}.fm-name{font-size:11px;font-weight:800}.fm-note{font-size:10px;color:var(--ac-text-2,#9f927d);min-height:14px}',
    '.fm .dp-mini{padding:4px 10px;font-size:10px}.fm .dp-btn{padding:5px 12px;font-size:11px}',
    '.fm-pick{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:5px;padding:8px;border-radius:13px;background:var(--ac-bg-input,#fffbe7);border:2px solid var(--ac-border-light,#e5dcc6)}',
    '.fm-section{font-size:11px;font-weight:800;margin:2px 0 -4px}.fm-stock{display:grid;gap:6px}',
    '.fm-row{display:flex;align-items:center;gap:7px;padding:7px 9px;border-radius:13px;background:var(--ac-bg-content,#f7f3df);border:2px solid var(--ac-border-light,#e5dcc6);font-size:11px}',
    '.fm-row .fm-grow{flex:1;min-width:0}.fm-row small{display:block;color:var(--ac-text-2,#9f927d)}',
    '.fm-effect{position:absolute;inset:0;pointer-events:none;display:grid;place-items:center;font-size:32px;z-index:2}',
    '.fm-effect[data-kind="water"]{animation:fm-water .65s ease-out both}.fm-effect[data-kind="harvest"]{animation:fm-harvest .65s ease-out both}',
    '@keyframes fm-water{0%{opacity:0;transform:translateY(-35px) scale(.7)}35%{opacity:1;transform:translateY(0) scale(1.15)}100%{opacity:0;transform:translateY(12px) scale(.7)}}',
    '@keyframes fm-harvest{0%{opacity:0;transform:translateY(8px) scale(.6)}35%{opacity:1;transform:translateY(-12px) scale(1.25)}100%{opacity:0;transform:translateY(-34px) scale(.8)}}',
    '@media (prefers-reduced-motion:reduce){.fm-effect{animation:none!important;opacity:0}}',
  ].join('')

  function ensureStyle() {
    if (document.getElementById(styleId)) return
    var style = document.createElement('style')
    style.id = styleId
    style.textContent = css
    document.head.appendChild(style)
  }

  function effect(index, kind) { effects[index] = { kind: kind, at: Date.now() } }
  function attachEffect(app, card, index) {
    var current = effects[index]
    if (!current) return
    var elapsed = Date.now() - current.at
    if (elapsed >= 650) { delete effects[index]; return }
    var icon = app.el('span', 'fm-effect', current.kind === 'water' ? '💧' : '✨')
    icon.setAttribute('data-kind', current.kind)
    icon.style.animationDelay = '-' + Math.max(0, elapsed) + 'ms'
    card.appendChild(icon)
  }

  function button(app, className, attrs, label, onClick) {
    var node = app.button(className, attrs, onClick)
    node.textContent = label
    return node
  }

  function shortTime(ms) {
    var minutes = Math.ceil(ms / 60000)
    if (minutes < 60) return '还要 ' + minutes + ' 分钟'
    return '还要 ' + Math.floor(minutes / 60) + ' 小时 ' + minutes % 60 + ' 分钟'
  }

  function renderPlot(app, data, grid, index) {
    var plot = data.plots[index]
    var locked = index >= data.unlocked
    var card = app.el('div', 'fm-plot' + (locked ? ' fm-locked' : plot && plot.stage === 3 ? ' fm-ripe' : ''))
    card.setAttribute('data-farm-plot', String(index))
    card.appendChild(app.el('div', 'fm-emoji', locked ? '🔒' : plot ? plot.emoji : '🟫'))
    card.appendChild(app.el('div', 'fm-name', locked ? '第 ' + (index + 1) + ' 块地' : plot ? plot.label : '空地'))
    if (locked) {
      var price = data.prices[index]
      if (index === data.unlocked) {
        var unlock = button(app, 'dp-mini', { 'data-farm-unlock': String(index) }, price + ' 🪙 开垦', function () { app.send('unlock', { plot: index }) })
        unlock.disabled = data.coins < price
        card.appendChild(unlock)
      } else card.appendChild(app.el('div', 'fm-note', '先开垦前一块'))
    } else if (plot === null) {
      card.appendChild(app.el('div', 'fm-note', '选一粒种子'))
      card.appendChild(button(app, 'dp-btn', { 'data-farm-plant': String(index) }, '种', function () { selected = selected === index ? null : index; app.rerender() }))
    } else if (plot.stage === 3) {
      card.appendChild(app.el('div', 'fm-note', '成熟啦，放着不会坏'))
      card.appendChild(button(app, 'dp-btn', { 'data-farm-harvest': String(index) }, '收获', function () { effect(index, 'harvest'); app.send('harvest', { plot: index }) }))
    } else if (plot.thirsty) {
      card.appendChild(app.el('div', 'fm-note', '渴了 💧 · 不浇水就不长'))
      card.appendChild(button(app, 'dp-btn', { 'data-farm-water': String(index) }, '浇水', function () { effect(index, 'water'); app.send('water', { plot: index }) }))
    } else {
      card.appendChild(app.el('div', 'fm-note', ['土里生长中', '正在发芽', '正在长大'][plot.stage]))
      card.appendChild(app.el('div', 'fm-note', shortTime(plot.remainingMs)))
    }
    attachEffect(app, card, index)
    grid.appendChild(card)
    if (selected === index && !locked && plot === null) {
      var picker = app.el('div', 'fm-pick')
      var available = data.seeds.filter(function (seed) { return seed.count > 0 })
      if (available.length === 0) picker.appendChild(app.el('span', 'fm-note', '还没有种子，去商店 → 种子货架买一些'))
      available.forEach(function (seed) {
        picker.appendChild(button(app, 'dp-mini dp-mini-plain', { 'data-farm-seed': seed.key }, seed.emoji + ' ' + seed.label + ' ×' + seed.count, function () {
          selected = null
          app.send('plant', { plot: index, item: seed.key })
        }))
      })
      grid.appendChild(picker)
    }
  }

  function render(app) {
    ensureStyle()
    var data = app.data
    if (!data || !Array.isArray(data.plots)) { app.content.appendChild(app.el('div', 'dp-empty', '菜园还在准备……')); return }
    var root = app.el('div', 'fm')
    var head = app.el('div', 'fm-head')
    head.appendChild(app.el('span', null, '🌱 我的菜园'))
    head.appendChild(app.el('span', 'fm-chip', '🪙 ' + data.coins))
    root.appendChild(head)
    var grid = app.el('div', 'fm-grid')
    for (var index = 0; index < 6; index += 1) renderPlot(app, data, grid, index)
    root.appendChild(grid)
    root.appendChild(app.el('div', 'fm-section', '🧺 仓库 · 收获的作物'))
    var stock = app.el('div', 'fm-stock')
    var owned = data.harvest.filter(function (crop) { return crop.count > 0 })
    if (owned.length === 0) stock.appendChild(app.el('div', 'dp-empty', '还没有收获，浇水等它长大吧'))
    owned.forEach(function (crop) {
      var row = app.el('div', 'fm-row')
      row.appendChild(app.el('span', null, crop.emoji))
      var name = app.el('span', 'fm-grow', crop.label + ' ×' + crop.count)
      name.appendChild(app.el('small', null, '卖价 ' + crop.sell + ' 🪙 / 个'))
      row.appendChild(name)
      row.appendChild(button(app, 'dp-mini', { 'data-farm-sell': crop.key }, '卖', function () { app.send('sell', { item: crop.key }) }))
      if (crop.food) row.appendChild(button(app, 'dp-mini dp-mini-plain', { 'data-farm-store': crop.key }, '放进背包', function () { app.send('store', { item: crop.key }) }))
      stock.appendChild(row)
    })
    root.appendChild(stock)
    root.appendChild(app.el('div', 'fm-note', '种子在商店 → 种子货架；收获记录在图鉴 → 作物'))
    app.content.appendChild(root)
  }

  if (window.dshPiggyExtensions) window.dshPiggyExtensions.register('farm', { render: render })
})()
