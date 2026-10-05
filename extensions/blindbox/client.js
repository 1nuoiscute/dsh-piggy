// 盲盒扩展 2.0 · 面板部分（照明日方舟寻访）。三个页签：寻访、展示柜、凭证商店。
// 开盒：补给箱落下 → 缝里透出星级颜色的光 → 打开；10 连先排两行小箱子，再一个个翻开，可跳过。
// 动画时间都写成 CSS 延迟，面板每几秒重画一次也能接着播，不会从头开始。
;(function () {
  'use strict'
  var STYLE_ID = 'dsh-piggy-blindbox2-style'
  var STAR = { 3: '#aeb9c4', 4: '#b48cf2', 5: '#f2b632', 6: '#ff7a2f' }
  var CSS = [
    '.bx{--ink:var(--ac-text,#794f27);--soft:var(--ac-text-2,#9f927d);display:grid;gap:10px}',
    '.bx [data-s="3"],.bx[data-s="3"]{--c:' + STAR[3] + ';--cl:#eef2f5}.bx [data-s="4"],.bx[data-s="4"]{--c:' + STAR[4] + ';--cl:#f3ecff}.bx [data-s="5"],.bx[data-s="5"]{--c:' + STAR[5] + ';--cl:#fff4d6}.bx [data-s="6"],.bx[data-s="6"]{--c:' + STAR[6] + ';--cl:#ffe6d6}',
    '.bx-tabs{display:flex;gap:4px;padding:3px;border-radius:50px;background:var(--ac-bg-content,#f7f3df);border:2px solid var(--ac-border-light,#e5dcc6)}',
    '.bx-tab{flex:1;font:inherit;font-size:11.5px;font-weight:800;padding:6px 0;border:0;border-radius:50px;background:transparent;color:var(--soft);cursor:pointer}',
    '.bx-tab[aria-pressed="true"]{background:var(--ac-primary,#19c8b9);color:#fff;box-shadow:0 2px 0 var(--ac-primary-active,#11a89b)}',
    '.bx-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.bx-chip{padding:4px 10px;border-radius:50px;font-size:11px;font-weight:800;background:var(--ac-bg-input,#fffbe7);border:1.5px solid var(--ac-border-light,#e5dcc6);color:var(--ink)}',
    // 卡池卡片：深色底、UP 摆件在中间发光。
    '.bx-banner{position:relative;overflow:hidden;border-radius:20px;padding:12px;color:#fff;box-shadow:0 4px 0 rgba(0,0,0,.18)}',
    '.bx-banner[data-b="standard"]{background:linear-gradient(150deg,#3b4a6b,#22304d 70%)}',
    '.bx-banner[data-b="limited"]{background:linear-gradient(150deg,#7a3d64,#3a2453 70%)}',
    '.bx-banner::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 70% 35%,rgba(255,255,255,.18),transparent 55%);pointer-events:none}',
    '.bx-btop{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:900}',
    '.bx-days{margin-left:auto;padding:2px 8px;border-radius:50px;background:rgba(255,255,255,.16);font-size:10px;font-weight:800}',
    '.bx-ups{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:6px;align-items:end;margin:10px 0 8px}',
    '.bx-up{display:grid;justify-items:center;gap:1px;position:relative}',
    '.bx-up .em{font-size:30px;line-height:1.1;filter:drop-shadow(0 0 8px var(--c))}',
    '.bx-up[data-big="true"] .em{font-size:46px}',
    '.bx-up b{font-size:10.5px}.bx-up i{font-style:normal;font-size:9px;letter-spacing:-1px;color:var(--c)}',
    '.bx-up .tag{position:absolute;top:-2px;right:6px;padding:0 5px;border-radius:50px;background:var(--c);color:#fff;font-size:8.5px;font-weight:900}',
    '.bx-pity{font-size:10.5px;opacity:.85;margin-bottom:8px}',
    '.bx-row{display:flex;flex-wrap:wrap;gap:6px}',
    '.bx-btn{font:inherit;font-size:11.5px;font-weight:800;padding:7px 12px;border-radius:50px;border:0;cursor:pointer;color:#fff;background:linear-gradient(90deg,#ffb347,#ff7a2f);box-shadow:0 3px 0 #b8521c}',
    '.bx-btn.alt{background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.5);box-shadow:none}',
    '.bx-btn.tk{background:linear-gradient(90deg,#ffe07a,#f5b82e);color:#6b3d00;box-shadow:0 3px 0 #b88418}',
    '.bx-btn:active{transform:translateY(2px)}.bx-btn:disabled{opacity:.45;cursor:not-allowed}',
    // 开盒舞台：夜空底，光一亮就知道几星。
    '.bx-stage{position:relative;overflow:hidden;border-radius:22px;padding:14px 10px 12px;background:radial-gradient(circle at 50% 20%,#3d4a78,#161c33 75%);color:#fff;display:grid;justify-items:center;gap:10px}',
    '.bx-stage canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}',
    '.bx-skip{position:absolute;top:8px;right:10px;font:inherit;font-size:10.5px;font-weight:800;padding:3px 10px;border-radius:50px;border:1.5px solid rgba(255,255,255,.5);background:transparent;color:#fff;cursor:pointer;z-index:3}',
    '.bx-slot{position:relative;display:grid;justify-items:center;align-content:end;width:100%;min-height:120px}',
    '.bx-crate{position:absolute;left:50%;bottom:30px;width:64px;height:54px;margin-left:-32px;border-radius:9px;background:linear-gradient(#c9935a,#9c6a3a);box-shadow:inset 0 0 0 3px #7c5230,inset 0 -8px 0 rgba(0,0,0,.12);animation:bx-drop .5s cubic-bezier(.3,1.4,.5,1) both,bx-shake .5s ease-in-out both,bx-gone .25s ease-in both;animation-delay:var(--d0),var(--d1),var(--d3)}',
    '.bx-crate::before{content:"";position:absolute;left:3px;right:3px;top:12px;height:4px;border-radius:2px;background:var(--c);box-shadow:0 0 10px 2px var(--c);opacity:0;animation:bx-leak .6s ease-out both;animation-delay:var(--d2)}',
    '.bx-crate::after{content:"?";position:absolute;inset:0;display:grid;place-items:center;font-weight:900;font-size:20px;color:rgba(255,255,255,.85)}',
    '.bx-beam{position:absolute;left:50%;bottom:40px;width:46px;height:160px;margin-left:-23px;background:linear-gradient(transparent,var(--c));filter:blur(6px);opacity:0;animation:bx-beam .9s ease-out both;animation-delay:var(--d3)}',
    '.bx-fig{position:relative;display:grid;justify-items:center;opacity:0;animation:bx-pop .45s cubic-bezier(.2,1.6,.4,1) both;animation-delay:var(--d3)}',
    '.bx-fig .em{font-size:52px;line-height:1.1;filter:drop-shadow(0 0 10px var(--c))}',
    '.bx-ped{width:72px;height:13px;margin-top:-6px;border-radius:50%;background:radial-gradient(ellipse,var(--cl),var(--c));box-shadow:0 0 12px var(--c)}',
    '.bx-fig b{margin-top:4px;font-size:12.5px;font-weight:900}',
    '.bx-stars{display:flex;gap:1px;font-size:12px;color:var(--c)}.bx-stars span{opacity:0;animation:bx-star .2s ease-out both}',
    '.bx-tag{margin-top:2px;font-size:9.5px;font-weight:800;color:#ffd7a8}',
    '.bx-new{position:absolute;top:-4px;right:-10px;padding:0 5px;border-radius:50px;background:#ff5d6c;color:#fff;font-size:8.5px;font-weight:900}',
    '.bx-ten{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;width:100%;margin-top:18px}',
    '.bx-ten .bx-slot{min-height:84px}',
    '.bx-ten .bx-crate{width:42px;height:36px;margin-left:-21px;bottom:26px;border-radius:7px}',
    '.bx-ten .bx-crate::after{font-size:13px}',
    '.bx-ten .bx-crate::before{top:9px;height:3px;box-shadow:0 0 6px 1px var(--c)}',
    '.bx-sum{font-size:11px;font-weight:800;color:#ffd7a8;text-align:center;opacity:0;animation:bx-fade .3s ease-out both;animation-delay:var(--dend)}',
    '.bx-ten .bx-beam{width:30px;height:90px;margin-left:-15px}',
    '.bx-ten .bx-fig .em{font-size:28px}.bx-ten .bx-ped{width:40px;height:9px;margin-top:-4px}',
    '.bx-ten .bx-fig b{font-size:9.5px}.bx-ten .bx-stars{font-size:7.5px}.bx-ten .bx-tag{font-size:8px;text-align:center}',
    '.bx-ten .bx-new{right:-6px}',
    '.bx-say{font-size:13px;font-weight:900;text-align:center;opacity:0;animation:bx-fade .3s ease-out both;animation-delay:var(--dend)}',
    '.bx-done{font:inherit;font-size:12px;font-weight:900;padding:7px 22px;border-radius:50px;border:0;background:#fff;color:#22304d;cursor:pointer;opacity:0;animation:bx-fade .3s ease-out both;animation-delay:var(--dend)}',
    // 展示柜：按星级分区，底座和潜能格子用星级色。
    '.bx-tier{border-radius:18px;padding:10px 10px 6px;background:linear-gradient(170deg,var(--cl),#fff 75%);border:2px solid color-mix(in srgb,var(--c) 45%,transparent)}',
    '.bx-tier h4{display:flex;align-items:center;gap:6px;margin:0 0 6px;font-size:12.5px;color:var(--ink)}.bx-tier h4 i{font-style:normal;color:var(--c);letter-spacing:-1px}',
    '.bx-tier h4 small{margin-left:auto;font-size:10px;color:var(--soft)}',
    '.bx-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    '.bx-card{position:relative;display:grid;justify-items:center;gap:1px;padding:6px 2px 4px;border:0;border-radius:12px;background:transparent;font:inherit;color:var(--ink);cursor:pointer}',
    '.bx-card .em{font-size:28px;line-height:1.1;filter:drop-shadow(0 3px 2px rgba(60,40,20,.2))}',
    '.bx-card .bx-ped{width:40px;height:9px;margin-top:-4px;box-shadow:none}',
    '.bx-card b{font-size:10px}',
    '.bx-pot{display:flex;gap:2px;margin-top:1px}.bx-pot i{width:5px;height:5px;border-radius:2px;background:color-mix(in srgb,var(--c) 22%,#fff)}.bx-pot i[data-on="true"]{background:var(--c)}',
    '.bx-card[data-missing="true"] .em{filter:brightness(0) opacity(.16)}.bx-card[data-missing="true"] b{color:var(--soft)}',
    '.bx-card[data-s="6"]:not([data-missing="true"]) .em{filter:drop-shadow(0 0 6px var(--c))}',
    '.bx-note{margin:4px 2px;font-size:11px;line-height:1.5;color:var(--ink)}',
    // 凭证商店
    '.bx-shop{display:grid;gap:6px}',
    '.bx-item{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;background:var(--ac-bg-input,#fffbe7);border:2px solid var(--ac-border-light,#e5dcc6)}',
    '.bx-item .em{font-size:24px;text-align:center}.bx-item b{font-size:12px;color:var(--ink)}.bx-item small{display:block;font-size:10px;color:var(--soft)}',
    '.bx-buy{font:inherit;font-size:11px;font-weight:800;padding:5px 10px;border-radius:50px;border:0;background:var(--ac-primary,#19c8b9);color:#fff;cursor:pointer}.bx-buy:disabled{opacity:.4;cursor:not-allowed}',
    '.bx-pick{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:5px}',
    '.bx-pick button{font:inherit;font-size:11px;font-weight:700;padding:3px 9px;border-radius:50px;border:1.5px solid var(--c);background:#fff;color:var(--ink);cursor:pointer}',
    '@keyframes bx-drop{0%{transform:translateY(-90px);opacity:0}100%{transform:translateY(0);opacity:1}}',
    '@keyframes bx-shake{0%,100%{rotate:0deg}25%{rotate:-7deg}50%{rotate:6deg}75%{rotate:-4deg}}',
    '@keyframes bx-leak{0%{opacity:0}100%{opacity:1}}',
    '@keyframes bx-gone{to{opacity:0;transform:scale(1.25)}}',
    '@keyframes bx-beam{0%{opacity:0}35%{opacity:.95}100%{opacity:0}}',
    '@keyframes bx-pop{0%{opacity:0;transform:scale(.3) translateY(16px)}100%{opacity:1;transform:none}}',
    '@keyframes bx-star{0%{opacity:0;transform:scale(1.8)}100%{opacity:1;transform:none}}',
    '@keyframes bx-fade{to{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.bx-stage *{animation-duration:.01s!important;animation-delay:0s!important}}',
  ].join('\n')

  var tab = 'pull'
  var picked = null
  var pickOpen = null
  var seenId = null
  var startedId = null
  var startedAt = 0
  var skipped = {}
  var confettiDone = {}

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return
    var style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    ;(document.head || document.body).appendChild(style)
  }
  var starText = function (n) { return new Array(n + 1).join('★') }
  var byKey = function (data, key) { return data.catalog.find(function (f) { return f.key === key }) }

  /** 撒彩纸（6★ 才撒）。 */
  function confetti(stage, delayMs) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setTimeout(function () {
      if (!stage.isConnected) return
      var canvas = document.createElement('canvas')
      stage.appendChild(canvas)
      var w = canvas.width = stage.clientWidth || 280
      var h = canvas.height = stage.clientHeight || 220
      var ctx = canvas.getContext && canvas.getContext('2d')
      if (!ctx) return
      var colors = ['#ff7a2f', '#ffd54a', '#ff9ad5', '#7ad7ff', '#ffffff', '#ffb347']
      var bits = []
      for (var i = 0; i < 90; i += 1) bits.push({ x: w / 2, y: h * 0.42, vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 9 - 3, r: Math.random() * 6, s: 4 + Math.random() * 4, c: colors[i % colors.length], spin: (Math.random() - 0.5) * 0.4 })
      var start = performance.now()
      ;(function frame(now) {
        var t = now - start
        ctx.clearRect(0, 0, w, h)
        bits.forEach(function (b) {
          b.vy += 0.28; b.x += b.vx; b.y += b.vy; b.r += b.spin
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.globalAlpha = Math.max(0, 1 - t / 1900)
          ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore()
        })
        if (t < 1900) requestAnimationFrame(frame); else canvas.remove()
      })(start)
    }, Math.max(0, delayMs))
  }

  /** 一个格子：箱子（落下、摇、漏光、消失）→ 光柱 → 摆件 + 星星。t 是各阶段相对现在的秒数。 */
  function slot(app, data, got, t) {
    var f = byKey(data, got.key)
    var box = app.el('div', 'bx-slot')
    box.setAttribute('data-s', String(got.stars))
    var set = function (node, name, sec) { node.style.setProperty(name, sec.toFixed(2) + 's') }
    var crate = app.el('i', 'bx-crate')
    set(crate, '--d0', t.drop); set(crate, '--d1', t.shake); set(crate, '--d2', t.leak); set(crate, '--d3', t.open)
    box.appendChild(crate)
    if (got.stars >= 5) {
      var beam = app.el('i', 'bx-beam')
      set(beam, '--d3', t.open)
      box.appendChild(beam)
    }
    var figure = app.el('div', 'bx-fig')
    set(figure, '--d3', t.open + 0.05)
    figure.appendChild(app.el('span', 'em', f.emoji))
    figure.appendChild(app.el('i', 'bx-ped'))
    figure.appendChild(app.el('b', null, f.label))
    var stars = app.el('div', 'bx-stars')
    for (var i = 0; i < got.stars; i += 1) {
      var s = app.el('span', null, '★')
      s.style.animationDelay = (t.open + 0.25 + i * 0.1).toFixed(2) + 's'
      stars.appendChild(s)
    }
    figure.appendChild(stars)
    if (got.isNew) figure.appendChild(app.el('span', 'bx-new', 'NEW'))
    else figure.appendChild(app.el('span', 'bx-tag', '潜能 ' + got.potential + (!t.ten && got.certs > 0 ? ' · 凭证 +' + got.certs : '')))
    box.appendChild(figure)
    return box
  }

  /** 刚寻访的那一次。返回是不是第一次画（要滚到最上面）。 */
  function renderReveal(app, data) {
    var last = data.last
    if (!last || last.id === seenId) return false
    var fresh = startedId !== last.id
    if (fresh) { startedId = last.id; startedAt = Date.now() }
    var elapsed = skipped[last.id] ? 99 : (Date.now() - startedAt) / 1000
    var ten = last.items.length > 1
    var stage = app.el('div', 'bx bx-stage')
    // 十连还没翻完才有「跳过」；翻完了它自己消失。
    var lastOpen = 1.2 + (last.items.length - 1) * 0.25
    if (ten && !skipped[last.id] && elapsed < lastOpen) {
      var skip = app.button('bx-skip', { 'data-bx-skip': '1' }, function () { skipped[last.id] = true; app.rerender && app.rerender() })
      skip.textContent = '跳过 ›'
      skip.style.animation = 'bx-gone .2s ease-in both'
      skip.style.animationDelay = (lastOpen - elapsed).toFixed(2) + 's'
      stage.appendChild(skip)
    }
    var holder = ten ? app.el('div', 'bx-ten') : stage
    var end = 0
    last.items.forEach(function (got, i) {
      // 单抽：0 落下、0.5 摇、0.8 漏光、1.4 打开；十连：箱子一起落下漏光，1.2 秒起每 0.25 秒翻开一个。
      var open = ten ? 1.2 + i * 0.25 : 1.4
      var t = { drop: ten ? i * 0.03 : 0, shake: ten ? 0.45 : 0.5, leak: ten ? 0.7 : 0.8, open: open }
      for (var k in t) t[k] -= elapsed
      t.ten = ten
      holder.appendChild(slot(app, data, got, t))
      end = Math.max(end, open + 0.4 + got.stars * 0.1)
      if (got.stars === 6 && !confettiDone[last.id + ':' + i] && !skipped[last.id]) {
        confettiDone[last.id + ':' + i] = true
        confetti(stage, (open - elapsed + 0.1) * 1000)
      }
    })
    if (ten) stage.appendChild(holder)
    stage.style.setProperty('--dend', (end - elapsed).toFixed(2) + 's')
    var six = last.items.some(function (got) { return got.stars === 6 })
    stage.appendChild(app.el('div', 'bx-say', six ? '✨ 六星！✨' : (ten ? '寻访完成' : '')))
    if (ten) {
      var fresh = last.items.filter(function (got) { return got.isNew }).length
      var certs = last.items.reduce(function (sum, got) { return sum + got.certs }, 0)
      stage.appendChild(app.el('div', 'bx-sum', '新的 ' + fresh + ' 个' + (certs > 0 ? ' · 资质凭证 +' + certs : '')))
    }
    var done = app.button('bx-done', { 'data-bx-done': '1' }, function () { seenId = last.id; app.rerender && app.rerender() })
    done.textContent = '收下'
    stage.appendChild(done)
    app.content.appendChild(stage)
    return fresh
  }

  function renderBanners(app, data) {
    var chips = app.el('div', 'bx-chips')
    chips.appendChild(app.el('span', 'bx-chip', '🪙 ' + data.coins))
    chips.appendChild(app.el('span', 'bx-chip', '🎟 盲盒券 ×' + data.tickets))
    chips.appendChild(app.el('span', 'bx-chip', '📜 资质凭证 ' + data.certs))
    app.content.appendChild(chips)
    data.banners.forEach(function (b) {
      var card = app.el('div', 'bx-banner')
      card.setAttribute('data-b', b.key)
      var top = app.el('div', 'bx-btop', b.emoji + ' ' + b.label)
      top.appendChild(app.el('span', 'bx-days', '还剩 ' + b.daysLeft + ' 天'))
      card.appendChild(top)
      var ups = app.el('div', 'bx bx-ups')
      b.up6.concat(b.up5).forEach(function (key, i) {
        var f = byKey(data, key)
        var up = app.el('div', 'bx-up')
        up.setAttribute('data-s', String(f.stars))
        up.setAttribute('data-big', String(i === 0))
        up.appendChild(app.el('span', 'em', f.emoji))
        up.appendChild(app.el('b', null, f.label))
        up.appendChild(app.el('i', null, starText(f.stars)))
        up.appendChild(app.el('span', 'tag', 'UP'))
        ups.appendChild(up)
      })
      card.appendChild(ups)
      card.appendChild(app.el('div', 'bx-pity', b.since < 50
        ? '六星 2% · 再抽 ' + b.pityLeft + ' 次后，每抽六星概率 +2%（第 99 抽必出）'
        : '六星概率已提升到 ' + Math.round(b.sixChance * 100) + '%'))
      var row = app.el('div', 'bx-row')
      if (data.tickets > 0) {
        var free = app.button('bx-btn tk', { 'data-bx-ticket': b.key }, function () { app.send('open', { banner: b.key, count: 1, ticket: true }) })
        free.textContent = '🎟 用券寻访'
        row.appendChild(free)
      }
      var one = app.button('bx-btn', { 'data-bx-one': b.key }, function () { app.send('open', { banner: b.key, count: 1 }) })
      one.textContent = '寻访 1 次 · ' + data.prices.one + ' 🪙'
      one.disabled = data.coins < data.prices.one
      row.appendChild(one)
      var ten = app.button('bx-btn alt', { 'data-bx-ten': b.key }, function () { app.send('open', { banner: b.key, count: 10 }) })
      ten.textContent = '寻访 10 次 · ' + data.prices.ten + ' 🪙'
      ten.disabled = data.coins < data.prices.ten
      row.appendChild(ten)
      card.appendChild(row)
      app.content.appendChild(card)
    })
  }

  function renderShowcase(app, data) {
    var owned = data.catalog.filter(function (f) { return f.potential > 0 }).length
    var chips = app.el('div', 'bx-chips')
    chips.appendChild(app.el('span', 'bx-chip', '已收集 ' + owned + ' / ' + data.catalog.length))
    app.content.appendChild(chips)
    ;[6, 5, 4, 3].forEach(function (stars) {
      var list = data.catalog.filter(function (f) { return f.stars === stars })
      var tier = app.el('div', 'bx bx-tier')
      tier.setAttribute('data-s', String(stars))
      var h = app.el('h4')
      h.appendChild(app.el('i', null, starText(stars)))
      h.appendChild(app.el('span', null, stars + ' 星'))
      h.appendChild(app.el('small', null, list.filter(function (f) { return f.potential > 0 }).length + ' / ' + list.length))
      tier.appendChild(h)
      var grid = app.el('div', 'bx-grid')
      list.forEach(function (f) {
        var card = app.button('bx-card', { 'data-bx-fig': f.key, 'data-s': String(stars), 'data-missing': String(f.potential === 0) }, function () { picked = picked === f.key ? null : f.key; app.rerender && app.rerender() })
        card.appendChild(app.el('span', 'em', f.emoji))
        card.appendChild(app.el('i', 'bx-ped'))
        card.appendChild(app.el('b', null, f.potential > 0 ? f.label : '？？？'))
        if (f.potential > 0) {
          var pot = app.el('div', 'bx-pot')
          for (var i = 1; i <= 6; i += 1) { var dot = app.el('i'); dot.setAttribute('data-on', String(i <= f.potential)); pot.appendChild(dot) }
          card.appendChild(pot)
        }
        grid.appendChild(card)
      })
      tier.appendChild(grid)
      var chosen = list.find(function (f) { return f.key === picked })
      if (chosen) tier.appendChild(app.el('div', 'bx-note', chosen.potential > 0 ? chosen.emoji + ' ' + chosen.label + ' · ' + chosen.potential + ' 潜：' + chosen.blurb : '还没寻访到。'))
      app.content.appendChild(tier)
    })
  }

  function renderShop(app, data) {
    var chips = app.el('div', 'bx-chips')
    chips.appendChild(app.el('span', 'bx-chip', '📜 资质凭证 ' + data.certs))
    chips.appendChild(app.el('span', 'bx-chip', '重复的摆件给凭证：3★ 1 · 4★ 5 · 5★ 15 · 6★ 40'))
    app.content.appendChild(chips)
    var shop = app.el('div', 'bx bx-shop')
    data.shop.forEach(function (item) {
      var row = app.el('div', 'bx-item')
      row.appendChild(app.el('span', 'em', item.emoji))
      var name = app.el('div')
      name.appendChild(app.el('b', null, item.label))
      name.appendChild(app.el('small', null, item.note))
      row.appendChild(name)
      var pick = item.key === 'pick5' ? 5 : item.key === 'pick6' ? 6 : 0
      var missing = pick ? data.catalog.filter(function (f) { return f.stars === pick && f.potential === 0 }) : []
      var buy = app.button('bx-buy', { 'data-bx-buy': item.key }, function () {
        if (pick) { pickOpen = pickOpen === item.key ? null : item.key; app.rerender && app.rerender(); return }
        app.send('buy', { item: item.key })
      })
      buy.textContent = item.cost + ' 凭证'
      buy.disabled = data.certs < item.cost || (pick > 0 && missing.length === 0)
      row.appendChild(buy)
      if (pickOpen === item.key) {
        var list = app.el('div', 'bx-pick')
        list.setAttribute('data-s', String(pick))
        missing.forEach(function (f) {
          var b = app.button('', { 'data-bx-pick': f.key }, function () { pickOpen = null; app.send('buy', { item: item.key, pick: f.key }) })
          b.textContent = f.emoji + ' ' + f.label
          list.appendChild(b)
        })
        row.appendChild(list)
      }
      shop.appendChild(row)
    })
    app.content.appendChild(shop)
  }

  function render(app) {
    ensureStyle()
    var data = app.data
    if (!data || !Array.isArray(data.banners)) { app.content.appendChild(app.el('div', 'dp-empty', '盲盒还在准备……')); return }
    if (seenId === null) seenId = data.last ? data.last.id : 0
    var outer = app.content
    var root = app.el('div', 'bx')
    app.content = root
    var fresh = renderReveal(app, data)
    var tabs = app.el('div', 'bx-tabs')
    ;[['pull', '🎁 寻访'], ['shelf', '🏛 展示柜'], ['shop', '📜 凭证商店']].forEach(function (pair) {
      var b = app.button('bx-tab', { 'data-bx-tab': pair[0], 'aria-pressed': String(tab === pair[0]) }, function () { tab = pair[0]; app.rerender && app.rerender() })
      b.textContent = pair[1]
      tabs.appendChild(b)
    })
    root.appendChild(tabs)
    if (tab === 'shelf') renderShowcase(app, data)
    else if (tab === 'shop') renderShop(app, data)
    else renderBanners(app, data)
    app.content = outer
    outer.appendChild(root)
    // 面板重画后会把滚动位置放回去，所以等这一轮画完再滚到最上面看结果。
    if (fresh) setTimeout(function () { outer.scrollTop = 0 }, 0)
  }

  if (window.dshPiggyExtensions) window.dshPiggyExtensions.register('blindbox', { render: render })
})()
