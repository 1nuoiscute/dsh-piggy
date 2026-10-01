// @ts-check
/**
 * 形态：长成之后可以换的一身样子（猪猪王、恶魔猪，立绘来自 PR #2 / #3，作者 1nuoiscute）。
 *
 * 等级成长（data/life.js）照旧；形态只是在某个阶段上换一身样子，不加收益。
 * 每种形态都通过商店道具获得；item 指向 data/shop.js 的 key。
 *
 * 以后加新形态：在 FORMS 里加一行，在 assets/ 放 `<art>.svg`（有动作立绘的再放
 * `<art>-eat/bathe/play/pet/relaxed/work/study/trip.svg` 并写 actionArt: true）。
 * @module dsh-piggy/data/evolution
 */

/**
 * @typedef {object} PigForm
 * @property {string} key       存档里 state.form 的值
 * @property {'item'} via
 * @property {string} item
 * @property {string} label
 * @property {string} emoji
 * @property {string} art       assets/ 里的立绘名
 * @property {boolean} actionArt 有没有喂食、打工等各个动作的立绘
 * @property {string} line
 * @property {string} hint      图鉴未解锁时显示的谜面，不直接泄露精确条件
 * @property {string} stage     到了哪个阶段（data/life.js 的 key）才能换
 * @property {Readonly<Record<string, number>>} requires  三维各要多少，`jobs` / `plays` 是本代完成的打工 / 玩耍次数
 * @property {readonly string[]} hides  这身样子盖住的装扮位置
 */

/** @type {readonly Readonly<PigForm>[]} */
export const FORMS = Object.freeze([
  Object.freeze({
    key: 'king', via: 'item', item: 'crown', label: '猪猪王', emoji: '👑', art: 'pig-king', actionArt: true,
    line: '阅历与本事都攒够了，戴上自己的王冠。',
    hint: '当阅历足以服众，三种本事不再偏科，金色会选择它的主人。',
    stage: 'middle',
    requires: Object.freeze({ intel: 20, charm: 20, strong: 20, jobs: 10 }),
    hides: Object.freeze(['head', 'back']),
  }),
  Object.freeze({
    key: 'devil', via: 'item', item: 'contract', label: '恶魔猪', emoji: '😈', art: 'pig-devil', actionArt: true,
    line: '玩出了本事，也玩出了自己的小脾气。',
    hint: '当力量与魅力并肩长大，嬉闹声足够多时，一纸约定会来敲门。',
    stage: 'middle',
    requires: Object.freeze({ strong: 20, charm: 20, plays: 20 }),
    hides: Object.freeze(['head', 'back']),
  }),
])

/** The 加冕 App keeps its king card until C4 replaces the app. */
export const CORONATION_FORMS = Object.freeze(FORMS.filter(form => form.item === 'crown'))

/** The form `/pig crown` picks when none is named. */
export const DEFAULT_FORM = 'king'

/** @returns {Readonly<PigForm> | null} */
export function formByKey(key) {
  return FORMS.find(form => form.key === key) ?? null
}
