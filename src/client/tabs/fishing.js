// @ts-check
/** C5 fishing App: charge, bite reflex and a circular skill-check QTE. */
import { button, el } from '../dom.js'

let frame = 0
let activeUi = null
let resolving = false
let qteSession = null
const raf = fn => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : 0
const caf = id => { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id) }

function stopLoop(clearSession = false) {
  if (frame) caf(frame)
  frame = 0
  activeUi = null
  if (clearSession) qteSession = null
}

/** Closing the panel during a hooked game is a loss and stops its animation. */
export function closeFishing(ui) {
  const playing = activeUi === ui && ui.view.fishing.pending?.phase === 'hooked'
  stopLoop(true)
  if (playing) ui.send('fishResolve', { success: false })
}

export function renderFishingTab(ui) {
  stopLoop()
  const pending = ui.view.fishing.pending
  if (pending?.phase !== 'hooked') resolving = false
  if (ui.view.activity?.kind === 'fishing') { qteSession = null; return renderAway(ui) }
  if (pending?.phase === 'waiting') { qteSession = null; return renderWaiting(ui, pending) }
  if (pending?.phase === 'hooked') return renderGame(ui, pending)
  qteSession = null
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

function qteRules(rawDifficulty) {
  const difficulty = Math.max(1, Math.min(100, Number(rawDifficulty) || 1))
  return {
    zoneDegrees: Math.round(96 - difficulty * .52),
    perfectDegrees: Math.round(16 - difficulty * .06),
    rotationsPerSecond: .48 + difficulty * .0048,
    hitsNeeded: difficulty >= 80 ? 4 : difficulty >= 45 ? 3 : 2,
  }
}

function newQteRound(session) {
  session.zoneStart = 105 + Math.random() * 135
  session.angle = 0
  session.startedAt = 0
  session.locked = false
  session.feedback = '看准绿色区域'
}

function renderGame(ui, fish) {
  const rules = qteRules(fish.difficulty)
  if (qteSession?.id !== fish.id) {
    qteSession = { id: fish.id, hits: 0, ...rules }
    newQteRound(qteSession)
  }
  const session = qteSession
  const wrap = button('dp-fish-qte', {
    'data-fish-qte': 'true',
    'data-qte-difficulty': String(fish.difficulty),
    'data-qte-needed': String(session.hitsNeeded),
    'aria-label': '钓鱼技能检定，指针进入绿色区域时点击',
  }, hit)
  const title = el('div', 'dp-fish-qte-title', fish.emoji + '　咬紧了！')
  const ring = el('div', 'dp-fish-qte-ring')
  const needle = el('i', 'dp-fish-qte-needle')
  const core = el('span', 'dp-fish-qte-core', fish.emoji)
  const score = el('b', 'dp-fish-qte-score')
  const feedback = el('span', 'dp-fish-qte-feedback')
  ring.appendChild(needle); ring.appendChild(core)
  wrap.appendChild(title); wrap.appendChild(ring); wrap.appendChild(score); wrap.appendChild(feedback)
  wrap.appendChild(el('div', 'dp-fish-help', '指针进入绿色区域时点击或按空格 · 黄色为完美判定'))
  wrap.setAttribute('tabindex', '0')
  wrap.addEventListener('keydown', event => {
    if ((event.code === 'Space' || event.key === ' ' || event.key === 'Enter') && !event.repeat) hit(event)
  })
  ui.content.appendChild(wrap)
  activeUi = ui

  function paint() {
    const perfectEnd = session.zoneStart + session.perfectDegrees
    const zoneEnd = session.zoneStart + session.zoneDegrees
    ring.style.background = `conic-gradient(from 0deg,#dce8e9 0deg ${session.zoneStart}deg,#ffd45d ${session.zoneStart}deg ${perfectEnd}deg,#6bd47b ${perfectEnd}deg ${zoneEnd}deg,#dce8e9 ${zoneEnd}deg 360deg)`
    needle.style.transform = `translateX(-50%) rotate(${session.angle}deg)`
    score.textContent = `技能检定 ${Math.min(session.hits, session.hitsNeeded)} / ${session.hitsNeeded}`
    feedback.textContent = session.feedback
    wrap.setAttribute('data-qte-angle', session.angle.toFixed(1))
    wrap.setAttribute('data-qte-zone-start', session.zoneStart.toFixed(1))
    wrap.setAttribute('data-qte-zone-size', String(session.zoneDegrees))
  }

  function finish(success) {
    if (resolving) return
    resolving = true
    stopLoop(true)
    ui.send('fishResolve', { success })
  }

  function hit(event) {
    event?.preventDefault?.()
    if (session.locked || activeUi !== ui) return
    const offset = session.angle - session.zoneStart
    if (offset < 0 || offset > session.zoneDegrees) {
      session.feedback = '失手了，鱼跑掉了…'
      paint()
      return finish(false)
    }
    const perfect = offset <= session.perfectDegrees
    session.hits += perfect ? 2 : 1
    session.feedback = perfect ? '完美！进度 +2' : '命中！'
    session.locked = true
    paint()
    if (session.hits >= session.hitsNeeded) return setTimeout(() => finish(true), 260)
    setTimeout(() => {
      if (qteSession !== session || resolving) return
      newQteRound(session)
      paint()
    }, 380)
  }

  function tick(now) {
    if (activeUi !== ui || ui.host.getAttribute('data-open') !== 'true') return finish(false)
    if (!session.startedAt) session.startedAt = now
    if (!session.locked) session.angle = (now - session.startedAt) * session.rotationsPerSecond * .36
    paint()
    if (!session.locked && session.angle > session.zoneStart + session.zoneDegrees + 8) {
      session.feedback = '错过时机，鱼跑掉了…'
      paint()
      return finish(false)
    }
    frame = raf(tick)
  }
  paint()
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
