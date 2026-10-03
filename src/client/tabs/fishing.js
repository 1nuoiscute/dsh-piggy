// @ts-check
/** Fishing App: one-click cast, bite reflex and a circular skill-check QTE. */
import { button, el } from '../dom.js'

let frame = 0
let activeUi = null
let resolving = false
let qteSession = null
let selectedBait = null
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
  ui.content.appendChild(el('div', 'dp-fish-copy', '每次抛竿消耗 1 个鱼饵。看到「❗」后及时提竿。'))
  const baits = ui.view.shop.filter(item => item.kind === 'bait' && (ui.view.inventory[item.key] ?? 0) > 0)
  if (!baits.some(item => item.key === selectedBait)) selectedBait = baits[0]?.key ?? null
  const choices = el('div', 'dp-dev-row dp-fish-baits')
  for (const bait of baits) {
    const choice = button('dp-mini dp-fish-bait', { 'data-fish-bait': bait.key }, function () { selectedBait = bait.key; ui.renderContent() })
    choice.textContent = `${bait.emoji} ${bait.label} ×${ui.view.inventory[bait.key]}`
    choice.setAttribute('aria-pressed', String(selectedBait === bait.key))
    choices.appendChild(choice)
  }
  ui.content.appendChild(choices)
  if (baits.length === 0) ui.content.appendChild(el('div', 'dp-fish-copy', '没有鱼饵了，先去商店的鱼饵货架买。'))
  const hungry = (ui.view.pig?.satiety ?? 0) < 1
  if (hungry) {
    ui.content.appendChild(el('div', 'dp-fish-blocked', '饱食为 0，先喂食才能抛竿。'))
    const care = button('dp-mini dp-fish-care', { 'data-fish-care': 'feed' }, function () { ui.select('status') })
    care.textContent = '去状态页喂食 →'
    ui.content.appendChild(care)
  }
  const cast = button('dp-btn dp-btn-wide dp-fish-cast', { 'data-fish': 'cast' }, function () { ui.send('fishCast', { power: .7, bait: selectedBait }) })
  cast.textContent = hungry ? '🍚 喂食后才能抛竿' : '🎣 抛竿'
  cast.disabled = selectedBait === null || hungry
  ui.content.appendChild(cast)
  const auto = el('div', 'dp-fish-auto')
  auto.appendChild(el('b', null, '自动钓鱼'))
  auto.appendChild(el('span', null, '今天还可出发 ' + ui.view.fishing.autoLeft + ' 次 · 每 3 分钟消耗 1 个鱼饵，收获放进鱼篓'))
  for (const minutes of [30, 60]) {
    const go = button('dp-mini', { 'data-fish-auto': String(minutes) }, function () { ui.send('fishAuto', { minutes, bait: selectedBait }) })
    go.textContent = `${minutes} 分钟（鱼饵 ${minutes / 3} 个）`
    go.disabled = ui.view.fishing.autoLeft <= 0 || ui.view.canGoOut !== true || (ui.view.inventory[selectedBait] ?? 0) < minutes / 3
    auto.appendChild(go)
  }
  ui.content.appendChild(auto)
}

function renderWaiting(ui, pending) {
  const water = button('dp-fish-waiting', { 'data-fish': 'hook' }, function () {
    if (Date.now() < pending.bitesAt) { line.textContent = '还没上钩，继续等…'; return }
    ui.send('fishHook')
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
    zoneDegrees: Math.round(115 - difficulty * .38),
    perfectDegrees: Math.round(16 - difficulty * .06),
    rotationsPerSecond: .28 + difficulty * .0018,
    hitsNeeded: difficulty >= 80 ? 4 : difficulty >= 45 ? 3 : 2,
  }
}

function newQteRound(session) {
  session.zoneStart = 105 + Math.random() * 135
  session.angle = 0
  session.completedCircles = 0
  session.startedAt = 0
  session.locked = false
  session.feedback = '看准绿色区域'
}

function renderGame(ui, fish) {
  const rules = qteRules(fish.difficulty)
  if (qteSession?.id !== fish.id) {
    qteSession = { id: fish.id, hits: 0, misses: 0, ...rules }
    newQteRound(qteSession)
  }
  const session = qteSession
  const wrap = button('dp-fish-qte', {
    'data-fish-qte': 'true',
    'data-qte-difficulty': String(fish.difficulty),
    'data-qte-needed': String(session.hitsNeeded),
    'aria-label': '钓鱼技能检定，指针进入绿色区域时点击',
  }, function (event) {
    // A pointer press is judged immediately below; its later click must not
    // award the same hit twice. Keyboard activation still arrives as click.
    if (event.detail > 0 && event.timeStamp - lastPointerAt < 700) return
    hit(event)
  })
  let lastPointerAt = -Infinity
  wrap.addEventListener('pointerdown', function (event) {
    lastPointerAt = event.timeStamp
    hit(event)
  })
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
  ui.content.appendChild(wrap)
  activeUi = ui

  function paint() {
    const displayAngle = session.angle % 360
    const perfectEnd = session.zoneStart + session.perfectDegrees
    const zoneEnd = session.zoneStart + session.zoneDegrees
    ring.style.background = `conic-gradient(from 0deg,#dce8e9 0deg ${session.zoneStart}deg,#ffd45d ${session.zoneStart}deg ${perfectEnd}deg,#6bd47b ${perfectEnd}deg ${zoneEnd}deg,#dce8e9 ${zoneEnd}deg 360deg)`
    needle.style.transform = `translateX(-50%) rotate(${displayAngle}deg)`
    score.textContent = `技能检定 ${Math.min(session.hits, session.hitsNeeded)} / ${session.hitsNeeded}`
    feedback.textContent = `${session.feedback} · 机会 ${'♥'.repeat(3 - session.misses)}${'♡'.repeat(session.misses)}`
    wrap.setAttribute('data-qte-angle', displayAngle.toFixed(1))
    wrap.setAttribute('data-qte-zone-start', session.zoneStart.toFixed(1))
    wrap.setAttribute('data-qte-zone-size', String(session.zoneDegrees))
    wrap.setAttribute('data-qte-misses', String(session.misses))
    wrap.setAttribute('data-qte-speed', String(session.rotationsPerSecond))
    wrap.setAttribute('data-qte-feedback', session.feedback)
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
    const offset = session.angle % 360 - session.zoneStart
    if (offset < 0 || offset > session.zoneDegrees) {
      session.feedback = offset < 0 ? '还没到时机，再等等' : '已经划过去了，等下一圈'
      paint()
      return
    }
    const perfect = offset <= session.perfectDegrees
    session.hits += perfect ? 2 : 1
    session.misses = 0
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
    const completedCircles = Math.floor(session.angle / 360)
    if (!session.locked && completedCircles > session.completedCircles) {
      session.misses += completedCircles - session.completedCircles
      session.completedCircles = completedCircles
      session.feedback = session.misses >= 3 ? '连续空了三圈，鱼跑掉了…' : `空了一圈，还剩 ${3 - session.misses} 圈机会`
      paint()
      if (session.misses >= 3) return finish(false)
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
  ui.content.appendChild(el('div', 'dp-empty', ui.view.activity.label + ' · 钓到的鱼会放进鱼篓'))
}
