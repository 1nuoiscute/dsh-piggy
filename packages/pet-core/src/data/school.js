// @ts-check
/**
 * 学段与科目 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 * @module dsh-pig/data/school
 */

import { MINUTES } from './minutes.js'

/** Nine subjects, mirroring the img_res/study artwork. */
export const SUBJECTS = Object.freeze([
  // 🧸 幼儿园
  Object.freeze({ key: 'sing', label: '唱歌', emoji: '🎵', trait: 'charm' }),
  Object.freeze({ key: 'doodle', label: '涂鸦', emoji: '🖍', trait: 'charm' }),
  Object.freeze({ key: 'literacy', label: '认字', emoji: '🔤', trait: 'intel' }),
  // 🎨 课外（这四门同时是 0.19.0 的兴趣技能来源）
  Object.freeze({ key: 'football', label: '足球', emoji: '⚽', trait: 'strong' }),
  Object.freeze({ key: 'piano', label: '钢琴', emoji: '🎹', trait: 'charm' }),
  Object.freeze({ key: 'painting', label: '画画', emoji: '🎨', trait: 'charm' }),
  Object.freeze({ key: 'go', label: '围棋', emoji: '♟', trait: 'intel' }),
  // 📚 小学
  Object.freeze({ key: 'chinese', label: '语文', emoji: '📖', trait: 'intel' }),
  Object.freeze({ key: 'mathematics', label: '数学', emoji: '🔢', trait: 'intel' }),
  Object.freeze({ key: 'english', label: '英语', emoji: '🔤', trait: 'intel' }),
  Object.freeze({ key: 'science', label: '科学', emoji: '🔬', trait: 'intel' }),
  Object.freeze({ key: 'pe', label: '体育', emoji: '🏃', trait: 'strong' }),
  Object.freeze({ key: 'art', label: '美术', emoji: '🖌', trait: 'charm' }),
  // 🏫 中学
  Object.freeze({ key: 'history', label: '历史', emoji: '🏛', trait: 'intel' }),
  Object.freeze({ key: 'geography', label: '地理', emoji: '🌍', trait: 'intel' }),
  Object.freeze({ key: 'physics', label: '物理', emoji: '🧲', trait: 'intel' }),
  Object.freeze({ key: 'chemistry', label: '化学', emoji: '⚗️', trait: 'intel' }),
  // 🎓 高中
  Object.freeze({ key: 'biology', label: '生物', emoji: '🧬', trait: 'intel' }),
  Object.freeze({ key: 'politics', label: '政治', emoji: '⚖️', trait: 'charm' }),
  Object.freeze({ key: 'it', label: '信息技术', emoji: '💻', trait: 'intel' }),
  // 🏛 大学（研究生是同一批课的「深造」）
  Object.freeze({ key: 'philosophy', label: '哲学', emoji: '📜', trait: 'intel' }),
  Object.freeze({ key: 'economics', label: '经济', emoji: '💹', trait: 'intel' }),
  Object.freeze({ key: 'engineering', label: '工程', emoji: '⚙️', trait: 'strong' }),
])

/**
 * Seven school stages,幼儿园 → 研究生.
 *
 * Two things make this a ladder rather than a menu:
 *   1. `subjects` is the **complete** course list of that stage — the next
 *      stage opens only once every key in it has been studied at least once
 *      *at that stage* (`coursesByStage`).
 *   2. Higher stages re-teach lower subjects with a bigger `gain`, so the same
 *      语文 is worth 1 point in 小学 and 4 in 大学. That is what turns the
 *      ladder into real numbers instead of 46 one-off lessons.
 *
 * The 科目 counts follow the agreed table (3/4/6/7/8/9/9 = 46 lessons to the
 * top); higher stages keep the named new subjects and drop the ones that are no
 * longer taught, so the count always matches the list.
 */
