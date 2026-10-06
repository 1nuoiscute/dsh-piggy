// @ts-check
/** Local UI preference; it does not become part of the pig save. */
import { ART_URL, ICON_STYLE_KEY } from './constants.js'
import { el } from './dom.js'
import { readStore, writeStore } from './storage.js'

const BUNDLED = new Set([
  'status', 'card', 'dex', 'skins', 'study', 'work', 'shop', 'travel',
  'bag', 'pomodoro', 'fishing', 'settings', 'update', 'quit', 'dev',
])

/** 主菜单图标：内置手绘 SVG 还是这台设备的表情。设置 → 主菜单图标。 */
export const ICON_STYLES = Object.freeze(['built-in', 'system'])

export function iconStyle() {
  return readStore(ICON_STYLE_KEY) === 'built-in' ? 'built-in' : 'system'
}

export function setIconStyle(style) {
  writeStore(ICON_STYLE_KEY, style === 'built-in' ? 'built-in' : 'system')
}

/** Missing bundled files fall back to the device's Emoji. */
export function appIcon(key, emoji, className) {
  if (iconStyle() !== 'built-in' || !BUNDLED.has(key)) return el('span', className, emoji)
  const img = /** @type {HTMLImageElement} */ (el('img', className + ' dp-tile-svg'))
  img.src = ART_URL + 'ui-' + key + '.svg'
  img.alt = emoji
  img.addEventListener('error', function () {
    const replacement = el('span', className, emoji)
    img.parentNode?.replaceChild(replacement, img)
  })
  return img
}
