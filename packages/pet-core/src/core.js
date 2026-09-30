// @ts-check
/**
 * dsh-pig · core — the pure pig model.
 *
 * No IO, no ctx, no clock of its own: every function takes the current time as
 * a parameter, so the whole game model is testable in isolation. Nothing here
 * schedules a timer — shifts, courses, trips, illness progression and decay are
 * all resolved lazily from timestamps, which is why the pig survives restarts
 * and why the tests never have to wait.
 *
 * Three ways the pig changes:
 *   - `feed()`  digests a *passive* harness event (a turn ended, a tool ran)
 *   - `act()`   applies a *deliberate* care action (feed it, bathe it, play)
 *   - `buy()` / `useItem()` / `start*()` drive the game loop
 *
 * Time away from the desk is one concept, not three: work, study and travel all
 * become a single `activity` record, so "is the pig home?" has exactly one
 * answer and `decay()` has exactly one place to settle it.
 *
 * @module dsh-pig/core
 */

import {
  AWAY_MULTIPLIER,
  CARE_KIND,
  DEFAULT_TOY,
  GRAVE,
  LIFE_STAGES,
  LIFESPAN_DAYS,
  SOUL,
  SOUL_AFTER_DAYS,
  ILLNESS_CHAINS,
  DAYS_PER_MONTH,
  DEFAULT_TIME_SCALE,
  LEVEL_TITLES,
  illnessStageMs,
  xpForLevel,
  traitBonus,
  SELF_HEAL_CHANCE,
  SICK_AWAY_MULTIPLIER,
  SICK_PAY_MULTIPLIER,
  JOBS,
  KIND_ORDER,
  MAX,
  REVIVE_ITEM,
  SCHOOL_STAGES,
  SHOP,
  SICK_RISK_MINUTES,
  SLEEPY_AFTER_MINUTES,
  SOUVENIR_RARITY,
  STAGE_HEALTH,
  SUBJECTS,
  THRESHOLDS,
  TRAITS,
  TRAIT_ORDER,
  TRIPS,
  illnessAt,
  interestByKey,
  INTERESTS,
  dressSlotByKey,
  itemByKey,
  jobByKey,
  jobRequirement,
  careItems,
  medicineForStage,
  nextIllness,
  rarityByKey,
  schoolStageByKey,
  stageProgress,
  stageSubjectKeys,
  stageUnlocked,
  subjectByKey,
  tripByKey,
} from './data.js'

export { ACTIONS, ACTION_ORDER, STATE_VERSION } from './core/constants.js'
export { drainPending } from './core/effects.js'
export { ageDays, ageMonths, daysToNextStage, hasSoul, isElderly, levelFor, levelProgress, levelTitle, lifeStageFor, nextLifeStage } from './core/clock.js'
export { hatch, hatchEgg, layEgg } from './core/egg.js'
export { adopt, ageFromNow, applyDevPatch, inherit, rename, reset, revive, setTimeScale } from './core/state.js'
export { migrate } from './core/migrate.js'
export { pickLine, replyToLine, say } from './core/lines.js'
export { currentIllness, decay } from './core/settlement.js'
export { activitySecondsLeft, awayBlockedReason, callOffActivity, callOffWork, canStartActivity, canWork, workSecondsLeft } from './core/activity.js'
export { act, actionCooldownSeconds, actionReady, canFeed, careOptions, careView, feed, feedCooldownSeconds } from './core/care.js'
export { buy, canAfford, dressView, grantAll, inventoryView, takeOff, useItem, wearItem } from './core/inventory.js'
export { courseView, startStudy, studyView } from './core/school.js'
export { interestView, startInterest } from './core/interests.js'
export { startWork } from './core/work.js'
export { sellSouvenir, startTrip } from './core/travel.js'
export { bar, formatWeight, healthPercent, mood, traitView } from './core/views.js'
export { JOBS, MAX, REVIVE_ITEM, SCHOOL_STAGES, SHOP, SUBJECTS, THRESHOLDS, TRAITS, TRAIT_ORDER, TRIPS } from './data.js'
export { GRAVE, LIFESPAN_DAYS, LIFE_STAGES, SOUL, SOUL_AFTER_DAYS } from './data.js'
export { DIET } from './core/constants.js'
