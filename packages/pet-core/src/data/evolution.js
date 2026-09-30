// @ts-check
/** Optional final forms; the level-based growth ladder remains in life.js. */
/**
 * @typedef {object} FinalForm
 * @property {string} key
 * @property {string} label
 * @property {string} art
 * @property {string} line
 */
export const KING_REQUIREMENTS = Object.freeze({ intel: 20, charm: 20, strong: 20, jobs: 10 })
export const KING_STAGES = Object.freeze(['middle'])
/** @type {Readonly<FinalForm>} */
export const KING_FORM = Object.freeze({ key: 'king', label: '猪猪王', art: 'pig-king', line: '阅历与本事都攒够了，戴上自己的王冠。' })
