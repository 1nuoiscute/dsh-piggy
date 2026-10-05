// 矿洞面板：每次重画按动作时间续接动画，旧动作不重新播放。
;(function () {
  'use strict'
  var STYLE_ID = 'dsh-piggy-mine-style'
  var icons = { entrance: '🌿', soil: '🟫', rock: '🪨', hard: '⬛', ore: '💎', ladder: '🪜', fossil: '🦴' }
  var oreIcons = { coal: '⚫', copper: '🟠', silver: '⚪', gold: '🟡', gem: '💎' }
  var fossilIcons = { bone: '🦴', ammonite: '🐚', dinosaur: '🦕', trex: '🦖', feather: '🪶', fish: '🐟' }
  var oreNames = { coal: '煤', copper: '铜', silver: '银', gold: '金', gem: '宝石' }
  var CSS = [
    '.mn{display:grid;gap:10px;color:var(--ac-text,#794f27)}',
    '.mn-card{background:var(--ac-bg-input,#fffbe7);border:2px solid var(--ac-border-light,#e5dcc6);border-radius:18px;padding:10px}',
    '.mn-head{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:13px;font-weight:900}',
    '.mn-muted{color:var(--ac-text-2,#9f927d);font-size:11px;line-height:1.45}',
    '.mn-stats{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}',
    '.mn-chip{border-radius:999px;background:#fff;border:1px solid var(--ac-border-light,#e5dcc6);padding:3px 8px;font-size:10px;font-weight:800}',
    '.mn-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:3px;margin-top:8px}',
    '.mn-cell{position:relative;aspect-ratio:1;border:1px solid #c49d72;border-radius:7px;background:#d9ac79;color:#5d432d;display:grid;place-items:center;padding:0;overflow:visible;font:inherit;font-size:19px;cursor:default}',
    '.mn-cell[data-open="true"]{background:#fff9df;border-color:#eadabd}',
    '.mn-cell[data-kind="entrance"]{background:#e8f3d0;border-color:#c5dda3}',
    '.mn-cell[data-dig="true"]{cursor:pointer;box-shadow:inset 0 0 0 2px #78cbbb}',
    '.mn-cell[data-dig="true"]:hover{filter:brightness(1.08)}',
    '.mn-cell[data-hits="true"]:after{content:"╳";position:absolute;inset:0;display:grid;place-items:center;color:#76533e;font-size:18px;opacity:.65}',
    '.mn-cell[data-animate="true"]{animation:mn-crack .45s ease-out both;animation-delay:var(--mn-elapsed)}',
    '.mn-cell[data-animate="true"]:before{content:"✦ · ✦";position:absolute;z-index:2;white-space:nowrap;color:#b88551;pointer-events:none;animation:mn-debris .55s ease-out both;animation-delay:var(--mn-elapsed)}',
    '.mn-cell[data-gem="true"][data-animate="true"]:before{content:"✧ ✦ ✧";color:#20baab;animation:mn-debris .8s ease-out both;animation-delay:var(--mn-elapsed)}',
    '.mn-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}',
    '.mn-actions .dp-btn,.mn-actions .dp-mini{flex:1;min-width:90px}',
    '.mn-bag{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}',
    '.mn-empty{padding:10px;text-align:center}',
    '@keyframes mn-crack{0%{transform:scale(.95);filter:brightness(.8)}40%{transform:scale(1.09);filter:brightness(1.2)}100%{transform:scale(1);filter:none}}',
    '@keyframes mn-debris{0%{opacity:1;transform:translateY(0) scale(.5)}100%{opacity:0;transform:translateY(-19px) scale(1.5)}}',
    '@media (prefers-reduced-motion:reduce){.mn-cell,.mn-cell:before{animation:none!important}}',
  ].join('\n')

  function style() {
    if (document.getElementById(STYLE_ID)) return
    var node = document.createElement('style')
    node.id = STYLE_ID; node.textContent = CSS
    ;(document.head || document.body).appendChild(node)
  }

  function button(app, name, label, op, payload, disabled) {
    var node = app.button(name, { 'data-mine-op': op }, function () { app.send(op, payload || {}) })
    node.textContent = label; node.disabled = !!disabled
    return node
  }

  function render(app) {
    style()
    var d = app.data
    if (!d || !Array.isArray(d.cells)) { app.content.appendChild(app.el('div', 'dp-empty', '矿洞还在准备……')); return }
    var root = app.el('div', 'mn')
    var top = app.el('div', 'mn-card')
    top.appendChild(app.el('div', 'mn-head', '⛏️ 矿洞 · 第 ' + d.layer + ' / 10 层'))
    var stats = app.el('div', 'mn-stats')
    stats.appendChild(app.el('span', 'mn-chip', '⚡ 体力 ' + d.energy + ' / 30'))
    stats.appendChild(app.el('span', 'mn-chip', '⛏️ ' + (['', '木镐', '铁镐', '钻石镐'][d.pickaxe] || '木镐')))
    stats.appendChild(app.el('span', 'mn-chip', d.surface ? '🌿 地面' : '🕳️ 地下'))
    top.appendChild(stats)
    top.appendChild(app.el('div', 'mn-muted', d.energy === 0 ? '累了，歇会儿再挖。每 10 分钟恢复 1 点体力。' : '只能挖和已挖开区域相邻的格子。每敲一下消耗 1 体力。'))
    root.appendChild(top)

    if (!d.surface) {
      var card = app.el('div', 'mn-card')
      var grid = app.el('div', 'mn-grid')
      var current = d.last && d.last.layer === d.layer ? d.last : null
      var elapsed = current ? Math.max(0, Date.now() - current.at) : 9999
      var animate = elapsed < 550
      d.cells.forEach(function (cell) {
        var active = !cell.open && cell.adjacent && d.energy > 0
        var node = app.button('mn-cell', { 'data-mine-cell': String(cell.index), 'aria-label': cell.open ? '已挖开' : active ? '挖掘第 ' + (cell.index + 1) + ' 格' : '未挖开' }, function () { if (active) app.send('dig', { cell: cell.index }) })
        node.disabled = !active
        node.setAttribute('data-open', String(cell.open))
        node.setAttribute('data-kind', cell.open ? cell.kind : 'covered')
        node.setAttribute('data-dig', String(active))
        node.setAttribute('data-hits', String(!cell.open && cell.hits > 0))
        node.setAttribute('data-animate', String(!!animate && current.index === cell.index))
        node.setAttribute('data-gem', String(!!current && current.key === 'gem'))
        if (animate) node.style.setProperty('--mn-elapsed', '-' + elapsed + 'ms')
        node.textContent = cell.open ? cell.kind === 'ore' ? oreIcons[cell.key] : cell.kind === 'fossil' ? fossilIcons[cell.key] : icons[cell.kind] : ''
        grid.appendChild(node)
      })
      card.appendChild(grid)
      var actions = app.el('div', 'mn-actions')
      actions.appendChild(button(app, 'dp-mini dp-mini-plain', '↑ 回地面卖矿', 'surface'))
      if (d.canDescend) actions.appendChild(button(app, 'dp-btn', '↓ 下一层', 'descend'))
      card.appendChild(actions)
      root.appendChild(card)
    } else {
      var ground = app.el('div', 'mn-card')
      ground.appendChild(app.el('div', 'mn-head', '🌿 地面'))
      ground.appendChild(app.el('div', 'mn-muted', '在这里卖掉矿石，再回到当前层继续挖。收藏品会留在图鉴。'))
      var groundActions = app.el('div', 'mn-actions')
      groundActions.appendChild(button(app, 'dp-btn', '卖出矿石', 'sell', {}, !Object.values(d.bag).some(function (n) { return n > 0 })))
      groundActions.appendChild(button(app, 'dp-mini dp-mini-plain', '回矿洞', 'enter'))
      ground.appendChild(groundActions); root.appendChild(ground)
    }

    var bag = app.el('div', 'mn-card')
    bag.appendChild(app.el('div', 'mn-head', '矿石袋'))
    var things = app.el('div', 'mn-bag')
    Object.keys(oreNames).forEach(function (key) { if (d.bag[key] > 0) things.appendChild(app.el('span', 'mn-chip', oreIcons[key] + ' ' + oreNames[key] + ' ×' + d.bag[key])) })
    if (!things.children.length) things.appendChild(app.el('div', 'mn-muted mn-empty', '还没有矿石'))
    bag.appendChild(things); root.appendChild(bag)
    app.content.appendChild(root)
  }

  if (window.dshPiggyExtensions) window.dshPiggyExtensions.register('mine', { render: render })
})()
