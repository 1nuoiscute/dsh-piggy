// @ts-check
/**
 * 面板快照：把状态序列化成界面读的那一份形状。
 *
 * 只读取状态与数值表，不算业务规则（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/snapshot
 */

import { readFileSync } from 'node:fs'

import { ACTIONS, ACTION_ORDER, doctorFee, JOBS, LIFE_STAGES, MAX, REVIVE_ITEM, SCHOOL_STAGES, SHOP, SUBJECTS, TRAITS, TRIPS, actionCooldownSeconds, activitySecondsLeft, adopt, ageDays, awayBlockedReason, careView, courseView, currentIllness, daysToNextStage, dressView, formatWeight, hasSoul, healthPercent, interestView, inventoryView, levelProgress, lifeStageFor, mood, reset, studyView, traitView } from './core.js'
import { INTERESTS, SEXES, jobRequirement, rarityByKey, stageSubjectKeys, traitBonus } from './data.js'

/** The stage the panel shows before there is a pig: the cardboard box. */
/**
 * The package version, surfaced in the debug tab.
 *
 * DSH composes client bundles when it starts, so a stale page and a stale
 * process look identical; without a version on screen "did my change land?"
 * can only be answered by guessing. This makes it readable in one glance.
 */
function readPackageVersion() {
  try {
    const parsed = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    return typeof parsed.version === 'string' ? parsed.version : 'unknown'
  } catch (error) {
    console.warn(`[dsh-pig] package version unavailable: ${error instanceof Error ? error.message : String(error)}`)
    return 'unknown'
  }
}

const PACKAGE_VERSION = readPackageVersion()

function boxStageView() {
  const box = LIFE_STAGES.find(stage => stage.key === 'box') ?? LIFE_STAGES[0]
  return { key: box.key, label: box.label, emoji: box.emoji, size: box.size, line: box.line }
}

/** 性别：男孩 ♂ / 女孩 ♀；还没拆开的纸盒没有。 */
function sexView(state) {
  const sex = SEXES[state.sex]
  return sex === undefined ? null : { key: sex.key, label: sex.label, symbol: sex.symbol }
}

/** "今天刚到家" / "养了 3 天" / "还没拆开" — how long the pig has been here, in words. */
function formatAge(days, state, nowMs) {
  if (state.hatched !== true) return '还没拆开'
  // A tombstone is not "newborn today". Once the pig is gone its clock stops,
  // and what matters is how long it had — not how long ago it hatched.
  if (state.dead === true) {
    const lived = Math.max(0, (state.diedAt ?? nowMs) - state.bornAt)
    return `活了 ${formatSpan(lived)}`
  }
  if (days < 1) return '今天刚到家'
  return `养了 ${Math.floor(days)} 天`
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
      interests: interestsFor(null),
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
      version: PACKAGE_VERSION,
    }
  }

  const life = lifeStageFor(state, nowMs)
  const current = mood(state, nowMs)
  const illness = currentIllness(state)
  const activity = state.activity
  const pending = Array.isArray(state.pending) ? state.pending.slice() : []
  if (drain && pending.length > 0) store.drainPending()

  const daysLeft = daysToNextStage(state, nowMs)

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
      sex: sexView(state),
      // The body follows the level (B2); age is only how long it has been here.
      stage: { key: life.key, label: life.label, emoji: life.emoji, size: life.size, line: life.line, art: life.art ?? null, faded: life.faded === true },
      ageDays: Number(ageDays(state, nowMs).toFixed(2)),
      ageLabel: formatAge(ageDays(state, nowMs), state, nowMs),
      // Marked beside the age so a forced age is never mistaken for real growth.
      ageForced: state.ageForced === true,
      daysToNextStage: daysLeft === null ? null : Number(daysLeft.toFixed(2)),
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
      illness: illness === null ? null : {
        name: illness.name, chain: illness.chain, stage: illness.stage,
        cure: illness.cure, cureKey: illness.cureKey, cureEmoji: illness.cureEmoji,
        doctorFee: doctorFee(state),
      },
      memories: state.memories.slice(-3),
    },
    actions: actionsFor(state, nowMs),
    jobs: jobsFor(state),
    subjects: subjectsFor(state),
    interests: interestsFor(state),
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
    version: PACKAGE_VERSION,
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
  return JOBS.map(job => {
    // Jobs lean on a trait and lessons raise it, so the panel has to show what
    // the pig's schooling is actually buying it.
    const points = state === null ? 0 : (traits[job.trait] ?? 0)
    const bonus = traitBonus(job.trait, points)
    // A locked job must say exactly what it wants, or the gate reads as a bug.
    const gate = jobRequirement(job, traits)
    const missing = gate === null ? [] : gate.missing.slice()
    return {
      key: job.key, label: job.label, emoji: job.emoji,
      trait: job.trait,
      traitLabel: TRAITS[job.trait].label,
      traitEmoji: TRAITS[job.trait].emoji,
      traitPoints: points,
      minutes: Math.max(1, Math.round(job.minutes * bonus.minutes)),
      baseMinutes: job.minutes,
      coins: Math.round(job.coins * bonus.pay),
      baseCoins: job.coins,
      payPercent: Math.round((bonus.pay - 1) * 100),
      speedPercent: Math.round((1 - bonus.minutes) * 100),
      satiety: job.satiety,
      available: open,
      // `available` is "the pig is home"; `qualified` is "the pig has the traits".
      qualified: gate === null ? true : gate.ok,
      missing,
      // Short on purpose: the panel writes only the missing trait and its value.
      lockText: missing.map(entry => `${entry.emoji} ${entry.label} ${entry.need}`).join('、'),
    }
  })
}

/**
 * 兴趣课：学习页里的一栏，随时能学，学完直接加 智力/魅力/武力。
 * 面板把四门都列出来（没学过的显示 0 次），不然玩家不知道有这些选项。
 */
function interestsFor(state) {
  const open = state !== null && awayBlockedReason(state) === null
  const counts = state === null ? {} : interestView(state)
  return INTERESTS.map(entry => ({
    key: entry.key, label: entry.label, emoji: entry.emoji,
    trait: entry.trait, traitLabel: TRAITS[entry.trait].label, traitEmoji: TRAITS[entry.trait].emoji,
    minutes: entry.minutes, cost: entry.cost, gain: entry.gain, blurb: entry.blurb,
    times: counts[entry.key] ?? 0,
    available: open,
    affordable: state === null ? false : state.coins >= entry.cost,
  }))
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
  return list.map(entry => {
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
  const neededCure = state === null ? null : (currentIllness(state)?.cureKey ?? null)
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
      // The one cure the pig needs right now (B3: a medicine per illness stage).
      needed: neededCure !== null && item.key === neededCure,
      cureAll: item.cureAll === true,
    }
  })
}

// ---------------------------------------------------------------------------
// Slash command (the fallback path)
// ---------------------------------------------------------------------------
