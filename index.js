/**
 * dsh-pig — a pig that lives in your DeepSeek Harness. 🐖
 *
 * The plugin registers no model-facing tool and injects no context, so the
 * model never learns the pig exists and the pig costs zero tokens per request.
 * Every listener body is wrapped so a pig bug can never veto or delay real work.
 *
 * Two ways the human interacts, both ending in the same core calls:
 *   - the floating pig's six icons → POST /dsh-pig/act
 *   - typing `/pig feed`           → the slash command
 * The GUI is the primary path; the command is the fallback.
 *
 * @module dsh-pig
 */

import { readFileSync } from 'node:fs'

import {
  ACTIONS,
  ACTION_ORDER,
  JOBS,
  MAX,
  REVIVE_ITEM,
  SCHOOL_STAGES,
  SHOP,
  SUBJECTS,
  TRAITS,
  TRAIT_ORDER,
  TRIPS,
  actionCooldownSeconds,
  activitySecondsLeft,
  awayBlockedReason,
  careView,
  courseView,
  currentIllness,
  dressView,
  formatWeight,
  healthPercent,
  inventoryView,
  ageDays,
  daysToNextStage,
  hasSoul,
  LIFE_STAGES,
  levelProgress,
  lifeStageFor,
  mood,
  skillBonusFrom,
  skillLevels,
  studyView,
  traitView,
} from './core.js'
import { jobByKey, jobRequirement, rarityByKey, skillByKey, SKILLS, stageSubjectKeys, traitBonus } from './data.js'
import {
  renderAbout,
  renderAction,
  renderBuy,
  renderHatch,
  renderNoPig,
  renderStatus,
  renderStudyReport,
  renderTooSoon,
  renderTripReport,
  renderUse,
  renderWeigh,
  renderWorkRefusal,
  renderWorkReport,
} from './render.js'
import { createStore } from './store.js'

export const name = 'dsh-piggy'

/**
 * No required services. The pig rides on emit-mode events, and it reaches the
 * optional web seam through the safe `ctx.get()` accessor rather than a
 * declared injection — reading an undeclared service as a property throws in
 * cordis and would take the whole plugin down.
 */
export const inject = []

const STATE_ROUTE = '/dsh-pig/state'
const ACT_ROUTE = '/dsh-pig/act'
const ART_ROUTE = '/dsh-pig/art'
const BODY_LIMIT_BYTES = 2048

const contained = fn => (...args) => {
  try { fn(...args) } catch { /* the pig absorbs its own mishaps */ }
}

function sendJson(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extra })
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (text.length > BODY_LIMIT_BYTES) return null
  }
  if (text.trim() === '') return {}
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

/**
 * Every operation the panel can invoke. One table means the HTTP route and the
 * slash command cannot drift apart.
 */
const OPERATIONS = {
  hatch: store => ({ ok: true, hatched: store.hatch() }),
  adopt: store => ({ ok: store.adopt(), adopted: true }),
  reset: store => ({ ok: store.reset(), reset: true }),
  dev: (store, body) => ({ ok: store.dev(body.patch ?? {}), dev: true }),
  ageFromNow: store => ({ ok: store.ageFromNow(), ageFromNow: true }),
  timeScale: (store, body) => ({ ok: store.setTimeScale(body.scale), timeScale: true }),
  // The three care actions spend an item; `item` says which one.
  feed: (store, body) => store.act('feed', str(body.item)),
  bathe: (store, body) => store.act('bathe', str(body.item)),
  play: (store, body) => store.act('play', str(body.item)),
  pet: store => store.act('pet'),
  work: (store, body) => store.startWork(str(body.job)),
  study: (store, body) => store.startStudy(str(body.subject), str(body.stage)),
  trip: (store, body) => store.startTrip(str(body.trip)),
  calloff: store => store.callOffActivity(),
  buy: (store, body) => store.buy(str(body.item)),
  use: (store, body) => store.useItem(str(body.item)),
  // Souvenirs are the only thing the pig can sell back.
  sell: (store, body) => store.sellSouvenir(str(body.souvenir)),
  // 家当: put a dress item on / take it off.
  wear: (store, body) => store.wear(str(body.item), body.on !== false),
}

