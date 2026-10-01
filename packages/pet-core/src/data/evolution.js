// @ts-check
/**
 * 形态：长成之后可以换的一身样子（猪猪王、恶魔猪，立绘来自 PR #2 / #3，作者 1nuoiscute）。
 *
 * 等级成长（data/life.js）照旧；形态只是在某个阶段上换一身样子，不加收益。
 * `via` 决定**怎么得到**它，也是唯一的入口开关：
 *   - `coronation` 加冕 —— 出现在「👑 加冕」App 里，由主人点；
 *   - `contract`   契约 —— 不进加冕 App，靠商店的契约道具在背包里使用（见 data/shop.js）。
 * 加冕是给王的动词：王冠可以加冕，恶魔只能签约。所以要加的不是"又一种加冕"，而是
 * 在 FORMS 里加一行并选一个 `via`；立绘、hides、actionArt 仍然只有这一份真相。
 *
 * 以后加新形态：在 FORMS 里加一行，在 assets/ 放 `<art>.svg`（有动作立绘的再放
 * `<art>-eat/bathe/play/pet/relaxed/work/study/trip.svg` 并写 actionArt: true）。
 * @module dsh-piggy/data/evolution
 */

/**
 * @typedef {object} PigForm
 * @property {string} key       存档里 state.form 的值
 * @property {'coronation'|'contract'} via  怎么得到：加冕 App / 契约道具
 * @property {string} label
 * @property {string} emoji
 * @property {string} art       assets/ 里的立绘名
 * @property {boolean} actionArt 有没有喂食、打工等各个动作的立绘
 * @property {string} line
 * @property {string} stage     到了哪个阶段（data/life.js 的 key）才能换
 * @property {Readonly<Record<string, number>>} requires  三维各要多少，`jobs` / `plays` 是本代完成的打工 / 玩耍次数
 * @property {readonly string[]} hides  这身样子盖住的装扮位置
 */

/** @type {readonly Readonly<PigForm>[]} */
export const FORMS = Object.freeze([
  Object.freeze({
    key: 'king', via: 'coronation', label: '猪猪王', emoji: '👑', art: 'pig-king', actionArt: true,
    line: '阅历与本事都攒够了，戴上自己的王冠。',
    stage: 'middle',
    requires: Object.freeze({ intel: 20, charm: 20, strong: 20, jobs: 10 }),
    hides: Object.freeze(['head', 'back']),
  }),
  Object.freeze({
    key: 'devil', via: 'contract', label: '恶魔猪', emoji: '😈', art: 'pig-devil', actionArt: true,
    line: '玩出了本事，也玩出了自己的小脾气。',
    stage: 'middle',
    requires: Object.freeze({ strong: 20, charm: 20, plays: 20 }),
    hides: Object.freeze(['head', 'back']),
  }),
])

/** Every form the 加冕 App may offer. */
export const CORONATION_FORMS = Object.freeze(FORMS.filter(form => form.via === 'coronation'))

/** The form `/pig crown` picks when none is named. */
export const DEFAULT_FORM = 'king'

/** @returns {Readonly<PigForm> | null} */
export function formByKey(key) {
  return FORMS.find(form => form.key === key) ?? null
}