export const SCHOOL_STAGES = Object.freeze([
  Object.freeze({
    key: 'preschool', label: '幼儿园', emoji: '🧸',
    subjects: Object.freeze(['sing', 'doodle', 'literacy']),
    minutes: MINUTES.quarter, tuition: 20, gain: 1, xp: 30, satiety: -4, happiness: -1,
    requires: null,
  }),
  Object.freeze({
    key: 'extracurricular', label: '课外', emoji: '🎨',
    subjects: Object.freeze(['football', 'piano', 'painting', 'go']),
    minutes: MINUTES.quarter + 5, tuition: 30, gain: 1, xp: 40, satiety: -5, happiness: -1,
    requires: Object.freeze({ stage: 'preschool', subjects: 3, label: '幼儿园 3 门课各上一次' }),
  }),
  Object.freeze({
    key: 'primary', label: '小学', emoji: '📚',
    subjects: Object.freeze(['chinese', 'mathematics', 'english', 'science', 'pe', 'art']),
    minutes: 40, tuition: 60, gain: 1, xp: 80, satiety: -8, happiness: -2,
    requires: Object.freeze({ stage: 'extracurricular', subjects: 4, label: '课外 4 门课各上一次' }),
  }),
  Object.freeze({
    key: 'middle', label: '中学', emoji: '🏫',
    subjects: Object.freeze(['chinese', 'mathematics', 'english', 'history', 'geography', 'physics', 'chemistry']),
    minutes: MINUTES.hour, tuition: 140, gain: 2, xp: 160, satiety: -12, happiness: -3,
    requires: Object.freeze({ stage: 'primary', subjects: 6, label: '小学 6 门课各上一次' }),
  }),
  Object.freeze({
    key: 'high', label: '高中', emoji: '🎓',
    subjects: Object.freeze(['chinese', 'mathematics', 'english', 'physics', 'chemistry', 'biology', 'politics', 'it']),
    minutes: MINUTES.twoHours, tuition: 300, gain: 3, xp: 320, satiety: -20, happiness: -5,
    requires: Object.freeze({ stage: 'middle', subjects: 7, label: '中学 7 门课各上一次' }),
  }),
  Object.freeze({
    key: 'college', label: '大学', emoji: '🏛',
    subjects: Object.freeze(['english', 'mathematics', 'physics', 'chemistry', 'biology', 'politics', 'philosophy', 'economics', 'engineering']),
    minutes: MINUTES.fourHours, tuition: 700, gain: 4, xp: 700, satiety: -34, happiness: -8,
    requires: Object.freeze({ stage: 'high', subjects: 8, label: '高中 8 门课各上一次' }),
  }),
  Object.freeze({
    key: 'graduate', label: '研究生', emoji: '🔬',
    // 深造：和大学同一批九门，重复上给更多属性。
    subjects: Object.freeze(['english', 'mathematics', 'physics', 'chemistry', 'biology', 'politics', 'philosophy', 'economics', 'engineering']),
    minutes: MINUTES.eightHours, tuition: 1600, gain: 6, xp: 1500, satiety: -50, happiness: -12,
    requires: Object.freeze({ stage: 'college', subjects: 9, label: '大学 9 门课各上一次' }),
  }),
])

// ---------------------------------------------------------------------------
// Travel — QQ Pet's `trip` option. The pig goes away and comes back with a
// souvenir for the collection.
// ---------------------------------------------------------------------------

export const subjectByKey = key => SUBJECTS.find(subject => subject.key === key) ?? null

export const schoolStageByKey = key => SCHOOL_STAGES.find(stage => stage.key === key) ?? null

/** The stage a fresh pig may enrol in: the first one with no gate. */
export const FIRST_STAGE = SCHOOL_STAGES[0].key

/** The subject keys a stage teaches, in the order the panel lists them. */
export const stageSubjectKeys = stage => (stage?.subjects ?? [])

/** The subject records a stage teaches. */
export const stageSubjectList = stage =>
  stageSubjectKeys(stage).map(key => SUBJECTS.find(subject => subject.key === key)).filter(Boolean)

/**
 * Which subjects of `stage` the pig has already sat through at least once.
 * @param {{key: string, subjects?: readonly string[]}|null|undefined} stage
 * @param {Record<string, Record<string, number>>|null|undefined} coursesByStage
 */
const stageSubjectsDone = (stage, coursesByStage) => {
  if (stage === null || stage === undefined) return 0
  return stageSubjectKeys(stage).filter(key => (coursesByStage?.[stage.key]?.[key] ?? 0) >= 1).length
}

/**
 * Whether `stage` is open yet: every subject of the stage below it must have
 * been studied **at that stage**. A count is no longer enough — with seven
 * stages and shared subject names, "9 lessons somewhere" says nothing about
 * whether the pig actually attended 小学's six courses.
 *
 * @param {{key: string, requires: {stage: string, subjects: number, label: string}|null}} stage
 * @param {Record<string, Record<string, number>>} coursesByStage
 */
export function stageUnlocked(stage, coursesByStage) {
  if (stage === null || stage === undefined) return false
  if (!stage.requires) return true
  const previous = schoolStageByKey(stage.requires.stage)
  return previous !== null && stageSubjectsDone(previous, coursesByStage) >= stage.requires.subjects
}

/** How far along the gate is, for the panel's progress hint. */
export function stageProgress(stage, coursesByStage) {
  const need = stage?.requires
  if (!need) return null
  const previous = schoolStageByKey(need.stage)
  const done = previous === null ? 0 : stageSubjectsDone(previous, coursesByStage)
  return { done, need: need.subjects, label: need.label, stage: need.stage }
}

/** Every course key a fresh pig has not studied yet. */
export const SUBJECT_KEYS = SUBJECTS.map(subject => subject.key)
