// 扭蛋扩展的面板。动画只用本次结果的开始时间计算，不受面板重画影响。
// 机器是一台老式扭蛋机：彩色顶盖、透明球罩里堆着两色胶囊、正面铭牌和大旋钮、左下出口。
;(function () {
  'use strict'
  var STYLE_ID = 'dsh-gacha-style'
  // 每台机器一种机身色：零食机草莓红、杂货机薄荷绿、药箱奶白配红十字。
  var CSS = [
    '.ga{--ga-body:#ef8a86;--ga-dark:#c9605d;--ga-light:#ffc9c2;--ga-plate:#fff6e8;color:var(--ac-text,#794f27)}.ga *{box-sizing:border-box}',
    '.ga[data-machine=goods]{--ga-body:#62c7b2;--ga-dark:#3f9c89;--ga-light:#bdeee2}.ga[data-machine=medicine]{--ga-body:#f6f0e6;--ga-dark:#d5c6ad;--ga-light:#fffaf2}',
    '.ga-top{display:flex;align-items:center;gap:10px;margin-bottom:10px}.ga-coins{font-weight:800;font-size:13px;white-space:nowrap}.ga-luck{flex:1;min-width:0;display:grid;gap:3px;font-size:10.5px;color:var(--ac-text-2,#9f927d)}.ga-luck-bar{height:6px;border-radius:9px;background:var(--ac-bg-disabled,#f0ece2);overflow:hidden}.ga-luck-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#f7d36b,#f0a63c)}',
    '.ga-flavors{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border-radius:999px;background:var(--ac-bg-content,#f7f3df);border:2px solid var(--ac-border-light,#e5dcc6)}.ga-flavor{border:0;border-radius:999px;background:transparent;color:var(--ac-text-muted,#8a7b66);padding:7px 2px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}.ga-flavor[aria-pressed=true]{background:var(--ga-flavor,#ef8a86);color:#fff;box-shadow:0 2px 0 rgba(0,0,0,.12)}.ga-flavor[data-ga-machine=snack]{--ga-flavor:#ef8a86}.ga-flavor[data-ga-machine=goods]{--ga-flavor:#4fbba5}.ga-flavor[data-ga-machine=medicine]{--ga-flavor:#d98b6a}',
    '.ga-stage{position:relative;margin:12px 0 10px;height:272px;border-radius:22px;background:radial-gradient(120% 80% at 50% 0%,#fffdf6 0 55%,var(--ac-bg-content,#f7f3df) 100%);border:2px solid var(--ac-border-light,#e5dcc6);overflow:hidden}',
    // 机器
    '.ga-m{position:absolute;left:50%;top:12px;width:170px;height:226px;margin-left:-85px;transform-origin:50% 100%}',
    '.ga-cap-top{position:absolute;left:31px;top:0;width:108px;height:20px;border-radius:14px 14px 6px 6px;background:var(--ga-body);box-shadow:inset 0 -4px 0 var(--ga-dark)}.ga-cap-top:after{content:"";position:absolute;left:44px;top:-7px;width:20px;height:9px;border-radius:9px 9px 0 0;background:var(--ga-dark)}',
    '.ga-globe{position:absolute;left:17px;top:16px;width:136px;height:112px;border-radius:66px 66px 18px 18px;background:radial-gradient(90% 80% at 35% 25%,rgba(255,255,255,.95),rgba(225,244,250,.55) 60%,rgba(200,232,242,.6));border:3px solid rgba(160,205,220,.75);overflow:hidden}.ga-globe:after{content:"";position:absolute;left:18px;top:12px;width:16px;height:54px;border-radius:50%;background:rgba(255,255,255,.85);transform:rotate(28deg)}',
    '.ga-ball{position:absolute;width:30px;height:30px;border-radius:50%;background:linear-gradient(var(--a) 0 48%,rgba(255,255,255,.9) 48% 52%,#fffdf8 52%);border:2px solid rgba(120,100,80,.18);box-shadow:inset -3px -4px 0 rgba(0,0,0,.06)}',
    '.ga-body{position:absolute;left:12px;top:122px;width:146px;height:96px;border-radius:12px 12px 20px 20px;background:var(--ga-body);box-shadow:inset 0 -7px 0 var(--ga-dark),0 6px 0 rgba(120,95,60,.12)}',
    '.ga-plate{position:absolute;left:12px;top:10px;width:122px;height:22px;border-radius:8px;background:var(--ga-plate);color:var(--ga-dark);font-size:11.5px;font-weight:900;letter-spacing:2px;text-align:center;line-height:22px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.06)}.ga[data-machine=medicine] .ga-plate{color:#e06a63}',
    '.ga-knob{position:absolute;right:16px;top:40px;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#f1ece2);border:3px solid var(--ga-dark);box-shadow:0 3px 0 rgba(0,0,0,.12)}.ga-knob:before{content:"";position:absolute;left:50%;top:4px;bottom:4px;width:10px;margin-left:-5px;border-radius:6px;background:var(--ga-dark)}.ga-knob:after{content:"";position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#fff}',
    '.ga-slot-coin{position:absolute;right:66px;top:48px;width:7px;height:20px;border-radius:4px;background:var(--ga-dark);box-shadow:inset 1px 1px 0 rgba(0,0,0,.25)}',
    '.ga-chute{position:absolute;left:16px;top:44px;width:56px;height:38px;border-radius:10px 10px 16px 16px;background:#5b4636;box-shadow:inset 0 6px 0 rgba(0,0,0,.25)}.ga-chute:after{content:"";position:absolute;left:4px;right:4px;top:0;height:14px;border-radius:8px 8px 3px 3px;background:var(--ga-light);opacity:.85}',
    '.ga-cross{position:absolute;left:63px;top:-118px;width:20px;height:20px;display:none;z-index:2}.ga[data-machine=medicine] .ga-cross{display:block}.ga-cross:before,.ga-cross:after{content:"";position:absolute;background:#e86a63;border-radius:2px}.ga-cross:before{left:7px;top:0;width:6px;height:20px}.ga-cross:after{left:0;top:7px;width:20px;height:6px}',
    '.ga-feet{position:absolute;left:24px;top:214px;width:122px;height:10px}.ga-feet:before,.ga-feet:after{content:"";position:absolute;top:0;width:24px;height:10px;border-radius:0 0 6px 6px;background:var(--ga-dark)}.ga-feet:before{left:0}.ga-feet:after{right:0}',
    '.ga-rates{position:absolute;left:0;right:0;bottom:5px;text-align:center;font-size:10px;color:var(--ac-text-2,#9f927d)}.ga-rates b{font-weight:800}',
    // 扭的过程：旋钮转一圈、球罩里抖一抖、出口滚出一颗胶囊
    '.ga-stage[data-spin=true] .ga-knob{animation:ga-turn .7s cubic-bezier(.5,0,.3,1) both}.ga-stage[data-spin=true] .ga-ball{animation:ga-jiggle .5s .25s ease-in-out both}.ga-stage[data-spin=true] .ga-m{animation:ga-rock .5s .2s ease-in-out both}',
    '.ga-drop{position:absolute;left:61px;top:170px;width:28px;height:28px;border-radius:50%;opacity:0;background:linear-gradient(var(--a) 0 48%,#fff 48% 52%,#fffdf8 52%);border:2px solid rgba(120,100,80,.2);animation:ga-drop .5s .75s cubic-bezier(.3,.6,.4,1) both;z-index:3}',
    '@keyframes ga-turn{to{transform:rotate(360deg)}}@keyframes ga-jiggle{25%{transform:translate(-3px,-5px) rotate(-12deg)}55%{transform:translate(3px,-2px) rotate(10deg)}80%{transform:translate(-1px,-3px)}}@keyframes ga-rock{30%{transform:rotate(-1.5deg)}70%{transform:rotate(1.5deg)}}',
    '@keyframes ga-drop{0%{opacity:0;transform:translate(0,-6px) scale(.6)}20%{opacity:1}60%{transform:translate(-40px,34px) rotate(-200deg)}80%{transform:translate(-46px,28px) rotate(-240deg)}100%{opacity:1;transform:translate(-50px,34px) rotate(-260deg)}}',
    // 结果：一颗胶囊在台子上掰开，东西蹦出来
    '.ga-open{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:6px;padding:14px 10px 12px;text-align:center}',
    '.ga-pod{position:relative;width:86px;height:86px;margin-bottom:4px}.ga-half{position:absolute;left:0;width:86px;height:43px;border:3px solid rgba(120,100,80,.2)}.ga-half.up{top:0;border-radius:43px 43px 4px 4px;background:var(--a)}.ga-half.down{bottom:0;border-radius:4px 4px 43px 43px;background:#fffdf8}',
    '.ga-pod .ga-half.up{animation:ga-lid .45s var(--t0,1s) cubic-bezier(.3,1.4,.5,1) forwards}.ga-pod .ga-half.down{animation:ga-base .45s var(--t0,1s) ease-out forwards}',
    '.ga-item{position:absolute;left:50%;top:50%;font-size:52px;line-height:1;transform:translate(-50%,-50%) scale(0);animation:ga-item .5s calc(var(--t0,1s) + .12s) cubic-bezier(.3,1.6,.5,1) forwards}',
    '.ga-name{font-weight:900;font-size:16px;opacity:0;animation:ga-fade .3s calc(var(--t0,1s) + .35s) forwards}.ga-tag{justify-self:center;padding:3px 11px;border-radius:999px;font-size:11px;font-weight:800;background:#f1ece2;color:#8a7b66;opacity:0;animation:ga-fade .3s calc(var(--t0,1s) + .45s) forwards}',
    '[data-rarity=rare] .ga-tag{background:#d9effc;color:#2b78a8}[data-rarity=gold] .ga-tag{background:#ffe9a8;color:#946510}[data-rarity=gold] .ga-name{color:#b97c0e}',
    '.ga-rays{position:absolute;left:50%;top:44%;width:240px;height:240px;margin:-120px 0 0 -120px;border-radius:50%;background:repeating-conic-gradient(rgba(255,214,102,.42) 0 10deg,transparent 10deg 30deg);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%);opacity:0;animation:ga-rays 3s calc(var(--t0,1s) + .1s) linear forwards;pointer-events:none}',
    '@keyframes ga-lid{to{transform:translate(-26px,-30px) rotate(-38deg);opacity:0}}@keyframes ga-base{to{transform:translate(18px,26px) rotate(22deg);opacity:0}}@keyframes ga-item{to{transform:translate(-50%,-50%) scale(1)}}@keyframes ga-fade{to{opacity:1}}@keyframes ga-rays{0%{opacity:0;transform:rotate(0) scale(.6)}15%{opacity:1}100%{opacity:.7;transform:rotate(90deg) scale(1)}}',
    // 十连：5×2 小胶囊依次掰开
    '.ga-ten{position:absolute;inset:0;padding:12px 10px 10px;display:grid;grid-template-rows:auto 1fr;gap:8px}.ga-ten-head{display:flex;align-items:center;justify-content:space-between;min-height:24px;font-weight:900;font-size:13px}.ga-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:1fr 1fr;gap:6px}',
    '.ga-cell{position:relative;min-width:0;border-radius:14px;background:#fffdf8;border:2px solid #ece5d4;display:grid;place-items:center;align-content:center;gap:2px;padding:4px 2px}.ga-cell[data-rarity=rare]{background:#eef8ff;border-color:#a9d7f3}.ga-cell[data-rarity=gold]{background:#fff6da;border-color:#efc75a;animation:ga-glow 1.4s calc(var(--t0,1s) + .3s) ease-out both}',
    '.ga-cell .ga-pod{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px}.ga-cell .ga-half{width:34px;height:17px;border-width:2px}.ga-cell .ga-half.up{border-radius:17px 17px 2px 2px}.ga-cell .ga-half.down{border-radius:2px 2px 17px 17px}',
    '.ga-cell .ga-item{position:static;transform:scale(0);font-size:26px;animation-name:ga-item-s}.ga-cell b{font-size:10px;line-height:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0;animation:ga-fade .25s calc(var(--t0,1s) + .3s) forwards}.ga-cell[data-rarity=gold] b{color:#b97c0e}.ga-cell[data-rarity=rare] b{color:#2b78a8}',
    '.ga-count{position:absolute;right:4px;top:2px;font-size:9.5px;font-weight:900;color:var(--ac-text-2,#9f927d);opacity:0;animation:ga-fade .25s calc(var(--t0,1s) + .3s) forwards}',
    '@keyframes ga-item-s{to{transform:scale(1)}}@keyframes ga-glow{40%{box-shadow:0 0 14px 4px #f6d36b}100%{box-shadow:0 0 6px 1px rgba(246,211,107,.6)}}',
    '.ga-now *,.ga-now *:before,.ga-now *:after{animation-delay:0s!important;animation-duration:.01s!important}',
    '.ga-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ga-actions .dp-btn{display:grid;gap:1px;padding:9px 4px;border-radius:14px}.ga-actions small{font-size:11px;font-weight:700;opacity:.9}',
    '.ga-history{margin-top:10px;font-size:12px;color:var(--ac-text-muted,#8a7b66)}.ga-history summary{cursor:pointer;padding:4px 2px}.ga-history ol{margin:4px 0 0;padding-left:20px}.ga-history li{margin:3px 0}.ga-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;background:#fffdf8;border:1px solid #c9bea8}.ga-dot[data-rarity=rare]{background:#79bfe9;border-color:#79bfe9}.ga-dot[data-rarity=gold]{background:#f2c54e;border-color:#f2c54e}',
    '@media (prefers-reduced-motion:reduce){.ga *,.ga *:before,.ga *:after{animation-duration:.01ms!important;animation-delay:0ms!important}}',
  ].join('\n')

  // 球罩里胶囊的位置和颜色（上半壳颜色）。
  var BALLS = [[6, 76, '#f6b6b0'], [34, 80, '#8fd0ec'], [62, 78, '#f7d77a'], [90, 76, '#b7dea0'], [18, 52, '#f0b7dc'], [48, 54, '#9fdcc9'], [76, 50, '#f6b98a'], [34, 28, '#c9b6f0'], [64, 28, '#f6b6b0']]
  var SHELL = { normal: '#f1ece2', rare: '#7cc1ec', gold: '#f2c54e' }
  var SPIN = 1.3 // 机器转完、胶囊滚出来的秒数，之后换成掰开的结果
  var TEN_OPEN = 0.22 // 十连每颗依次掰开的间隔

  var machine = 'snack'
  var seenId = null
  var startedId = null
  var startedAt = 0
  var skipped = {}
  var timer = null

  function reducedMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches }

  function style() {
    if (document.getElementById(STYLE_ID)) return
    var node = document.createElement('style')
    node.id = STYLE_ID; node.textContent = CSS
    ;(document.head || document.body).appendChild(node)
  }

  function delay(node, seconds) { node.style.animationDelay = seconds + 's' }

  function machineNode(app, label, last, elapsed) {
    var m = app.el('div', 'ga-m')
    m.appendChild(app.el('i', 'ga-cap-top'))
    var globe = app.el('div', 'ga-globe')
    BALLS.forEach(function (b) {
      var ball = app.el('i', 'ga-ball')
      ball.style.left = b[0] + 'px'; ball.style.top = b[1] + 'px'; ball.style.setProperty('--a', b[2])
      if (last) delay(ball, 0.25 - elapsed)
      globe.appendChild(ball)
    })
    m.appendChild(globe)
    var body = app.el('div', 'ga-body')
    body.appendChild(app.el('div', 'ga-plate', label))
    body.appendChild(app.el('i', 'ga-chute'))
    body.appendChild(app.el('i', 'ga-cross'))
    body.appendChild(app.el('i', 'ga-slot-coin'))
    var knob = app.el('i', 'ga-knob')
    if (last) delay(knob, -elapsed)
    body.appendChild(knob)
    m.appendChild(body)
    m.appendChild(app.el('i', 'ga-feet'))
    if (last) {
      delay(m, 0.2 - elapsed)
      var best = last.items.some(function (g) { return g.rarity === 'gold' }) ? 'gold' : last.items.some(function (g) { return g.rarity === 'rare' }) ? 'rare' : 'normal'
      var drop = app.el('i', 'ga-drop')
      drop.style.setProperty('--a', SHELL[best])
      delay(drop, 0.75 - elapsed)
      m.appendChild(drop)
    }
    return m
  }

  function pod(app, rarity) {
    var node = app.el('div', 'ga-pod')
    node.style.setProperty('--a', SHELL[rarity])
    node.appendChild(app.el('i', 'ga-half up'))
    node.appendChild(app.el('i', 'ga-half down'))
    return node
  }

  function rarityText(r) { return r === 'gold' ? '金色 · 超稀有' : r === 'rare' ? '蓝色 · 稀有' : '白色 · 普通' }

  function singleNode(app, got, t0) {
    var box = app.el('div', 'ga-open')
    box.setAttribute('data-rarity', got.rarity)
    box.style.setProperty('--t0', t0 + 's')
    if (got.rarity === 'gold') box.appendChild(app.el('i', 'ga-rays'))
    var p = pod(app, got.rarity)
    p.appendChild(app.el('span', 'ga-item', got.emoji))
    box.appendChild(p)
    box.appendChild(app.el('div', 'ga-name', got.label + ' ×' + got.count))
    box.appendChild(app.el('span', 'ga-tag', rarityText(got.rarity)))
    return box
  }

  function tenNode(app, last, t0, onSkip) {
    var box = app.el('div', 'ga-ten')
    var head = app.el('div', 'ga-ten-head')
    head.appendChild(app.el('span', null, '十连扭蛋'))
    if (onSkip) {
      var skip = app.button('dp-mini dp-mini-plain', { 'data-ga-skip': '1' }, onSkip)
      skip.textContent = '跳过'
      head.appendChild(skip)
    }
    box.appendChild(head)
    var grid = app.el('div', 'ga-grid')
    last.items.forEach(function (got, i) {
      var cell = app.el('div', 'ga-cell')
      cell.setAttribute('data-rarity', got.rarity)
      cell.style.setProperty('--t0', (t0 + i * TEN_OPEN) + 's')
      cell.appendChild(pod(app, got.rarity))
      cell.appendChild(app.el('span', 'ga-item', got.emoji))
      cell.appendChild(app.el('b', null, got.label))
      cell.appendChild(app.el('span', 'ga-count', '×' + got.count))
      grid.appendChild(cell)
    })
    box.appendChild(grid)
    return box
  }

  function render(app) {
    style()
    var data = app.data
    if (!data || !Array.isArray(data.machines)) { app.content.appendChild(app.el('div', 'dp-empty', '扭蛋机还在准备……')); return }
    if (seenId === null) seenId = data.last ? data.last.id : 0
    if (timer !== null) { clearTimeout(timer); timer = null }

    var last = data.last && data.last.id !== seenId ? data.last : null
    if (last && startedId !== last.id) { startedId = last.id; startedAt = Date.now() }
    var elapsed = last ? (reducedMotion() ? 99 : (Date.now() - startedAt) / 1000) : 99
    if (last) machine = last.machine
    var current = data.machines.find(function (m) { return m.key === machine }) || data.machines[0]

    var root = app.el('div', 'ga')
    root.setAttribute('data-machine', current.key)

    var top = app.el('div', 'ga-top')
    top.appendChild(app.el('span', 'ga-coins', '🪙 ' + data.coins))
    var luck = app.el('div', 'ga-luck')
    luck.appendChild(app.el('span', null, '幸运值 ' + data.luck + '/20 · 满了必出金色'))
    var bar = app.el('div', 'ga-luck-bar')
    var fill = app.el('i'); fill.style.width = Math.min(100, data.luck / 20 * 100) + '%'
    bar.appendChild(fill); luck.appendChild(bar)
    top.appendChild(luck)
    root.appendChild(top)

    var flavors = app.el('div', 'ga-flavors')
    data.machines.forEach(function (choice) {
      var b = app.button('ga-flavor', { 'data-ga-machine': choice.key, 'aria-pressed': String(current.key === choice.key) }, function () { if (!last) { machine = choice.key; app.rerender() } })
      b.textContent = choice.emoji + ' ' + choice.label
      flavors.appendChild(b)
    })
    root.appendChild(flavors)

    var stage = app.el('div', 'ga-stage')
    var spinning = !!last && elapsed < SPIN
    if (!last || spinning) {
      stage.setAttribute('data-spin', String(spinning))
      stage.appendChild(machineNode(app, current.label, spinning ? last : null, elapsed))
      if (!last) {
        var rates = app.el('div', 'ga-rates')
        rates.innerHTML = '⚪ 普通 <b>80%</b> · 🔵 稀有 <b>17%</b> · 🟡 金色 <b>3%</b>'
        stage.appendChild(rates)
      }
      if (spinning) timer = setTimeout(function () { timer = null; app.rerender() }, (SPIN - elapsed) * 1000 + 20)
    } else {
      var since = elapsed - SPIN
      var ten = last.items.length > 1
      var end = ten ? 0.15 + 9 * TEN_OPEN + 0.6 : 0.8
      var instant = !!skipped[last.id] || since >= end
      if (instant) stage.className += ' ga-now'
      stage.appendChild(ten
        ? tenNode(app, last, 0.15 - since, instant ? null : function () { skipped[last.id] = true; app.rerender() })
        : singleNode(app, last.items[0], 0.15 - since))
      if (!instant) timer = setTimeout(function () { timer = null; app.rerender() }, (end - since) * 1000 + 20)
    }
    root.appendChild(stage)

    var actions = app.el('div', 'ga-actions')
    if (last) {
      var done = app.button('dp-btn', { 'data-ga-done': '1' }, function () { seenId = last.id; app.rerender() })
      done.textContent = spinning ? '扭蛋中……' : '收下（已放进背包）'
      done.disabled = spinning
      actions.style.gridTemplateColumns = '1fr'
      actions.appendChild(done)
    } else {
      var one = app.button('dp-btn', { 'data-ga-one': '1' }, function () { app.send('spin', { machine: current.key, count: 1 }) })
      one.appendChild(app.el('span', null, '扭一次'))
      one.appendChild(app.el('small', null, data.free ? '今日免费' : '60 🪙'))
      one.disabled = !data.free && data.coins < 60
      actions.appendChild(one)
      var tenBtn = app.button('dp-btn', { 'data-ga-ten': '1' }, function () { app.send('spin', { machine: current.key, count: 10 }) })
      tenBtn.appendChild(app.el('span', null, '扭十次'))
      tenBtn.appendChild(app.el('small', null, '540 🪙'))
      tenBtn.disabled = data.coins < 540
      actions.appendChild(tenBtn)
    }
    root.appendChild(actions)

    if (data.history.length > 0) {
      var history = app.el('details', 'ga-history')
      history.appendChild(app.el('summary', null, '最近扭到的（' + data.history.length + '）'))
      var list = app.el('ol')
      data.history.forEach(function (got) {
        var row = app.el('li')
        var dot = app.el('i', 'ga-dot'); dot.setAttribute('data-rarity', got.rarity)
        row.appendChild(dot); row.appendChild(app.el('span', null, got.emoji + ' ' + got.label + ' ×' + got.count))
        list.appendChild(row)
      })
      history.appendChild(list); root.appendChild(history)
    }
    app.content.appendChild(root)
  }

  if (window.dshPiggyExtensions) window.dshPiggyExtensions.register('gacha', { render: render })
})()
