// @ts-check
/**
 * 猪在页面里的位置（网页版）：存 localStorage 的 right/bottom。
 *
 * 桌面版不读它 —— 位置归窗口管（见 desktop-shell.js）。
 * @module dsh-piggy/client/position
 */

/**
 * @param {string|null} raw - localStorage 里的原始字符串
 * @returns {{right: number, bottom: number}|null}
 */
export function readPosition(raw) {
  if (raw === null || raw === undefined) return null
  try {
    var parsed = JSON.parse(raw)
    if (parsed && typeof parsed.right === 'number' && typeof parsed.bottom === 'number') {
      return { right: parsed.right, bottom: parsed.bottom }
    }
  } catch (error) { /* 存坏了就当没存过 */ }
  return null
}
