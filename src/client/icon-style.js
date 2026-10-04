// @ts-check
/** Local UI preference; it does not become part of the pig save. */
import { ART_URL } from './constants.js'
import { el } from './dom.js'

const BUNDLED = new Set([
  'status', 'card', 'dex', 'skins', 'study', 'work', 'shop', 'travel',
  'bag', 'pomodoro', 'fishing', 'settings', 'update', 'quit', 'dev',
])

/**
 * 主菜单图标一律用 emoji（用户 2026-10-05：要的只是 Emoji 样式，「主菜单图标」选项多余，已从设置里拿掉）。
 * 以前存过 built-in 的设备也回到 emoji，免得卡在一个看不到的选项上。手绘 SVG 素材先留着。
 */
export function iconStyle() {
  return 'system'
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
