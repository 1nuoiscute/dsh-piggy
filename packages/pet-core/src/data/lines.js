// @ts-check
/**
 * 台词 —— 按场景分类，带可选的回复按钮（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 *
 * 场景照 QQ 宠物的台词分类来（enter / eat / clean / toHeartTolk / levUp /
 * 生病 tolk / errTolk / successTolk ……）。`[主人]` 会换成主人的称呼。
 *
 * 这里只是框架自带的样例台词，全部文案在 B6 批次由用户审定后替换。
 *
 * @module dsh-pig/data/lines
 */

/** 台词里代表主人称呼的占位符。 */
export const OWNER_TOKEN = '[主人]'

/** 没设置称呼时用的默认称呼。 */
export const DEFAULT_OWNER_NAME = '主人'

/** 点一次回复按钮加的心情；每句台词只算一次。 */
export const REPLY_HAPPINESS = 3

/**
 * @typedef {object} LineReply
 * @property {string} label - 按钮上的字
 * @property {number} [happiness] - 点了加多少心情，默认 REPLY_HAPPINESS
 */

/**
 * @typedef {object} Line
 * @property {string} text
 * @property {ReadonlyArray<LineReply>} [replies]
 */

const praise = Object.freeze([Object.freeze({ label: '真乖' }), Object.freeze({ label: '摸摸头' })])
const comfort = Object.freeze([Object.freeze({ label: '会好的' }), Object.freeze({ label: '乖，吃药' })])

/** @type {Readonly<Record<string, ReadonlyArray<Line>>>} */
export const LINES = Object.freeze({
  enter: Object.freeze([
    Object.freeze({ text: '[主人]你回来啦！', replies: Object.freeze([Object.freeze({ label: '回来了' })]) }),
    Object.freeze({ text: '等你好久了～' }),
  ]),
  eat: Object.freeze([
    Object.freeze({ text: '好吃！还有吗？', replies: praise }),
    Object.freeze({ text: '吧唧吧唧…' }),
    Object.freeze({ text: '[主人]最好了～' }),
  ]),
  bathe: Object.freeze([
    Object.freeze({ text: '香喷喷的！' }),
    Object.freeze({ text: '水有点凉…', replies: Object.freeze([Object.freeze({ label: '马上擦干' })]) }),
  ]),
  play: Object.freeze([
    Object.freeze({ text: '再来一次！' }),
    Object.freeze({ text: '接住啦！', replies: praise }),
  ]),
  pet: Object.freeze([
    Object.freeze({ text: '好舒服…' }),
    Object.freeze({ text: '再摸摸～', replies: Object.freeze([Object.freeze({ label: '好' })]) }),
    Object.freeze({ text: '呼噜呼噜…' }),
    Object.freeze({ text: '（眯起眼睛）' }),
  ]),
  levelup: Object.freeze([
    Object.freeze({ text: '我又长大了一点！', replies: praise }),
  ]),
  sick: Object.freeze([
    Object.freeze({ text: '阿——嚏！[主人]，我好像病了…', replies: comfort }),
  ]),
  wrongMedicine: Object.freeze([
    Object.freeze({ text: '这药好苦…好像不是这个', replies: Object.freeze([Object.freeze({ label: '对不起' })]) }),
  ]),
  cured: Object.freeze([
    Object.freeze({ text: '我好啦！谢谢[主人]～', replies: praise }),
  ]),
  tired: Object.freeze([
    Object.freeze({ text: '好累啊…', replies: Object.freeze([Object.freeze({ label: '辛苦了' })]) }),
  ]),
  study: Object.freeze([
    Object.freeze({ text: '今天学到好多！', replies: praise }),
  ]),
  idle: Object.freeze([
    Object.freeze({ text: '[主人]在忙什么呀？' }),
    Object.freeze({ text: '（打了个哈欠）' }),
  ]),
  death: Object.freeze([
    Object.freeze({ text: '[主人]保重，我走了，不带走一片云彩～' }),
  ]),
})

/** Every scene a line can be asked for. */
export const LINE_SCENES = Object.freeze(Object.keys(LINES))
