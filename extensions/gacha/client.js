// 扭蛋扩展的面板。动画只用本次结果的开始时间计算，不受面板重画影响。
;(function () {
  'use strict'
  var STYLE_ID = 'dsh-gacha-style'
  var CSS = [
    '.ga{color:#53635a}.ga *{box-sizing:border-box}.ga-head{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.ga-chip{border:1px solid #e8e6d8;border-radius:99px;background:var(--ac-bg-input,#fffaf0);padding:5px 10px;font-size:12px}',
    '.ga-flavors{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.ga-flavor{border:1px solid #d7e8dc;border-radius:13px;background:#fffdf5;color:#53635a;padding:9px 4px;cursor:pointer}.ga-flavor[aria-pressed=true]{border-color:#44b6a2;background:#e8f8f2;color:#237a6c;font-weight:bold}',
    '.ga-scene{margin:14px 0;padding:16px 12px 10px;border-radius:20px;background:linear-gradient(#fffdf5,#f5f7e8);border:1px solid #e9eadb;text-align:center;overflow:hidden}.ga-machine{width:190px;height:210px;position:relative;margin:0 auto}.ga-dome{position:absolute;top:0;left:17px;width:156px;height:133px;border:5px solid #a5dbce;border-radius:80px 80px 38px 38px;background:linear-gradient(130deg,#f2fffdcc,#c7ebf3aa);box-shadow:inset 9px 5px 0 #ffffffa6,0 6px 14px #aac8b25c;overflow:hidden}.ga-dome:after{content:"";position:absolute;top:10px;left:26px;width:20px;height:75px;transform:rotate(32deg);border-radius:50%;background:#ffffff8a}.ga-ball{position:absolute;width:29px;height:24px;border-radius:50%;border:2px solid #ffffffaa;box-shadow:inset 0 -8px 0 #00000018}.ga-ball:nth-child(1){left:12px;bottom:8px;background:#f3bd78}.ga-ball:nth-child(2){left:40px;bottom:5px;background:#91cce8}.ga-ball:nth-child(3){left:70px;bottom:10px;background:#f4d576}.ga-ball:nth-child(4){left:100px;bottom:5px;background:#f3a9af}.ga-ball:nth-child(5){left:25px;bottom:31px;background:#b4d6a0}.ga-ball:nth-child(6){left:63px;bottom:32px;background:#eab6d9}.ga-ball:nth-child(7){left:92px;bottom:30px;background:#95d8c6}',
    '.ga-base{position:absolute;top:121px;left:10px;width:170px;height:88px;border-radius:16px 16px 24px 24px;background:linear-gradient(110deg,#73cab8,#4fa994);border:4px solid #438d7e;box-shadow:0 7px 0 #d4dfc9}.ga-handle{position:absolute;right:22px;top:143px;width:35px;height:35px;border:6px solid #e8f7ed;border-radius:50%;background:#ffe1a6;box-shadow:0 0 0 3px #397c70}.ga-handle:after{content:"";position:absolute;left:10px;top:-13px;width:7px;height:46px;border-radius:5px;background:#fffdf0}.ga-exit{position:absolute;top:169px;left:38px;width:53px;height:28px;border:4px solid #397c70;border-radius:9px 9px 17px 17px;background:#d9f2e8;box-shadow:inset 0 7px 0 #8fb9ae}',
    '.ga-scene[data-spinning=true] .ga-handle{animation:ga-turn .6s ease-in-out both}.ga-scene[data-spinning=true] .ga-ball{animation:ga-shake .35s .55s ease-in-out both}.ga-prize{min-height:28px;font-size:12px;color:#648075}.ga-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.ga-actions button{border-radius:13px;padding:10px 4px}.ga-actions small{display:block;font-size:11px;font-weight:normal;opacity:.85}',
    '.ga-reveal{padding:12px;border:1px solid #e9e5d3;background:#fffdf7;border-radius:17px;margin-top:12px}.ga-reveal-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.ga-caps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.ga-caps[data-one=true]{grid-template-columns:1fr;max-width:160px;margin:auto}.ga-slot{position:relative;min-height:92px;text-align:center;border-radius:11px;background:#f7f8ed;padding:6px 2px;overflow:hidden}.ga-caps[data-one=true] .ga-slot{min-height:124px}.ga-cap{position:relative;display:block;width:38px;height:38px;margin:6px auto;border:0;background:transparent;cursor:pointer}.ga-cap:before,.ga-cap:after{content:"";position:absolute;left:0;width:38px;height:20px;border:2px solid #c6d0c9}.ga-cap:before{top:0;border-radius:20px 20px 2px 2px;background:#fff}.ga-cap:after{bottom:0;border-radius:2px 2px 20px 20px;background:#d7ddd8}.ga-slot[data-rarity=rare] .ga-cap:before{background:#e9f8ff;border-color:#72b7e4}.ga-slot[data-rarity=rare] .ga-cap:after{background:#64b4e7;border-color:#72b7e4}.ga-slot[data-rarity=gold] .ga-cap:before{background:#fff4bc;border-color:#d8a740;box-shadow:0 -4px 11px #eab943}.ga-slot[data-rarity=gold] .ga-cap:after{background:#e6b944;border-color:#d8a740;box-shadow:0 4px 11px #eab943}.ga-result{font-size:11px;line-height:1.25;opacity:0;transform:translateY(12px)}.ga-result em{display:block;font-size:24px;font-style:normal}.ga-result b{display:block;color:#496459}.ga-slot[data-rarity=rare] b{color:#3586bd}.ga-slot[data-rarity=gold] b{color:#b47a16}',
    '.ga-slot[data-auto=true] .ga-cap{animation:ga-roll .5s ease-out both}.ga-slot[data-auto=true] .ga-cap:before{animation:ga-top .35s var(--open-delay) ease-out forwards}.ga-slot[data-auto=true] .ga-cap:after{animation:ga-bottom .35s var(--open-delay) ease-out forwards}.ga-slot[data-auto=true] .ga-result{animation:ga-pop .4s ease-out var(--result-delay) forwards}.ga-cap[data-open=true]:before{animation:ga-top .35s ease-out forwards}.ga-cap[data-open=true]:after{animation:ga-bottom .35s ease-out forwards}.ga-history{margin-top:12px;border:1px solid #e8e6d8;border-radius:12px;background:#fffdf6;padding:8px}.ga-history summary{cursor:pointer;font-size:12px}.ga-history li{font-size:12px;margin:5px 0}.ga-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;background:#fff;border:1px solid #aaa}.ga-dot[data-rarity=rare]{background:#70b8e7}.ga-dot[data-rarity=gold]{background:#eec24d}',
    '@keyframes ga-turn{to{transform:rotate(360deg)}}@keyframes ga-shake{20%,60%{transform:translate(-5px,-3px)}40%,80%{transform:translate(5px,2px)}}@keyframes ga-roll{from{opacity:0;transform:translate(-90px,-48px) rotate(-180deg)}to{opacity:1;transform:none}}@keyframes ga-top{to{transform:translate(-5px,-18px) rotate(-18deg);opacity:0}}@keyframes ga-bottom{to{transform:translate(5px,18px) rotate(18deg);opacity:0}}@keyframes ga-pop{to{opacity:1;transform:none}}',
    '.ga-scene{margin:12px 0;padding:12px 8px 14px}.ga-machine{height:210px}.ga-prize{margin-top:10px;min-height:18px;line-height:18px}.ga-eject{position:absolute;left:56px;top:176px;width:33px;height:33px;border:2px solid #b6c5bb;border-radius:50%;background:linear-gradient(#fff 49%,#dce4dd 50%);box-shadow:0 3px 7px #718c7880;opacity:0;animation:ga-eject .48s .5s ease-out both}.ga-eject[data-rarity=rare]{border-color:#74b7e3;background:linear-gradient(#effaff 49%,#68b9ec 50%)}.ga-eject[data-rarity=gold]{border-color:#d1a23d;background:linear-gradient(#fff6c3 49%,#edc456 50%);box-shadow:0 0 14px #efcb64}',
    '.ga-reveal{margin:12px 0;padding:10px 8px 12px;min-height:260px}.ga-reveal-head{min-height:30px;padding:0 3px 6px}.ga-caps{grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.ga-slot{min-width:0;min-height:88px;padding:0;border:1px solid #e6e9df;overflow:visible}.ga-slot[data-rarity=rare]{background:#edf8ff;border-color:#a7d8f4}.ga-slot[data-rarity=gold]{background:#fff8e4;border-color:#e6c364;animation:ga-glint .9s ease-out both}.ga-slot[data-rarity=gold]:after{content:"✦";position:absolute;right:2px;top:0;color:#dbab39;font-size:13px}.ga-slot .ga-cap{position:absolute;top:18px;left:50%;margin:0;transform:translateX(-50%);z-index:2;width:34px;height:34px}.ga-slot .ga-cap:before,.ga-slot .ga-cap:after{width:34px;height:18px}.ga-result{position:absolute;inset:8px 1px auto;min-width:0}.ga-result em{font-size:30px;line-height:34px}.ga-result b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:16px}.ga-caps[data-one=true]{max-width:none;grid-template-columns:1fr}.ga-caps[data-one=true] .ga-slot{min-height:188px;display:flex;align-items:center;justify-content:center;background:#fffdf7}.ga-caps[data-one=true] .ga-cap{top:48px;width:72px;height:72px}.ga-caps[data-one=true] .ga-cap:before,.ga-caps[data-one=true] .ga-cap:after{width:72px;height:37px;border-width:3px}.ga-caps[data-one=true] .ga-cap:before{border-radius:40px 40px 2px 2px}.ga-caps[data-one=true] .ga-cap:after{border-radius:2px 2px 40px 40px}.ga-caps[data-one=true] .ga-result{inset:18px 8px auto}.ga-caps[data-one=true] .ga-result em{font-size:48px;line-height:58px}.ga-caps[data-one=true] .ga-result b{font-size:16px;line-height:25px}.ga-rarity{display:inline-block;margin-top:5px;padding:3px 10px;border-radius:99px;background:#edf0eb;color:#5d6b63;font-size:11px}.ga-slot[data-rarity=rare] .ga-rarity{background:#d5edfc;color:#286f9c}.ga-slot[data-rarity=gold] .ga-rarity{background:#ffedb8;color:#976b11}.ga-reveal-foot{text-align:center;padding:10px 0 0;font-size:12px}.ga-done{display:block;width:100%;margin-top:10px;text-align:center;border-radius:12px;padding:9px}',
    '.ga-slot .ga-cap{left:calc(50% - 17px);transform:none}.ga-caps[data-one=true] .ga-cap{left:calc(50% - 36px)}.ga-caps[data-one=true] .ga-result{inset:35px 8px auto}',
    '.ga-caps:not([data-one=true]) .ga-result{top:12px}.ga-count{position:absolute;top:-10px;right:0;z-index:3;padding:0 3px;min-width:20px;border-radius:7px;background:#dfe8df;color:#496459;font-size:10px;line-height:15px;font-weight:bold}.ga-slot[data-rarity=rare] .ga-count{background:#cde9fa;color:#286f9c}.ga-slot[data-rarity=gold] .ga-count{background:#ffe8a0;color:#90630b}.ga-caps:not([data-one=true]) .ga-slot[data-rarity=gold]:after{left:2px;right:auto}',
    '@keyframes ga-eject{0%{opacity:0;transform:translate(0,-18px) scale(.4) rotate(-60deg)}35%{opacity:1}100%{opacity:1;transform:translate(-18px,9px) rotate(110deg)}}@keyframes ga-glint{0%,100%{box-shadow:0 0 0 transparent}40%{box-shadow:0 0 18px 5px #f5d46a}}',
    '@media (prefers-reduced-motion:reduce){.ga *,.ga *:before,.ga *:after{animation-duration:.01ms!important;animation-delay:0ms!important;transition:none!important}}',
  ].join('\n')

  var machine = 'snack'
  var seenId = null
  var startedId = null
  var startedAt = 0
  var skipped = {}
  var opened = {}
  var phaseTimer = null
  var scrolledMachineId = null
  var scrolledRevealId = null

  function reducedMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches }

  function style() {
    if (document.getElementById(STYLE_ID)) return
    var node = document.createElement('style')
    node.id = STYLE_ID; node.textContent = CSS
    ;(document.head || document.body).appendChild(node)
  }

  function machineView(app, last, elapsed) {
    var scene = app.el('div', 'ga-scene')
    scene.setAttribute('data-spinning', String(!!last && elapsed < 1))
    var body = app.el('div', 'ga-machine')
    var dome = app.el('div', 'ga-dome')
    for (var i = 0; i < 7; i++) {
      var ball = app.el('i', 'ga-ball')
      ball.style.animationDelay = (0.55 - elapsed) + 's'
      dome.appendChild(ball)
    }
    body.appendChild(dome)
    body.appendChild(app.el('div', 'ga-base'))
    var handle = app.el('i', 'ga-handle')
    handle.style.animationDelay = (-elapsed) + 's'
    body.appendChild(handle)
    body.appendChild(app.el('i', 'ga-exit'))
    if (last) {
      var eject = app.el('i', 'ga-eject')
      eject.setAttribute('data-rarity', last.items[0].rarity)
      eject.style.animationDelay = (0.5 - elapsed) + 's'
      body.appendChild(eject)
    }
    scene.appendChild(body)
    scene.appendChild(app.el('div', 'ga-prize', '⚪ 普通 80% · 🔵 稀有 17% · 🟡 金色 3%'))
    return scene
  }

  function reveal(app, last) {
    if (!last || seenId === last.id) return null
    if (startedId !== last.id) { startedId = last.id; startedAt = Date.now() }
    var elapsed = reducedMotion() ? 99 : (Date.now() - startedAt) / 1000
    var ten = last.items.length > 1
    var panel = app.el('div', 'ga-reveal')
    var head = app.el('div', 'ga-reveal-head')
    head.appendChild(app.el('b', null, ten ? '十连扭蛋' : '扭蛋出炉'))
    if (ten && !skipped[last.id] && elapsed < 5.4) {
      var skip = app.button('dp-mini dp-mini-plain', { 'data-ga-skip': '1' }, function () { skipped[last.id] = true; app.rerender && app.rerender() })
      skip.textContent = '跳过动画'; head.appendChild(skip)
    }
    panel.appendChild(head)
    var caps = app.el('div', 'ga-caps')
    caps.setAttribute('data-one', String(!ten))
    last.items.forEach(function (got, i) {
      var slot = app.el('div', 'ga-slot')
      slot.setAttribute('data-rarity', got.rarity)
      var start = ten ? 1 + i * 0.12 : 1
      var open = ten ? 1.6 + i * 0.33 : 1.6
      var instant = reducedMotion() || skipped[last.id] || opened[last.id + ':' + i]
      if (got.rarity === 'gold') slot.style.animationDelay = instant ? '0s' : (open - elapsed) + 's'
      slot.setAttribute('data-auto', String(!instant))
      var cap = app.button('ga-cap', { 'data-ga-cap': String(i), 'aria-label': '打开' + got.rarity + '胶囊' }, function () { opened[last.id + ':' + i] = true; app.rerender && app.rerender() })
      cap.setAttribute('data-open', String(!!instant))
      if (!instant) {
        cap.style.animationDelay = (start - elapsed) + 's'
        slot.style.setProperty('--open-delay', (open - elapsed) + 's')
        slot.style.setProperty('--result-delay', (open + 0.3 - elapsed) + 's')
      }
      slot.appendChild(cap)
      var result = app.el('div', 'ga-result')
      if (instant) { result.style.opacity = '1'; result.style.transform = 'none' }
      if (ten) result.appendChild(app.el('span', 'ga-count', '×' + got.count))
      result.appendChild(app.el('em', null, got.emoji))
      result.appendChild(app.el('b', null, ten ? got.label : got.label + ' ×' + got.count))
      if (!ten) result.appendChild(app.el('span', 'ga-rarity', got.rarity === 'gold' ? '金色 · 超稀有' : got.rarity === 'rare' ? '蓝色 · 稀有' : '白色 · 普通'))
      slot.appendChild(result)
      caps.appendChild(slot)
    })
    panel.appendChild(caps)
    panel.appendChild(app.el('div', 'ga-reveal-foot', ten ? '都放进背包啦' : '已放进背包'))
    var done = app.button('dp-btn ga-done', { 'data-ga-done': '1' }, function () { seenId = last.id; app.rerender && app.rerender() })
    done.textContent = '收下'; panel.appendChild(done)
    return { node: panel, elapsed: elapsed, ten: ten }
  }

  function render(app) {
    style()
    var data = app.data
    if (!data || !Array.isArray(data.machines)) { app.content.appendChild(app.el('div', 'dp-empty', '扭蛋机还在准备……')); return }
    if (seenId === null) seenId = data.last ? data.last.id : 0
    var root = app.el('div', 'ga')
    var chips = app.el('div', 'ga-head')
    chips.appendChild(app.el('span', 'ga-chip', '🪙 ' + data.coins))
    chips.appendChild(app.el('span', 'ga-chip', data.free ? '今日首次免费' : '今日免费已用'))
    chips.appendChild(app.el('span', 'ga-chip', '幸运值 ' + data.luck + ' · 再 ' + data.pityLeft + ' 次必出金色'))
    root.appendChild(chips)
    var flavors = app.el('div', 'ga-flavors')
    data.machines.forEach(function (choice) {
      var button = app.button('ga-flavor', { 'data-ga-machine': choice.key, 'aria-pressed': String(machine === choice.key) }, function () { machine = choice.key; app.rerender && app.rerender() })
      button.textContent = choice.emoji + ' ' + choice.label; flavors.appendChild(button)
    })
    root.appendChild(flavors)
    var result = reveal(app, data.last)
    if (phaseTimer !== null) { clearTimeout(phaseTimer); phaseTimer = null }
    if (result && result.elapsed < 1) {
      root.appendChild(machineView(app, data.last, result.elapsed))
      phaseTimer = setTimeout(function () { phaseTimer = null; app.rerender && app.rerender() }, Math.max(0, (1 - result.elapsed) * 1000))
    } else root.appendChild(result ? result.node : machineView(app, null, 99))
    if (result && result.ten && !skipped[data.last.id] && result.elapsed >= 1 && result.elapsed < 5.4) {
      phaseTimer = setTimeout(function () { phaseTimer = null; app.rerender && app.rerender() }, (5.4 - result.elapsed) * 1000)
    }
    var actions = app.el('div', 'ga-actions')
    var one = app.button('dp-btn', { 'data-ga-one': '1' }, function () { app.send('spin', { machine: machine, count: 1 }) })
    one.appendChild(app.el('span', null, '扭一次'))
    one.appendChild(app.el('small', null, data.free ? '今日免费' : '60 🪙'))
    one.disabled = !data.free && data.coins < 60
    actions.appendChild(one)
    var ten = app.button('dp-btn', { 'data-ga-ten': '1' }, function () { app.send('spin', { machine: machine, count: 10 }) })
    ten.appendChild(app.el('span', null, '扭十次'))
    ten.appendChild(app.el('small', null, '540 🪙'))
    ten.disabled = data.coins < 540
    actions.appendChild(ten)
    root.appendChild(actions)
    var history = app.el('details', 'ga-history')
    history.appendChild(app.el('summary', null, '最近记录（' + data.history.length + '）'))
    var list = app.el('ol')
    data.history.forEach(function (got) {
      var row = app.el('li')
      var dot = app.el('i', 'ga-dot'); dot.setAttribute('data-rarity', got.rarity)
      row.appendChild(dot); row.appendChild(app.el('span', null, got.emoji + ' ' + got.label + ' ×' + got.count))
      list.appendChild(row)
    })
    history.appendChild(list); root.appendChild(history)
    app.content.appendChild(root)
    if (result) {
      var showingReveal = result.elapsed >= 1
      var needsScroll = showingReveal ? scrolledRevealId !== data.last.id : scrolledMachineId !== data.last.id
      if (needsScroll) {
        var resultId = data.last.id
        setTimeout(function () {
          var stage = root.querySelector(showingReveal ? '.ga-reveal' : '.ga-scene')
          if (stage && stage.isConnected && stage.scrollIntoView) {
            stage.scrollIntoView({ block: 'nearest' })
            if (showingReveal) scrolledRevealId = resultId
            else scrolledMachineId = resultId
          }
        }, 0)
      }
    }
  }

  if (window.dshPiggyExtensions) window.dshPiggyExtensions.register('gacha', { render: render })
})()
