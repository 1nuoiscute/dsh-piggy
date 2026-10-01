// @ts-check
/**
 * 桌面版外壳（apps/desktop）的标志。
 *
 * 外壳把窗口缩到猪身上，位置归它管；页面里只保留内边距。网页版没有这个对象，
 * 调用处据此走原路（见 index.js 的拖动、layout.js 的 fitPanel）。
 * @module dsh-piggy/client/desktop-shell
 */

/** @returns {any} 外壳对象；不在桌面版里就是 null。 */
export function desktopShell() {
  var shell = typeof window !== 'undefined' ? (/** @type {any} */ (window)).__dshPiggyShell : null
  return shell !== null && typeof shell === 'object' && typeof shell.moveBy === 'function' ? shell : null
}