const str = value => (typeof value === 'string' ? value : '')

export function apply(ctx, config = {}) {
  const commandName = typeof config.command === 'string' && /^[a-z][a-z0-9-]{0,23}$/.test(config.command)
    ? config.command
    : 'pig'
  const store = createStore(typeof config.statePath === 'string' && config.statePath.trim() !== ''
    ? config.statePath
    : undefined)

  ctx.on('agent/inbox/claimed', contained(() => store.feed('message')))
  ctx.on('agent/turn-stopping', contained(() => store.feed('turn')))
  ctx.on('agent/error', contained(() => store.feed('agentError')))
  ctx.on('tools/result', contained((exec, result) => {
    store.feed(result?.isError === true ? 'toolError' : 'tool')
  }))

  // ---- the routes the floating pig drives ----
  //
  // `ctx.inject` waits for the service instead of sampling it. The previous
  // version read `ctx.get('webServer')` at apply time and bailed out when it was
  // undefined — which is exactly what happened during profile activation, so
  // the routes were never registered and the panel polled a 404 forever. A
  // silent optionality guard is not the same thing as a tolerant one: this one
  // still degrades on a host with no web seam, but only *after* the service has
  // actually been waited for.
  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.webServer
    if (webServer === undefined) return () => {}
    const disposers = []
    try {
      disposers.push(webServer.register({
        kind: 'exact',
        path: STATE_ROUTE,
        handler: async (req, res) => {
          if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
          try {
            sendJson(res, 200, snapshot(store), { 'cache-control': 'no-store' })
          } catch (error) {
            sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }))
      // The hand-drawn sprites for the piglet and the elder pig. Serving them
      // from the package keeps the art as real .svg files in the repository
      // rather than a blob embedded in the client bundle.
      disposers.push(webServer.register({
        kind: 'prefix',
        path: ART_ROUTE,
        handler: (req, res) => {
          if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
          const raw = String(req.url ?? '').split('?')[0]
          const name = raw.startsWith(ART_ROUTE + '/') ? raw.slice(ART_ROUTE.length + 1) : ''
          // Only the files this package ships: a fixed, boring name pattern, so
          // nothing from the request can ever walk out of ./assets.
          if (!/^[a-z][a-z0-9-]{0,31}\.svg$/.test(name)) return sendJson(res, 404, { error: 'not found' })
          try {
            const svg = readFileSync(new URL('./assets/' + name, import.meta.url))
            res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-cache' })
            res.end(svg)
          } catch {
            sendJson(res, 404, { error: 'not found' })
          }
        },
      }))

      disposers.push(webServer.register({
        kind: 'exact',
        path: ACT_ROUTE,
        handler: async (req, res) => {
          if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
          const body = await readJsonBody(req)
          if (body === null) return sendJson(res, 413, { error: 'body too large or not JSON' })
          const operation = typeof body.action === 'string' ? body.action : ''
          const run = Object.hasOwn(OPERATIONS, operation) ? OPERATIONS[operation] : null
          if (run === null) {
            return sendJson(res, 400, { error: `unknown action "${operation}"`, allowed: Object.keys(OPERATIONS) })
          }
          const result = run(store, body)
          const snap = snapshot(store)
          // The operation's verdict must win over the snapshot's always-true
          // `ok`: spreading the snapshot last silently swallowed every refusal.
          sendJson(res, 200, {
            ...snap,
            ok: result.ok !== false,
            reason: result.reason,
            wait: result.wait,
            price: result.price,
            missing: result.missing,
            sold: result.sold,
            need: result.need,
            have: result.have,
          }, { 'cache-control': 'no-store' })
        },
      }))
    } catch {
      // A route already taken: the pig stays command-only rather than breaking
      // activation, but this is a real failure and should be visible.
      console.warn('[dsh-pig] 路由注册失败，猪只能用命令访问')
    }
    return () => { for (const dispose of disposers) { try { dispose() } catch { /* best effort */ } } }
  })

  ctx.effect(() => () => store.dispose())

  ctx.inject(['commands'], (commandCtx) => {
    commandCtx.commands.register({
      name: commandName,
      description: 'your pig 🐖: status · study · work · shop · travel · bag',
      input: { hint: '[hatch|feed|bathe|play|pet|study <科目>|work <job>|trip <目的地>|shop|buy|use|weigh|about]' },
      handler: invocation => {
        try {
          return dispatch(store, commandName, String(invocation.rawInput ?? ''))
        } catch (error) {
          return { kind: 'error', text: `🐖 猪摔了一跤：${error?.message ?? error}` }
        }
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Snapshot — the single shape both routes and the panel read
// ---------------------------------------------------------------------------

/** The stage the panel shows before there is a pig: the cardboard box. */
function boxStageView() {
  const box = LIFE_STAGES.find(stage => stage.key === 'box') ?? LIFE_STAGES[0]
  return { key: box.key, label: box.label, emoji: box.emoji, size: box.size, line: box.line }
}

/** "今天刚出生" / "3 天大" / "刚拆开纸盒" — the pig's age in words. */
function formatAge(days, state, nowMs) {
  if (state.hatched !== true) return '还没拆开'
  // A tombstone is not "newborn today". Once the pig is gone its clock stops,
  // and what matters is how long it had — not how long ago it hatched.
  if (state.dead === true) {
    const lived = Math.max(0, (state.diedAt ?? nowMs) - state.bornAt)
    return `活了 ${formatSpan(lived)}`
  }
  if (days < 1) return '今天刚出生'
  return `${Math.floor(days)} 天大`
}

/** "18 小时" / "3 天" / "2 小时" — a duration in the largest sensible unit. */
function formatSpan(ms) {
  const hours = ms / 3_600_000
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60000))} 分钟`
  if (hours < 48) return `${Math.round(hours)} 小时`
  return `${Math.round(hours / 24)} 天`
}

/** 0-100 through the current activity, for the scene's progress line. */
function activityProgress(activity, nowMs) {
  const span = activity.endsAt - activity.startedAt
  if (!Number.isFinite(span) || span <= 0) return 0
  return Math.max(0, Math.min(100, Math.round(((nowMs - activity.startedAt) / span) * 100)))
}

export function snapshot(store, options = {}) {
  const drain = options.drain !== false
  const state = store.freshen()
  const nowMs = Date.now()

  if (state === null) {
    return {
      ok: true, hatched: false, dead: false, pig: null,
      actions: actionsFor(null, nowMs),
      jobs: jobsFor(null),
      subjects: subjectsFor(null),
      skills: skillsFor(null),
      stages: SCHOOL_STAGES.map(stage => ({ ...stage })),
      trips: tripsFor(null),
      shop: shopFor(null),
      dress: [],
      inventory: inventoryView({ inventory: {} }),
      activity: null, canGoOut: false, awayBlocked: 'absent',
      // The box has a size of its own; the client must not hard-code it.
      boxStage: boxStageView(),
      pending: [],
      reviveItem: REVIVE_ITEM.key, maxHealth: MAX.health,
    }
  }

  const life = lifeStageFor(state, nowMs)
  const current = mood(state, nowMs)
  const illness = currentIllness(state)
  const activity = state.activity
  const pending = Array.isArray(state.pending) ? state.pending.slice() : []
  if (drain && pending.length > 0) store.drainPending()

  return {
    ok: true,
    // The REAL flag, not "a save exists". A box produced by reset/adopt has a
    // save but is not hatched, and conflating the two made the box un-pokeable.
    hatched: state.hatched === true,
    dead: state.dead === true,
    boxStage: boxStageView(),
    timeScale: Number.isFinite(state.timeScale) ? state.timeScale : 1,
    pig: {
      name: state.name,
      // Age is the progression now, not a level.
      stage: { key: life.key, label: life.label, emoji: life.emoji, size: life.size, line: life.line, art: life.art ?? null, faded: life.faded === true },
      ageDays: Number(ageDays(state, nowMs).toFixed(2)),
      ageLabel: formatAge(ageDays(state, nowMs), state, nowMs),
      // Shown as a 🔧 beside the age so a forced age is never mistaken for real growth.
      ageForced: state.ageForced === true,
      daysToNextStage: daysToNextStage(state, nowMs) === null ? null : Number(daysToNextStage(state, nowMs).toFixed(2)),
      soul: hasSoul(state, nowMs),
      mood: current.key,
      moodEmoji: current.emoji,
      moodLabel: current.label,
      satiety: Math.round(state.satiety),
      happiness: Math.round(state.happiness),
      cleanliness: Math.round(state.cleanliness),
      health: state.health,
      healthPercent: healthPercent(state),
      weight: formatWeight(state.weightG),
      xp: state.xp,
      levelInfo: levelProgress(state.xp),
      coins: state.coins,
      traits: traitView(state),
      courses: courseView(state),
      souvenirs: souvenirsFor(state),
      stageLine: life.line,
      illness: illness === null ? null : { name: illness.name, cure: illness.cure, stage: illness.stage, chain: illness.chain },
      memories: state.memories.slice(-3),
    },
    actions: actionsFor(state, nowMs),
    jobs: jobsFor(state),
    subjects: subjectsFor(state),
    skills: skillsFor(state),
    stages: studyView(state),
    trips: tripsFor(state),
    shop: shopFor(state),
    dress: dressView(state),
    inventory: inventoryView(state),
    care: careView(state),
    activity: activity === null ? null : {
      kind: activity.kind,
      key: activity.key,
      label: activity.label,
      emoji: activity.emoji,
      cost: activity.cost ?? 0,
      secondsLeft: activitySecondsLeft(state, nowMs),
      // How far along, so the panel can draw the pig actually getting on with it.
      progress: activityProgress(activity, nowMs),
    },
    canGoOut: awayBlockedReason(state) === null,
    awayBlocked: awayBlockedReason(state),
    pending,
    reviveItem: REVIVE_ITEM.key,
    maxHealth: MAX.health,
  }
}

function actionsFor(state, nowMs) {
  const out = {}
  for (const key of ACTION_ORDER) {
    const spec = ACTIONS[key]
    const wait = state === null ? 0 : actionCooldownSeconds(state, key, nowMs)
    const away = state !== null && !state.dead && state.activity !== null && key !== 'pet'
    out[key] = {
      label: spec.label,
      emoji: spec.emoji,
      ready: wait === 0 && !away && !(state?.dead === true),
      waitSeconds: wait,
      blocked: away ? 'away' : null,
    }
  }
  return out
}

function jobsFor(state) {
  const open = state !== null && awayBlockedReason(state) === null
  const traits = state?.traits ?? {}
  const levels = state === null ? {} : skillLevels(state)
  // 体力 only discounts the physical jobs; 才艺 only raises the performing ones.
  const stamina = job => (job.heavy === true ? 1 - skillBonusFrom(levels, 'stamina') : 1)
  const talent = job => (job.trait === 'charm' ? 1 + skillBonusFrom(levels, 'talent') : 1)
  return JOBS.map(job => {
    // Jobs lean on a trait and lessons raise it, so the panel has to show what
    // the pig's schooling is actually buying it.
    const points = state === null ? 0 : (traits[job.trait] ?? 0)
    const bonus = traitBonus(job.trait, points)
    // A locked job must say exactly what it wants, or the gate reads as a bug.
    // Interest skills already paid into the threshold, so the numbers shown are
    // the ones the pig actually has to clear.
    const gate = jobRequirement(job, traits, levels)
    const missing = gate === null ? [] : gate.missing.slice()
    const relief = gate === null ? 0 : gate.relief
    const reliefSkill = job.relief === undefined ? null : skillByKey(job.relief.skill)
    const speed = bonus.minutes * stamina(job)
    const pay = bonus.pay * talent(job)
    return {
      key: job.key, label: job.label, emoji: job.emoji,
      trait: job.trait,
      traitLabel: TRAITS[job.trait].label,
      traitEmoji: TRAITS[job.trait].emoji,
      traitPoints: points,
      minutes: Math.max(1, Math.round(job.minutes * speed)),
      baseMinutes: job.minutes,
      coins: Math.round(job.coins * pay),
      baseCoins: job.coins,
      payPercent: Math.round((pay - 1) * 100),
      speedPercent: Math.round((1 - speed) * 100),
      satiety: job.satiety,
      heavy: job.heavy === true,
      available: open,
      // `available` is "the pig is home"; `qualified` is "the pig has the traits".
      qualified: gate === null ? true : gate.ok,
      missing,
      lockText: missing.map(entry => `${entry.emoji} ${entry.label} ${entry.need}（你现在 ${entry.have}）`).join('、'),
      reliefNote: relief > 0 && reliefSkill !== null
        ? `${reliefSkill.emoji} ${reliefSkill.label} 抵扣了 ${relief} 点门槛`
        : '',
    }
  })
}

/**
 * The four 兴趣技能, with the level and the bonus they currently give.
 *
 * The client shows all four even at level 0: a skill the player cannot see is a
 * skill they will never train.
 */
function skillsFor(state) {
  const levels = state === null ? {} : skillLevels(state)
  return SKILLS.map(skill => {
    const level = levels[skill.key] ?? 0
    const value = Math.min(skill.per * level, skill.cap)
    return {
      key: skill.key, label: skill.label, emoji: skill.emoji,
      from: skill.from, source: skill.source,
      level,
      percent: Math.round(value * 100),
      perLevelPercent: Math.round(skill.per * 100),
      capPercent: Math.round(skill.cap * 100),
      blurb: skill.blurb,
      active: level > 0,
    }
  })
}

function subjectsFor(state) {
  const open = state !== null && awayBlockedReason(state) === null
  const levels = state === null ? {} : courseView(state)
  const byStage = state?.coursesByStage ?? {}
  return SUBJECTS.map(subject => {
    // Seven stages share subject names, so a subject carries which stages teach
    // it and how many times it has been taken at each — the panel filters by
    // the selected stage instead of guessing.
    const perStage = {}
    const stages = []
    for (const stage of SCHOOL_STAGES) {
      perStage[stage.key] = byStage?.[stage.key]?.[subject.key] ?? 0
      if (stageSubjectKeys(stage).includes(subject.key)) stages.push(stage.key)
    }
    return {
      key: subject.key, label: subject.label, emoji: subject.emoji,
      trait: subject.trait, traitLabel: TRAITS[subject.trait].label,
      level: levels[subject.key] ?? 0,
      levels: perStage,
      stages,
      available: open,
    }
  })
}

function tripsFor(state) {
  const open = state !== null && awayBlockedReason(state) === null
  return TRIPS.map(trip => {
    // The rarest souvenir a destination can give, so the far trips advertise
    // what they are actually worth.
    const tiers = trip.souvenirs.map(entry => rarityByKey(entry.rarity))
    const best = tiers.reduce((a, b) => (b.price > a.price ? b : a), tiers[0])
    return {
      key: trip.key, label: trip.label, emoji: trip.emoji,
      minutes: trip.minutes, cost: trip.cost, happiness: trip.happiness,
      souvenirCount: trip.souvenirs.length,
      bestRarity: best.label,
      bestRarityEmoji: best.emoji,
      available: open,
      affordable: state === null ? false : state.coins >= trip.cost,
    }
  })
}

/** The collection, with each souvenir's rarity spelled out and priced. */
function souvenirsFor(state) {
  const list = Array.isArray(state?.souvenirs) ? state.souvenirs : []
  return list.slice(-40).map(entry => {
    const tier = rarityByKey(entry.rarity)
    return {
      key: entry.key,
      emoji: typeof entry.emoji === 'string' && entry.emoji !== '' ? entry.emoji : '🎁',
      label: typeof entry.label === 'string' && entry.label !== '' ? entry.label : entry.key,
      rarity: tier.key, rarityLabel: tier.label, rarityEmoji: tier.emoji, price: tier.price,
      story: typeof entry.story === 'string' ? entry.story : '',
      from: typeof entry.from === 'string' ? entry.from : null,
      fromLabel: typeof entry.fromLabel === 'string' ? entry.fromLabel : '',
    }
  })
}

function shopFor(state) {
  const dress = new Map((state === null ? [] : dressView(state)).map(item => [item.key, item]))
  return SHOP.map(item => {
    // 家当 shows "already yours" or the level it waits for; the consumables
    // keep their price-and-count treatment.
    const owned = dress.get(item.key)?.owned === true
    const unlocked = item.kind === 'dress' ? dress.get(item.key)?.unlocked !== false : true
    return {
      key: item.key, label: item.label, emoji: item.emoji,
      price: item.price, kind: item.kind, tier: item.tier ?? null,
      level: item.level ?? null,
      owned,
      worn: dress.get(item.key)?.worn === true,
      unlocked,
      blurb: item.blurb ?? '',
      affordable: state === null ? false : state.coins >= item.price,
      needed: state?.illness != null && item.kind === 'medicine' && item.tier === state.illness.stage,
    }
  })
}

// ---------------------------------------------------------------------------
// Slash command (the fallback path)
// ---------------------------------------------------------------------------

export function performAction(store, action) {
  const state = store.freshen()
  if (state === null) return { kind: 'error', text: renderNoPig('pig') }
  const result = store.act(action)
  if (!result.ok) {
    if (result.reason === 'cooldown') return { kind: 'success', text: renderTooSoon(state, Date.now(), action) }
    if (result.reason === 'away') return { kind: 'success', text: renderWorkRefusal(state, `${state.name} 正在外面，回来再说。`) }
    if (result.reason === 'dead') return { kind: 'error', text: `${state.name} 已经走了…用 ${REVIVE_ITEM.label} 可以救回来。` }
    if (result.reason === 'absent') return { kind: 'error', text: renderNoPig('pig') }
    return { kind: 'error', text: `🐖 ${ACTIONS[action]?.label ?? action} 没做成。` }
  }
  return { kind: 'success', text: renderAction(store.freshen(), Date.now(), action, result.crossed) }
}

export function dispatch(store, commandName, rawInput) {
  const trimmed = rawInput.trim()
  const [sub, ...rest] = trimmed === '' ? [''] : trimmed.split(/\s+/)
  const argument = rest.join(' ')
  const state = store.freshen()
  const nowMs = Date.now()
  const verb = sub.toLowerCase()

  switch (verb) {
    case '':
    case 'status': {
      if (state === null) return { kind: 'success', text: renderNoPig(commandName) }
      return { kind: 'success', text: renderStatus(state, nowMs) }
    }
    case 'hatch': {
      if (store.hatch()) return { kind: 'success', text: renderHatch(store.state, nowMs) }
      const existing = store.freshen()
      return { kind: 'success', text: `这里已经住着 ${existing.name} 了 🐖\n\n${renderStatus(existing, nowMs)}` }
    }
    case 'feed':
    case 'bathe':
    case 'play':
    case 'pet':
    case 'mo':
      return performAction(store, verb === 'mo' ? 'pet' : verb)

    case 'work': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const key = argument.trim() === '' ? 'odd' : argument.trim()
      const job = JOBS.find(j => j.key === key || j.label === key)
      if (job === undefined) return { kind: 'error', text: `没有「${key}」这份工作。/${commandName} work 看有哪些。` }
      const result = store.startWork(job.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderWorkReport(store.freshen(), Date.now(), job) }
    }

    case 'study': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const [subjectArg = '', stageArg = SCHOOL_STAGES[0].key] = argument.trim().split(/\s+/)
      const subject = SUBJECTS.find(s => s.key === subjectArg || s.label === subjectArg)
      const stage = SCHOOL_STAGES.find(s => s.key === stageArg || s.label === stageArg)
      if (subject === undefined || stage === undefined) {
        return { kind: 'error', text: `用法：/${commandName} study <科目> <学段>\n学段：${SCHOOL_STAGES.map(s => s.label).join(' · ')}\n科目：${SUBJECTS.map(s => s.label).join(' · ')}` }
      }
      const result = store.startStudy(subject.key, stage.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderStudyReport(store.freshen(), Date.now(), subject, stage) }
    }

    case 'trip':
    case 'travel': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const key = argument.trim() === '' ? 'suburb' : argument.trim()
      const trip = TRIPS.find(t => t.key === key || t.label === key)
      if (trip === undefined) return { kind: 'error', text: `没有「${key}」这个目的地。/${commandName} trip 看有哪些。` }
      const result = store.startTrip(trip.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderTripReport(store.freshen(), Date.now(), trip) }
    }

    case 'calloff': {
      const result = store.callOffActivity()
      if (!result.ok) return { kind: 'success', text: `${state?.name ?? '猪'} 没在外面。` }
      return {
        kind: 'success',
        text: result.refunded > 0
          ? `${state.name} 提前回来了，退回 ${result.refunded} 金币。`
          : `${state.name} 提前回来了，这趟白跑。`,
      }
    }

    case 'shop': {
      const lines = SHOP.map(item => `  ${item.emoji} ${item.label}  ${item.price} 金币`).join('\n')
      return { kind: 'success', text: `🛒 商店（你有 ${state?.coins ?? 0} 金币）\n${lines}\n\n买：/${commandName} buy <物品>` }
    }
    case 'buy': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const item = SHOP.find(i => i.key === argument.trim() || i.label === argument.trim())
      if (item === undefined) return { kind: 'error', text: `没有「${argument}」这样东西。/${commandName} shop 看货架。` }
      return { kind: 'success', text: renderBuy(store.freshen(), store.buy(item.key), item) }
    }
    case 'use': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const item = SHOP.find(i => i.key === argument.trim() || i.label === argument.trim())
      if (item === undefined) return { kind: 'error', text: `没有「${argument}」这样东西。` }
      return { kind: 'success', text: renderUse(store.freshen(), store.useItem(item.key), item) }
    }
    case 'weigh': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      return { kind: 'success', text: renderWeigh(state, nowMs) }
    }
    case 'name': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const cleaned = store.rename(argument)
      if (cleaned === null) return { kind: 'error', text: `用法：/${commandName} name <名字>（16 字以内）` }
      return { kind: 'success', text: `从今天起，它叫「${cleaned}」🐖` }
    }
    case 'about':
    case 'help':
      return { kind: 'success', text: renderAbout(commandName) }
    default:
      return {
        kind: 'error',
        text: `不认识「${sub}」。可用：/${commandName} · hatch · feed · bathe · play · pet · study · work · trip · shop · buy · use · weigh · name · about`,
      }
  }
}

function refusalText(result, state) {
  switch (result.reason) {
    case 'dead': return `${state.name} 已经走了…`
    case 'away': return `${state.name} 已经在外面了。`
    case 'sick': return `${state.name} 病着，不能出门 —— 先治好它。`
    case 'hungry': return `${state.name} 太饿了，先喂点东西。`
    case 'poor': return `钱不够，需要 ${result.price} 金币，你只有 ${state.coins}。`
    case 'underqualified': {
      const want = (result.missing ?? []).map(entry => `${entry.emoji} ${entry.label} ${entry.need}（现在 ${entry.have}）`).join('、')
      return `这份工作还轮不到它 —— 需要 ${want}。去「学习」上课就能涨。`
    }
    case 'wrong-stage':
      return `${result.stage}没有「${result.subject}」这门课 —— 换个学段，或者换一门课。`
    case 'locked': {
      const need = result.need
      return need === null || need === undefined
        ? '这一级还没解锁 —— 先把上一级的课念完。'
        : `要先念完${need.label}（${need.done}/${need.need}）。`
    }
    case 'unknown': return '没有这个选项。'
    default: return '现在没法出门。'
  }
}

export { jobByKey, MAX, SHOP, JOBS, SUBJECTS, SCHOOL_STAGES, TRIPS, TRAITS, TRAIT_ORDER }
