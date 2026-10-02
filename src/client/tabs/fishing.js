// @ts-check
/** C5 fishing App: charge, bite reflex and a 60fps vertical catch game. */
import { button, el } from '../dom.js'

let frame = 0
let activeUi = null
let resolving = false
const raf = fn => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : 0
const caf = id => { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id) }

function stopLoop() { if (frame) caf(frame); frame = 0; activeUi = null; resolving = false }

/** Closing the panel during a hooked game is a loss and stops its animation. */
export function closeFishing(ui) {
  const playing = activeUi === ui && ui.view.fishing.pending?.phase === 'hooked'
  stopLoop()
  if (playing) ui.send('fishResolve', { success: false })
}

export function renderFishingTab(ui) {
  stopLoop()
  const pending = ui.view.fishing.pending
  if (ui.view.activity?.kind === 'fishing') return renderAway(ui)
  if (pending?.phase === 'waiting') return renderWaiting(ui, pending)
  if (pending?.phase === 'hooked') return renderGame(ui, pending)
  if (pending?.phase === 'caught') return renderResult(ui, pending)
  renderReady(ui)
}

function renderReady(ui) {
  ui.content.appendChild(el('div', 'dp-fish-scene', '🌊　🐟　～　🌿'))
  ui.content.appendChild(el('div', 'dp-fish-copy', '按住抛竿，松手决定距离。抛得越远，遇见稀有鱼的机会越大。'))
  const meter = el('div', 'dp-fish-charge')
  const fill = el('i')
  meter.appendChild(fill)
  ui.content.appendChild(meter)
  let power = 0
  let direction = 1
  let charging = false
  let last = 0
  function tick(now) {
    if (!charging) return
    const elapsed = last === 0 ? 16 : Math.min(40, now - last)
    last = now
    power += direction * elapsed / 900
    if (power >= 1) { power = 1; direction = -1 }
    if (power <= 0) { power = 0; direction = 1 }
    fill.style.width = Math.round(power * 100) + '%'
    frame = raf(tick)
  }
  const cast = button('dp-btn dp-btn-wide dp-fish-cast', { 'data-fish': 'cast' }, function () {})
  cast.textContent = '🎣 按住蓄力'
  function start(event) { event?.preventDefault?.(); if (charging) return; charging = true; cast.textContent = '松手抛竿！'; frame = raf(tick) }
  function release(event) { event?.preventDefault?.(); if (!charging) return; charging = false; caf(frame); frame = 0; ui.send('fishCast', { power }) }
  cast.addEventListener('pointerdown', start)
  cast.addEventListener('pointerup', release)
  cast.addEventListener('pointercancel', release)
  cast.addEventListener('keydown', function (event) { if (event.code === 'Space' || event.key === ' ') start(event) })
  cast.addEventListener('keyup', function (event) { if (event.code === 'Space' || event.key === ' ') release(event) })
  ui.content.appendChild(cast)
  const auto = el('div', 'dp-fish-auto')
  auto.appendChild(el('b', null, '自动钓鱼'))
  auto.appendChild(el('span', null, '今天还可出发 ' + ui.view.fishing.autoLeft + ' 次 · 收益按 70% 自动卖出'))
  for (const minutes of [30, 60]) {
    const go = button('dp-mini', { 'data-fish-auto': String(minutes) }, function () { ui.send('fishAuto', { minutes }) })
    go.textContent = minutes + ' 分钟'
    go.disabled = ui.view.fishing.autoLeft <= 0 || ui.view.canGoOut !== true
    auto.appendChild(go)
  }
  ui.content.appendChild(auto)
}

function renderWaiting(ui, pending) {
  const water = button('dp-fish-waiting', { 'data-fish': 'hook' }, function () {
    if (Date.now() >= pending.bitesAt && Date.now() <= pending.hookUntil) ui.send('fishHook')
  })
  const mark = el('span', 'dp-fish-bobber', '🎣')
  const line = el('b', null, '安静等鱼咬钩…')
  water.appendChild(mark)
  water.appendChild(line)
  ui.content.appendChild(water)
  activeUi = ui
  function tick() {
    if (activeUi !== ui) return
    const now = Date.now()
    if (now >= pending.bitesAt && now <= pending.hookUntil) { mark.textContent = '❗'; line.textContent = '上钩了！快点！'; water.setAttribute('data-bite', 'true') }
    else if (now > pending.hookUntil) { stopLoop(); ui.send('fishHook'); return }
    frame = raf(tick)
  }
  frame = raf(tick)
}

