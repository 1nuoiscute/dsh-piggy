// @ts-check
/**
 * 加冕：长成之后可以选的形态（猪猪王是第一种，立绘来自 PR #2，作者 1nuoiscute）。
 *
 * 等级成长（data/life.js）照旧；形态只是在某个阶段上换一身样子，不加收益。
 * 以后加新形态：在 FORMS 里加一行，在 assets/ 放 `<art>.svg`（有动作立绘的再放
 * `<art>-eat/bathe/play/pet/relaxed/work/study/trip.svg` 并写 actionArt: true）。
 * @module dsh-piggy/data/evolution
 */

/**
 * @typedef {object} PigForm
 * @property {string} key       存档里 state.form 的值
 * @property {string} label
 * @property {string} emoji
 * @property {string} art       assets/ 里的立绘名
 * @property {boolean} actionArt 有没有喂食、打工等各个动作的立绘
 * @property {string} line
 * @property {string} stage     到了哪个阶段（data/life.js 的 key）才能加冕
 * @property {Readonly<Record<string, number>>} requires  三维各要多少，`jobs` 是本代打完几份工
 * @property {readonly string[]} hides  这身样子盖住的装扮位置
 */

/** @type {readonly Readonly<PigForm>[]} */
export const FORMS = Object.freeze([
  Object.freeze({
    key: 'king', label: '猪猪王', emoji: '👑', art: 'pig-king', actionArt: true,
    line: '阅历与本事都攒够了，戴上自己的王冠。',
    stage: 'middle',
    requires: Object.freeze({ intel: 20, charm: 20, strong: 20, jobs: 10 }),
    hides: Object.freeze(['head', 'back']),
  }),
])

/** The form `/pig crown` picks when none is named. */
export const DEFAULT_FORM = 'king'

/** @returns {Readonly<PigForm> | null} */
export function formByKey(key) {
  return FORMS.find(form => form.key === key) ?? null
}
