// @ts-check
/**
 * 工作与门槛 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 * @module dsh-pig/data/jobs
 */

import { MINUTES } from './minutes.js'
import { TRAITS, TRAIT_ORDER } from './traits.js'

/**
 * Ten jobs, each behind a three-axis threshold.
 *
 * Before 0.17.0 there were three jobs and **no gate at all** — a pig with 智力 0
 * and a pig with 智力 40 could do exactly the same work, which made the whole
 * 学习 page pointless. `requires` is the fix: `intel` / `charm` / `strong` are
 * the minimum points the pig must already have. `trait` stays the *primary*
 * trait — the one that scales pay and shortens the shift — so a job can need
 * two axes while still paying off one.
 *
 * The ladder is ordered: odd jobs are ungated, then the physical line, then the
 * charm line, then the desk line that only schooling can open.
 */
export const JOBS = Object.freeze([
  // --- anyone can start here ----------------------------------------------
  Object.freeze({ key: 'odd', label: '打零工', emoji: '🧹', trait: 'charm', minutes: MINUTES.quarter, coins: 30, xp: 40, satiety: -6, cleanliness: -4, requires: Object.freeze({ intel: 0, charm: 0, strong: 0 }) }),
  // --- body line: 武力 -----------------------------------------------------
  Object.freeze({ key: 'dish', label: '端盘子', emoji: '🍽', trait: 'charm', minutes: MINUTES.half, coins: 70, xp: 90, satiety: -10, cleanliness: -7, requires: Object.freeze({ intel: 0, charm: 2, strong: 2 }) }),
  Object.freeze({ key: 'courier', label: '送快递', emoji: '🚚', trait: 'strong', minutes: MINUTES.hour, coins: 150, xp: 190, satiety: -15, cleanliness: -12, requires: Object.freeze({ intel: 0, charm: 0, strong: 4 }) }),
  Object.freeze({ key: 'site', label: '搬砖', emoji: '🧱', trait: 'strong', minutes: MINUTES.ninety, coins: 260, xp: 300, satiety: -20, cleanliness: -18, requires: Object.freeze({ intel: 0, charm: 0, strong: 8 }) }),
  Object.freeze({ key: 'foreman', label: '工地领班', emoji: '🏗', trait: 'strong', minutes: MINUTES.threeHours, coins: 700, xp: 800, satiety: -32, cleanliness: -24, requires: Object.freeze({ intel: 0, charm: 4, strong: 16 }) }),
  // --- charm line: 魅力 ----------------------------------------------------
  Object.freeze({ key: 'street', label: '街头卖艺', emoji: '🎤', trait: 'charm', minutes: MINUTES.hour, coins: 200, xp: 240, satiety: -12, cleanliness: -8, requires: Object.freeze({ intel: 0, charm: 8, strong: 0 }) }),
  // --- desk line: 智力（只有上学能开）-------------------------------------
  Object.freeze({ key: 'tutor', label: '家教', emoji: '📚', trait: 'intel', minutes: MINUTES.twoHours, coins: 480, xp: 560, satiety: -18, cleanliness: -10, requires: Object.freeze({ intel: 10, charm: 0, strong: 0 }) }),
  Object.freeze({ key: 'office', label: '上班', emoji: '💼', trait: 'intel', minutes: MINUTES.fourHours, coins: 900, xp: 900, satiety: -34, cleanliness: -26, requires: Object.freeze({ intel: 14, charm: 6, strong: 0 }) }),
  Object.freeze({ key: 'manager', label: '部门主管', emoji: '🏢', trait: 'intel', minutes: MINUTES.sixHours, coins: 2200, xp: 2100, satiety: -46, cleanliness: -34, requires: Object.freeze({ intel: 22, charm: 10, strong: 0 }) }),
  Object.freeze({ key: 'researcher', label: '研究员', emoji: '🔬', trait: 'intel', minutes: MINUTES.eightHours, coins: 4000, xp: 4200, satiety: -60, cleanliness: -40, requires: Object.freeze({ intel: 32, charm: 0, strong: 0 }) }),
])

/**
 * Compare a job's three-axis threshold against the pig's current traits.
 *
 * Returns every axis the pig is short on, not just the first: a locked job must
 * be able to say *why*, and "需要 🧠 智力 10、💪 武力 4" is the difference
 * between a gate and a shrug.
 *
 * @param {{requires?: {intel?: number, charm?: number, strong?: number}}|null} job
 * @param {Record<string, number>|null|undefined} traits
 * @returns {{ok: boolean, missing: ReadonlyArray<{key: string, label: string, emoji: string, need: number, have: number}>}|null}
 */
export function jobRequirement(job, traits) {
  if (job === null || job === undefined) return null
  const need = job.requires ?? {}
  const missing = []
  for (const key of TRAIT_ORDER) {
    const required = need[key] ?? 0
    const have = traits?.[key] ?? 0
    if (required > 0 && have < required) {
      missing.push({ key, label: TRAITS[key].label, emoji: TRAITS[key].emoji, need: required, have })
    }
  }
  return { ok: missing.length === 0, missing }
}

/** Whether the pig already meets every axis a job asks for. */
export const jobUnlocked = (job, traits) => jobRequirement(job, traits)?.ok === true

export const jobByKey = key => JOBS.find(job => job.key === key) ?? null
