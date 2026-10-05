// @ts-check
/**
 * 摸到了哪儿（G 批次）：按点在猪身上的相对位置分成头、耳朵、鼻子、肚子、背、尾巴、脚。
 *
 * 所有猪图都是 64×64 的画布、猪朝左站：鼻子在左下，耳朵在左上，尾巴在右上，脚在最下面
 * （见 docs/guides/creating-skins.md 的对齐图）。位置换算成 0–1 再分区。
 * @module dsh-piggy/client/pet-parts
 */

/** 每个部位摸到时冒的小东西。 */
export var PART_FX = {
  head: ['❤️'], ears: ['〰️', '❤️'], nose: ['💦'], belly: ['😆', '❤️'], back: ['✨'], tail: ['🌀'], feet: ['🐾'],
}

/**
 * @param {number} fx 0（左）–1（右）
 * @param {number} fy 0（上）–1（下）
 * @returns {string}
 */
export function partFor(fx, fy) {
  if (fy > 0.8) return 'feet'
  if (fx > 0.8 && fy < 0.45) return 'tail'
  if (fx < 0.42 && fy > 0.58) return 'nose'
  if (fx < 0.45 && fy < 0.38) return 'ears'
  if (fx < 0.5) return 'head'
  if (fy > 0.6) return 'belly'
  return 'back'
}

/**
 * 指针落在猪图的哪个部位；量不到（没有布局、点在图外）就当摸头。
 * @param {Element} pig
 * @param {{clientX?: number, clientY?: number}} event
 */
export function partAt(pig, event) {
  if (!pig || typeof pig.getBoundingClientRect !== 'function' || typeof event?.clientX !== 'number') return 'head'
  var box = pig.getBoundingClientRect()
  if (!box || box.width <= 0 || box.height <= 0) return 'head'
  var fx = (event.clientX - box.left) / box.width
  var fy = (event.clientY - box.top) / box.height
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return 'head'
  return partFor(fx, fy)
}
