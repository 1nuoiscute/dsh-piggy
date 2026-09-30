// @ts-check
/**
 * 学段与科目。
 *
 * 纯函数领域逻辑：时间由 nowMs 传入，不读写文件、不碰 DOM（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/core/school
 */

import { SCHOOL_STAGES, SUBJECTS, schoolStageByKey, stageProgress, stageSubjectKeys, stageUnlocked, subjectByKey } from '../data.js'
import { begin } from './activity.js'
import { TOO_WEAK_HEALTH } from './constants.js'
import { remember } from './effects.js'

/** Per-stage lesson counts plus whether the next rung is open yet. */
export function studyView(state) {
  const byStage = state.coursesByStage ?? {}
  return SCHOOL_STAGES.map(stage => ({
    key: stage.key,
    label: stage.label,
    emoji: stage.emoji ?? '📚',
    minutes: stage.minutes,
    tuition: stage.tuition,
    gain: stage.gain,
    // The panel needs the course list per stage: seven stages share subjects.
    subjects: stageSubjectKeys(stage).slice(),
    lessons: state.lessonsByStage?.[stage.key] ?? 0,
    unlocked: stageUnlocked(stage, byStage),
    progress: stageProgress(stage, byStage),
  }))
}

/** Levels per subject, always including every subject (0 = never studied). */
export function courseView(state) {
  const out = {}
  for (const subject of SUBJECTS) out[subject.key] = state.courses?.[subject.key] ?? 0
  return out
}

export function startStudy(state, subjectKey, stageKey, nowMs) {
  const subject = subjectByKey(subjectKey)
  const stage = schoolStageByKey(stageKey)
  if (subject === null || stage === null) return { ok: false, reason: 'unknown' }
  if (state.dead) return { ok: false, reason: 'dead' }
  if (state.activity !== null) return { ok: false, reason: 'away' }
  if (state.health <= TOO_WEAK_HEALTH) return { ok: false, reason: 'weak' }
  // A subject only exists inside the stages that teach it: 幼儿园 has no 物理,
  // and the route must refuse that rather than quietly charging tuition.
  if (!stageSubjectKeys(stage).includes(subject.key)) {
    return { ok: false, reason: 'wrong-stage', subject: subject.label, stage: stage.label }
  }
  // The stage ladder: every course of the stage below must have been attended.
  if (!stageUnlocked(stage, state.coursesByStage)) {
    return { ok: false, reason: 'locked', need: stageProgress(stage, state.coursesByStage) }
  }
  if (state.coins < stage.tuition) return { ok: false, reason: 'poor', price: stage.tuition }
  if (state.satiety < 15) return { ok: false, reason: 'hungry' }

  state.coins -= stage.tuition
  const result = begin(state, {
    kind: 'study', key: subject.key, stage: stage.key,
    label: `${stage.label}${subject.label}`, emoji: subject.emoji,
    minutes: stage.minutes, cost: stage.tuition,
  }, nowMs)
  if (!result.ok) {
    state.coins += stage.tuition // refund if the pig turned out to be unavailable
    return result
  }
  remember(state, `${subject.emoji} 去上${stage.label}${subject.label}（学费 ${stage.tuition}）`, nowMs)
  return result
}
