// @ts-check
/**
 * 时间、年龄、等级派生。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/clock
 */

import { DAYS_PER_MONTH, GRAVE, LEVEL_TITLES, LIFESPAN_DAYS, LIFE_STAGES, SOUL_AFTER_DAYS, xpForLevel } from '../data.js'
import { DAY_MS } from './constants.js'

/**
 * The pig's age in days.
 *
 * This is accumulated *pig time*, not wall clock: `decay()` adds elapsed real
 * time times the time scale. Storing it this way means changing the scale only
 * affects the future — the pig does not suddenly jump from a piglet to elderly
 * because you raised the multiplier.
 */
export function ageDays(state, nowMs) {
  if (state === null) return 0
  if (typeof state.ageMs === 'number' && Number.isFinite(state.ageMs)) {
    return Math.max(0, state.ageMs / DAY_MS)
  }
  // Saves from before pig time existed only have a birthday.
  if (typeof state.bornAt !== 'number') return 0
  return Math.max(0, (nowMs - state.bornAt) / DAY_MS)
}

/** The pig's age in whole months, for display. */
export const ageMonths = (state, nowMs) => ageDays(state, nowMs) / DAYS_PER_MONTH

/** Which stage the pig is at right now: a box, a pig of some age, or a grave. */
export function lifeStageFor(state, nowMs) {
  if (state === null) return LIFE_STAGES[0]
  if (state.dead === true) return GRAVE
  if (state.hatched !== true) return LIFE_STAGES[0]
  const days = ageDays(state, nowMs)
  let stage = LIFE_STAGES[1]
  for (const candidate of LIFE_STAGES) {
    if (candidate.box === true) continue
    if (days >= (candidate.from ?? 0)) stage = candidate
  }
  return stage
}

/** The next rung, or null once the pig is as grown as it gets. */
export function nextLifeStage(state, nowMs) {
  if (state === null || state.dead === true || state.hatched !== true) return null
  const days = ageDays(state, nowMs)
  return LIFE_STAGES.find(stage => stage.box !== true && (stage.from ?? 0) > days) ?? null
}

/** Days remaining until that next rung, or null at the end of the line. */
export function daysToNextStage(state, nowMs) {
  const next = nextLifeStage(state, nowMs)
  return next === null ? null : Math.max(0, (next.from ?? 0) - ageDays(state, nowMs))
}

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

/** The pig's level for a given XP total. Unbounded. */
export function levelFor(xp) {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0
  let level = 1
  while (level < 999 && value >= xpForLevel(level + 1)) level += 1
  return level
}

/** The title earned at this level. */
export function levelTitle(level) {
  let found = LEVEL_TITLES[0]
  for (const entry of LEVEL_TITLES) if (level >= entry.level) found = entry
  return found
}

/** How far into the current level, 0-1, plus the numbers behind it. */
export function levelProgress(xp) {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0
  const level = levelFor(value)
  const floor = xpForLevel(level)
  const ceiling = xpForLevel(level + 1)
  const span = Math.max(1, ceiling - floor)
  return {
    level,
    xp: value,
    floor,
    ceiling,
    toNext: Math.max(0, ceiling - value),
    percent: Math.max(0, Math.min(100, Math.round(((value - floor) / span) * 100))),
    title: levelTitle(level),
  }
}

/** Has the pig outlived its span? */
export const isElderly = (state, nowMs) => ageDays(state, nowMs) >= LIFESPAN_DAYS

/** Has the grave been left alone long enough for the soul to settle on it? */
export const hasSoul = (state, nowMs) =>
  state !== null && state.dead === true && (nowMs - (state.diedAt ?? nowMs)) / DAY_MS >= SOUL_AFTER_DAYS
