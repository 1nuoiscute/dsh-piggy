// 盲盒扩展 · 面板部分。加载后向游戏登记自己的 App 页（见 docs/design/extension-download.md）。
// 两个页签：开盒、展示柜。开盒时盒子先摇、再打开、摆件一个个弹出来；隐藏款带金光和彩纸。
;(function () {
  'use strict'
  var STYLE_ID = 'dsh-piggy-blindbox-style'
  var CSS = [
    // 每个系列一套颜色：底色、深色、浅色、丝带。
    '.bbx{--bbx-ink:var(--ac-text,#794f27);--bbx-soft:var(--ac-text-2,#9f927d);display:grid;gap:10px}',
    '.bbx-farm{--bbx-a:#fff4c9;--bbx-b:#f6c75a;--bbx-c:#8cc66b;--bbx-r:#e8794b}',
    '.bbx-beach{--bbx-a:#e3f6fb;--bbx-b:#6cc3dc;--bbx-c:#f4dca4;--bbx-r:#ff8a7a}',
    '.bbx-night{--bbx-a:#e9e4fb;--bbx-b:#6d63b8;--bbx-c:#ffcf6b;--bbx-r:#f06f6f}',
    '.bbx-tabs{display:flex;gap:6px;padding:3px;border-radius:50px;background:var(--ac-bg-content,#f7f3df);border:2px solid var(--ac-border-light,#e5dcc6)}',
    '.bbx-tab{flex:1;font:inherit;font-size:12px;font-weight:800;padding:6px 0;border:0;border-radius:50px;background:transparent;color:var(--bbx-soft);cursor:pointer}',
    '.bbx-tab[aria-pressed="true"]{background:var(--ac-primary,#19c8b9);color:#fff;box-shadow:0 2px 0 var(--ac-primary-active,#11a89b)}',
    '.bbx-ticket{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:14px;background:linear-gradient(90deg,#fff1c9,#ffe2ec);font-size:11.5px;font-weight:800;color:#a2572b}',
    // 系列卡片：左边一只画出来的盒子，右边名字、进度和按钮。
    '.bbx-card{position:relative;display:grid;grid-template-columns:78px 1fr;gap:10px;padding:12px;border-radius:20px;background:linear-gradient(160deg,var(--bbx-a),#fff 85%);border:2px solid color-mix(in srgb,var(--bbx-b) 45%,transparent);box-shadow:0 3px 0 color-mix(in srgb,var(--bbx-b) 35%,transparent)}',
    '.bbx-box{position:relative;width:70px;height:70px;align-self:center;justify-self:center}',
    '.bbx-box i{position:absolute;display:block}',
    '.bbx-box .lid{left:2px;right:2px;top:12px;height:16px;border-radius:6px;background:var(--bbx-b);box-shadow:inset 0 -3px 0 rgba(0,0,0,.08)}',
    '.bbx-box .body{left:7px;right:7px;top:26px;bottom:4px;border-radius:0 0 9px 9px;background:color-mix(in srgb,var(--bbx-b) 82%,#fff)}',
    '.bbx-box .rib{left:50%;top:12px;bottom:4px;width:10px;margin-left:-5px;background:var(--bbx-r)}',
    '.bbx-box .bow{left:50%;top:0;width:30px;height:16px;margin-left:-15px;background:radial-gradient(circle at 25% 60%,var(--bbx-r) 0 6px,transparent 7px),radial-gradient(circle at 75% 60%,var(--bbx-r) 0 6px,transparent 7px)}',
    '.bbx-box .q{left:0;right:0;top:34px;text-align:center;font-size:18px;font-weight:900;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.15)}',
    '.bbx-card:hover .bbx-box{animation:bbx-wiggle .6s ease-in-out}',
    '.bbx-info{display:grid;gap:5px;min-width:0}',
    '.bbx-title{display:flex;align-items:baseline;gap:6px;font-size:14px;font-weight:900;color:var(--bbx-ink)}',
    '.bbx-title small{margin-left:auto;font-size:10.5px;font-weight:800;color:var(--bbx-soft)}',
    '.bbx-dots{display:flex;gap:3px}.bbx-dots i{width:9px;height:9px;border-radius:50%;background:color-mix(in srgb,var(--bbx-b) 22%,#fff);border:1.5px solid color-mix(in srgb,var(--bbx-b) 55%,transparent)}',
    '.bbx-dots i[data-on="true"]{background:var(--bbx-b)}.bbx-dots i[data-hidden="true"]{border-color:#e2b23a}.bbx-dots i[data-hidden="true"][data-on="true"]{background:linear-gradient(135deg,#ffe58a,#f0b429)}',
    '.bbx-meta{font-size:10.5px;color:var(--bbx-soft);line-height:1.45}',
    '.bbx-row{display:flex;flex-wrap:wrap;gap:6px}',
    '.bbx-btn{font:inherit;font-size:11.5px;font-weight:800;padding:6px 12px;border-radius:50px;border:0;cursor:pointer;color:#fff;background:var(--bbx-b);box-shadow:0 3px 0 color-mix(in srgb,var(--bbx-b) 70%,#000)}',
    '.bbx-btn:active{transform:translateY(2px);box-shadow:0 1px 0 color-mix(in srgb,var(--bbx-b) 70%,#000)}',
    '.bbx-btn.alt{background:#fff;color:var(--bbx-ink);border:2px solid color-mix(in srgb,var(--bbx-b) 50%,transparent);box-shadow:none}',
    '.bbx-btn.gold{background:linear-gradient(90deg,#ffcf55,#f59f2f);box-shadow:0 3px 0 #c97b17}',
    '.bbx-btn:disabled{opacity:.45;cursor:not-allowed}',
    '.bbx-swap{display:flex;flex-wrap:wrap;gap:6px;padding-top:6px;border-top:1.5px dashed color-mix(in srgb,var(--bbx-b) 40%,transparent)}',
    '.bbx-swap button{font:inherit;display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:50px;border:1.5px solid color-mix(in srgb,var(--bbx-b) 50%,transparent);background:#fff;font-size:11px;font-weight:700;color:var(--bbx-ink);cursor:pointer}',
    // 摆件：小底座 + 阴影；没有的是剪影；隐藏款金光。
    '.bbx-fig{position:relative;display:grid;justify-items:center;gap:2px;padding:8px 2px 6px;border-radius:14px;background:transparent;border:0;font:inherit;cursor:pointer;color:var(--bbx-ink)}',
    '.bbx-fig .em{position:relative;z-index:1;font-size:30px;line-height:1.1;filter:drop-shadow(0 3px 2px rgba(60,40,20,.25))}',
    '.bbx-fig .ped{width:42px;height:10px;margin-top:-4px;border-radius:50%;background:linear-gradient(#fff,color-mix(in srgb,var(--bbx-b) 35%,#fff));box-shadow:0 3px 0 color-mix(in srgb,var(--bbx-b) 45%,#bba),0 6px 6px rgba(0,0,0,.08)}',
    '.bbx-fig b{font-size:10.5px;font-weight:800}',
    '.bbx-fig .n{position:absolute;top:2px;right:4px;font-size:9.5px;font-weight:800;color:var(--bbx-soft)}',
    '.bbx-fig[data-missing="true"] .em{filter:brightness(0) opacity(.18)}',
    '.bbx-fig[data-missing="true"] b{color:var(--bbx-soft)}',
    '.bbx-fig[data-hidden="true"]:not([data-missing="true"]) .em{filter:drop-shadow(0 0 6px #ffd54a) drop-shadow(0 0 2px #ffb300)}',
    '.bbx-fig[data-hidden="true"]:not([data-missing="true"]) .ped{background:linear-gradient(#fff6c8,#f2c14e);box-shadow:0 3px 0 #c9952b,0 0 10px rgba(255,200,60,.6)}',
    '.bbx-fig[data-hidden="true"]::before{content:"隐藏";position:absolute;top:2px;left:4px;font-size:8.5px;font-weight:900;color:#c08417}',
    '.bbx-shelf{border-radius:20px;padding:10px 10px 4px;background:linear-gradient(170deg,var(--bbx-a),#fff 80%);border:2px solid color-mix(in srgb,var(--bbx-b) 40%,transparent)}',
    '.bbx-shelf .bbx-title{margin-bottom:4px}',
    '.bbx-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2px 4px;padding-bottom:6px;border-bottom:7px solid color-mix(in srgb,var(--bbx-b) 55%,#c9a77c);border-radius:0 0 4px 4px}',
    '.bbx-note{margin:6px 2px 4px;font-size:11px;line-height:1.5;color:var(--bbx-ink)}',
    // 开盒：盒子摇两下、盖子飞走、摆件一个个弹出来。
    '.bbx-stage{position:relative;overflow:hidden;display:grid;justify-items:center;gap:8px;padding:14px 10px 12px;border-radius:22px;background:radial-gradient(circle at 50% 30%,#fff 0 30%,var(--bbx-a) 75%);border:2px solid color-mix(in srgb,var(--bbx-b) 50%,transparent)}',
    '.bbx-stage canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}',
    '.bbx-stage .bbx-box{width:84px;height:84px;animation:bbx-shake .55s ease-in-out 2}',
    '.bbx-stage[data-open="true"] .bbx-box{display:none}',
    '.bbx-pop{display:none;grid-template-columns:repeat(5,1fr);gap:2px;width:100%}',
    '.bbx-pop[data-one="true"]{grid-template-columns:1fr}',
    '.bbx-stage[data-open="true"] .bbx-pop{display:grid}',
    '.bbx-pop .bbx-fig{animation:bbx-pop .45s cubic-bezier(.2,1.6,.4,1) both}',
    '.bbx-pop[data-one="true"] .bbx-fig .em{font-size:58px}',
    '.bbx-pop[data-one="true"] .bbx-fig .ped{width:76px;height:14px}',
    '.bbx-new{position:absolute;top:0;left:50%;transform:translateX(-50%);padding:1px 5px;border-radius:50px;background:#ff6b6b;color:#fff;font-size:8.5px;font-weight:900;z-index:2}',
    '.bbx-shard{font-size:9px;font-weight:800;color:var(--bbx-soft)}',
    '.bbx-say{font-size:13px;font-weight:900;color:var(--bbx-ink);text-align:center}',
    '@keyframes bbx-shake{0%,100%{transform:rotate(0)}20%{transform:rotate(-9deg)}40%{transform:rotate(8deg)}60%{transform:rotate(-6deg)}80%{transform:rotate(4deg)}}',
    '@keyframes bbx-wiggle{0%,100%{transform:rotate(0)}30%{transform:rotate(-5deg)}70%{transform:rotate(5deg)}}',
    '@keyframes bbx-pop{0%{transform:scale(.2) translateY(20px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.bbx-stage .bbx-box,.bbx-pop .bbx-fig,.bbx-card:hover .bbx-box{animation:none}}',
  ].join('\n')

  var tab = 'open'
  var swapOpen = null
  var picked = null
  var seenId = null
  var revealId = null
  var revealStartedAt = 0

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return
    var style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    ;(document.head || document.body).appendChild(style)
  }

  function boxArt(el) {
    var box = el('div', 'bbx-box')
    ;['lid', 'body', 'rib', 'bow'].forEach(function (part) { box.appendChild(el('i', part)) })
    var q = el('i', 'q'); q.textContent = '?'
    box.appendChild(q)
    return box
  }

  function figure(app, entry, opts) {
    var fig = app.button('bbx-fig', { 'data-fig': entry.key, 'data-hidden': String(entry.hidden), 'data-missing': String(!(opts && opts.reveal) && entry.count === 0) }, function () {
      if (opts && opts.onPick) opts.onPick(entry)
    })
    fig.appendChild(app.el('span', 'em', entry.emoji))
    fig.appendChild(app.el('i', 'ped'))
    fig.appendChild(app.el('b', null, !(opts && opts.reveal) && entry.count === 0 ? '？？？' : entry.label))
    if (!(opts && opts.reveal) && entry.count > 1) fig.appendChild(app.el('span', 'n', '×' + entry.count))
    return fig
  }

  /** 撒彩纸：一张画布，八十片纸，一秒半落完（隐藏款才撒）。 */
  function confetti(stage) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    var canvas = document.createElement('canvas')
    stage.appendChild(canvas)
    var w = canvas.width = stage.clientWidth || 280
    var h = canvas.height = stage.clientHeight || 220
    var ctx = canvas.getContext && canvas.getContext('2d')
    if (!ctx) return
    var colors = ['#ff6b6b', '#ffd54a', '#4dd0b4', '#7aa7ff', '#ff9ad5', '#ffb347']
    var bits = []
    for (var i = 0; i < 80; i += 1) bits.push({ x: w / 2, y: h * 0.45, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 8 - 3, r: Math.random() * 6, s: 4 + Math.random() * 4, c: colors[i % colors.length], spin: (Math.random() - 0.5) * 0.4 })
    var start = performance.now()
    function frame(now) {
      var t = now - start
      ctx.clearRect(0, 0, w, h)
      for (var k = 0; k < bits.length; k += 1) {
        var b = bits[k]
        b.vy += 0.28; b.x += b.vx; b.y += b.vy; b.r += b.spin
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c
        ctx.globalAlpha = Math.max(0, 1 - t / 1800)
        ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore()
      }
      if (t < 1800) requestAnimationFrame(frame)
      else canvas.remove()
    }
    requestAnimationFrame(frame)
  }

  /** 刚开的那一盒：第一次画时播动画，之后（面板每几秒重画）直接摆着结果。 */
  function renderReveal(app, data) {
    var last = data.last
    if (!last || last.id === seenId) return
    var def = data.series.find(function (s) { return s.key === last.series })
    if (!def) return
    var wrap = app.el('div', 'bbx-' + def.theme)
    var stage = app.el('div', 'bbx-stage')
    var fresh = revealId !== last.id
    if (fresh) { revealId = last.id; revealStartedAt = Date.now() }
    var elapsed = Date.now() - revealStartedAt
    stage.appendChild(boxArt(app.el))
    var pop = app.el('div', 'bbx-pop')
    pop.setAttribute('data-one', String(last.items.length === 1))
    last.items.forEach(function (got, index) {
      var entry = def.items.find(function (it) { return it.key === got.key })
      if (!entry) return
      var fig = figure(app, entry, { reveal: true })
      fig.style.animationDelay = (last.items.length === 1 ? 0 : index * 0.08) + 's'
      if (got.isNew) fig.appendChild(app.el('span', 'bbx-new', 'NEW'))
      else if (got.shards > 0) fig.appendChild(app.el('span', 'bbx-shard', '碎片 +' + got.shards))
      pop.appendChild(fig)
    })
    stage.appendChild(pop)
    var hidden = last.items.some(function (got) { return got.hidden })
    var say = app.el('div', 'bbx-say', hidden ? '✨ 隐藏款！✨' : (last.items.length === 1 ? '' : '十连！'))
    stage.appendChild(say)
    var ok = app.button('bbx-btn' + (hidden ? ' gold' : ''), { 'data-bbx-done': '1' }, function () { seenId = last.id; app.rerender && app.rerender() })
    ok.textContent = '收下'
    stage.appendChild(ok)
    wrap.appendChild(stage)
    app.content.appendChild(wrap)
    var openAfter = Math.max(0, 1100 - elapsed)
    if (openAfter === 0) stage.setAttribute('data-open', 'true')
    else setTimeout(function () {
      stage.setAttribute('data-open', 'true')
      if (hidden) confetti(stage)
    }, openAfter)
  }

  function renderOpen(app, data) {
    if (data.tickets > 0) {
      app.content.appendChild(app.el('div', 'bbx-ticket', '🎟 盲盒券 ×' + data.tickets + ' · 每张免费开 1 个'))
    }
    data.series.forEach(function (s) {
      var card = app.el('div', 'bbx-card bbx-' + s.theme)
      card.setAttribute('data-bbx-series', s.key)
      card.appendChild(boxArt(app.el))
      var info = app.el('div', 'bbx-info')
      var title = app.el('div', 'bbx-title', s.emoji + ' ' + s.label)
      title.appendChild(app.el('small', null, s.owned + '/' + s.items.length))
      info.appendChild(title)
      var dots = app.el('div', 'bbx-dots')
      s.items.forEach(function (it) {
        var d = app.el('i')
        d.setAttribute('data-on', String(it.count > 0))
        d.setAttribute('data-hidden', String(it.hidden))
        dots.appendChild(d)
      })
      info.appendChild(dots)
      var hiddenOwned = s.items.some(function (it) { return it.hidden && it.count > 0 })
      info.appendChild(app.el('div', 'bbx-meta', (hiddenOwned ? '隐藏款已收入' : '再抽 ' + s.pityLeft + ' 次必出隐藏款') + ' · 碎片 ' + s.shards))
      var row = app.el('div', 'bbx-row')
      if (data.tickets > 0) {
        var free = app.button('bbx-btn gold', { 'data-bbx-ticket': s.key }, function () { app.send('open', { series: s.key, count: 1, ticket: true }) })
        free.textContent = '🎟 用券开 1 个'
        row.appendChild(free)
      }
      var one = app.button('bbx-btn', { 'data-bbx-one': s.key }, function () { app.send('open', { series: s.key, count: 1 }) })
      one.textContent = '开 1 个 · ' + data.prices.one + ' 🪙'
      one.disabled = data.coins < data.prices.one
      row.appendChild(one)
      var ten = app.button('bbx-btn alt', { 'data-bbx-ten': s.key }, function () { app.send('open', { series: s.key, count: 10 }) })
      ten.textContent = '10 连 · ' + data.prices.ten + ' 🪙'
      ten.disabled = data.coins < data.prices.ten
      row.appendChild(ten)
      info.appendChild(row)
      var missing = s.items.filter(function (it) { return it.count === 0 })
      if (missing.length > 0 && s.shards >= data.swap.normal) {
        var swapBtn = app.button('bbx-btn alt', { 'data-bbx-swap': s.key }, function () { swapOpen = swapOpen === s.key ? null : s.key; app.rerender && app.rerender() })
        swapBtn.textContent = '🧩 用碎片换一个'
        row.appendChild(swapBtn)
      }
      if (swapOpen === s.key) {
        var list = app.el('div', 'bbx-swap')
        missing.forEach(function (it) {
          var cost = it.hidden ? data.swap.hidden : data.swap.normal
          var b = app.button('', { 'data-bbx-swap-item': it.key }, function () { swapOpen = null; app.send('swap', { series: s.key, item: it.key }) })
          b.textContent = it.emoji + ' ' + it.label + ' · ' + cost + ' 碎片'
          b.disabled = s.shards < cost
          list.appendChild(b)
        })
        info.appendChild(list)
      }
      card.appendChild(info)
      app.content.appendChild(card)
    })
  }

  function renderShelf(app, data) {
    data.series.forEach(function (s) {
      var shelf = app.el('div', 'bbx-shelf bbx-' + s.theme)
      shelf.setAttribute('data-bbx-shelf', s.key)
      var title = app.el('div', 'bbx-title', s.emoji + ' ' + s.label + (s.owned === s.items.length ? ' 🏅' : ''))
      title.appendChild(app.el('small', null, s.owned + '/' + s.items.length))
      shelf.appendChild(title)
      var grid = app.el('div', 'bbx-grid')
      s.items.forEach(function (it) {
        grid.appendChild(figure(app, it, { onPick: function (entry) { picked = picked === entry.key ? null : entry.key; app.rerender && app.rerender() } }))
      })
      shelf.appendChild(grid)
      var chosen = s.items.find(function (it) { return it.key === picked })
      if (chosen) shelf.appendChild(app.el('div', 'bbx-note', chosen.count > 0 ? chosen.emoji + ' ' + chosen.label + '：' + chosen.blurb : '还没抽到。' + (chosen.hidden ? '这是隐藏款，抽多了一定会出。' : '')))
      app.content.appendChild(shelf)
    })
  }

  function render(app) {
    ensureStyle()
    var data = app.data
    if (!data || !Array.isArray(data.series)) { app.content.appendChild(app.el('div', 'dp-empty', '盲盒还在准备……')); return }
    if (seenId === null) seenId = data.last ? data.last.id : 0
    var root = app.el('div', 'bbx')
    var outer = app.content
    app.content = root
    renderReveal(app, data)
    var tabs = app.el('div', 'bbx-tabs')
    ;[['open', '🎁 开盒'], ['shelf', '🏛 展示柜']].forEach(function (pair) {
      var b = app.button('bbx-tab', { 'data-bbx-tab': pair[0], 'aria-pressed': String(tab === pair[0]) }, function () { tab = pair[0]; app.rerender && app.rerender() })
      b.textContent = pair[1]
      tabs.appendChild(b)
    })
    root.appendChild(tabs)
    if (tab === 'shelf') renderShelf(app, data)
    else renderOpen(app, data)
    app.content = outer
    outer.appendChild(root)
  }

  if (window.dshPiggyExtensions) window.dshPiggyExtensions.register('blindbox', { render: render })
})()
