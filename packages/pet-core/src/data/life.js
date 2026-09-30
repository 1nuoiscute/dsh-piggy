// @ts-check
/**
 * 生命周期与等级 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 * @module dsh-pig/data/life
 */

/** Attribute ceilings. `health` keeps QQ Pet's 5-point scale. */
export const MAX = Object.freeze({ satiety: 100, happiness: 100, cleanliness: 100, health: 5 })

/** One "pig month" — what the stage table below counts in. */
export const DAYS_PER_MONTH = 30

/**
 * @typedef {object} LifeStage
 * @property {string} key
 * @property {string} label
 * @property {string} emoji
 * @property {number} size
 * @property {number} [from]
 * @property {string} line
 * @property {boolean} [box]
 * @property {string} [art]
 * @property {boolean} [faded]
 */
/** @type {ReadonlyArray<LifeStage>} */
export const LIFE_STAGES = Object.freeze([
  Object.freeze({
    key: 'box', label: '纸盒', emoji: '📦', size: 58, from: 0, box: true,
    line: '一个纸盒，侧面戳了几个透气孔',
  }),
  Object.freeze({
    key: 'piglet', label: '小猪', emoji: '🐖', art: 'piglet', size: 54, from: 0,
    line: '刚从纸盒里蹦出来，圆头圆脑',
  }),
  Object.freeze({
    key: 'young', label: '青年猪', emoji: '🐖', size: 60, from: 1 * DAYS_PER_MONTH,
    line: '长开了，走路带风',
  }),
  Object.freeze({
    key: 'middle', label: '成年猪', emoji: '🐖', size: 68, from: 3 * DAYS_PER_MONTH,
    line: '很有分量，会一屁股坐住你的椅子',
  }),
  Object.freeze({
    key: 'elder', label: '老年猪', emoji: '🐖', art: 'elder', size: 62, from: 6 * DAYS_PER_MONTH,
    line: '鬃毛白了，獠牙还在',
  }),
])

/**
 * How long a full life lasts, in days. Eight months: 1 as a piglet, 2 young,
 * 3 grown, 2 elderly.
 */
export const LIFESPAN_DAYS = 8 * DAYS_PER_MONTH

/**
 * Time multiplier. 1 = the ages above are real months. Raise it to see a whole
 * life without waiting one.
 *
 * | 倍率 | 一生 | 小猪→青年 |
 * |---|---|---|
 * | 1 | 8 个月 | 1 个月 |
 * | 12 | 20 天 | 2.5 天 |
 * | 30 | 8 天 | 1 天 |
 */
export const DEFAULT_TIME_SCALE = 1

/** Presets offered in the panel, so the number is never typed. */
export const TIME_SCALES = Object.freeze([1, 12, 30, 60])

/** The tombstone and the soul that settles on an unclaimed one. */
/** @type {LifeStage} */
export const GRAVE = Object.freeze({ key: 'grave', label: '墓碑', emoji: '🪦', size: 56, line: '这里躺着一只猪' })

export const SOUL = Object.freeze({ emoji: '👻', label: '灵魂' })

/** How long a grave is left alone before the soul turns up. */
export const SOUL_AFTER_DAYS = 1

// ---------------------------------------------------------------------------
// Level — the other axis
//
// Age is the body: it grows, then it goes. Level is the history: it never
// resets, not even when the pig dies, so adopting a new one is a continuation
// rather than a wipe. Unbounded on purpose — there is no "maxed out".
// ---------------------------------------------------------------------------

/** XP needed to *reach* a level. Quadratic, so each level costs a bit more. */
export const xpForLevel = level => (level <= 1 ? 0 : 20 * level * (level - 1))

/** Titles, earned by level. The last one that applies wins. */
export const LEVEL_TITLES = Object.freeze([
  Object.freeze({ level: 1, label: '新来的', emoji: '🌱' }),
  Object.freeze({ level: 5, label: '熟面孔', emoji: '🙂' }),
  Object.freeze({ level: 10, label: '老伙计', emoji: '🤝' }),
  Object.freeze({ level: 20, label: '镇宅之猪', emoji: '🏠' }),
  Object.freeze({ level: 35, label: '十里八乡有名', emoji: '📣' }),
  Object.freeze({ level: 50, label: '传说', emoji: '🌟' }),
  Object.freeze({ level: 80, label: '神话', emoji: '👑' }),
])

export const lifeStageByKey = key => LIFE_STAGES.find(stage => stage.key === key) ?? null

// ---------------------------------------------------------------------------
// Time — QQ Pet hands out timers measured in hours, not seconds. The desktop
// pet sits in a corner for a working day; the pig should too.
// ---------------------------------------------------------------------------