function renderGame(ui, fish) {
  const wrap = el('div', 'dp-fish-game')
  const track = el('div', 'dp-fish-track')
  const bar = el('i', 'dp-fish-bar')
  const icon = el('span', 'dp-fish-target', fish.emoji)
  const progress = el('div', 'dp-fish-progress')
  const progressFill = el('i')
  progress.appendChild(progressFill)
  track.appendChild(bar); track.appendChild(icon); wrap.appendChild(track); wrap.appendChild(progress)
  wrap.appendChild(el('div', 'dp-fish-help', '按住鼠标或空格让绿条上升，松开会下落'))
  ui.content.appendChild(wrap)
  let held = false
  let player = .35
  let velocity = 0
  let target = .55
  let targetVelocity = 0
  let capture = .3
  let last = 0
  let changeAt = 0
  const setHeld = value => event => { event?.preventDefault?.(); held = value }
  wrap.addEventListener('pointerdown', setHeld(true)); wrap.addEventListener('pointerup', setHeld(false)); wrap.addEventListener('pointercancel', setHeld(false))
  wrap.setAttribute('tabindex', '0'); wrap.addEventListener('keydown', event => { if (event.code === 'Space') setHeld(true)(event) }); wrap.addEventListener('keyup', event => { if (event.code === 'Space') setHeld(false)(event) })
  activeUi = ui
  function finish(success) { if (resolving) return; resolving = true; stopLoop(); ui.send('fishResolve', { success }) }
  function tick(now) {
    if (activeUi !== ui || ui.host.getAttribute('data-open') !== 'true') return finish(false)
    const dt = Math.min(.04, last === 0 ? .016 : (now - last) / 1000); last = now
    velocity += (held ? 1.9 : -1.45) * dt; velocity *= .965; player = Math.max(0, Math.min(.82, player + velocity * dt))
    if (now >= changeAt) {
      const force = .12 + fish.difficulty / 180
      const bias = fish.behavior === 'sink' ? -.35 : fish.behavior === 'rise' ? .35 : 0
      targetVelocity = (Math.random() * 2 - 1 + bias) * force
      if (fish.behavior === 'dash' || fish.behavior === 'mixed') targetVelocity *= 1.7
      changeAt = now + Math.max(180, 1200 - fish.difficulty * 9) + Math.random() * 500
    }
    targetVelocity *= .992; target += targetVelocity * dt
    if (target < .02 || target > .96) { target = Math.max(.02, Math.min(.96, target)); targetVelocity *= -.8 }
    const inside = target >= player && target <= player + .18
    capture += (inside ? .16 : -.11 - fish.difficulty / 1200) * dt
    bar.style.bottom = Math.round(player * 100) + '%'; icon.style.bottom = Math.round(target * 100) + '%'; progressFill.style.height = Math.round(Math.max(0, Math.min(1, capture)) * 100) + '%'
    if (capture >= 1) return finish(true)
    if (capture <= 0) return finish(false)
    frame = raf(tick)
  }
  frame = raf(tick)
}

function renderResult(ui, fish) {
  const card = el('div', 'dp-fish-result')
  card.appendChild(el('div', 'dp-fish-result-emoji', fish.emoji))
  card.appendChild(el('b', null, '钓到了 ' + fish.label + '！'))
  card.appendChild(el('span', null, fish.sizeCm.toFixed(1) + ' cm · 🪙 ' + fish.price))
  const keep = button('dp-btn dp-btn-wide', { 'data-fish': 'keep' }, function () { ui.send('fishKeep') })
  keep.textContent = '🎒 放进背包'
  card.appendChild(keep)
  ui.content.appendChild(card)
}

function renderAway(ui) {
  ui.content.appendChild(el('div', 'dp-fish-away', '🎣'))
  ui.content.appendChild(el('div', 'dp-empty', ui.view.activity.label + ' · 回来时会自动卖鱼'))
}
