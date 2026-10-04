// @ts-check
/**
 * Emoji 用哪套：桌面版自带一整套 Noto Color Emoji（apps/desktop/renderer/piggy-emoji.ttf），
 * 默认用它，三个平台看起来一样；也可以切回这台设备系统自带的 emoji。只存本机，不进存档。
 * 网页版（DSH 里）没有内置字体，这个设置不出现，一直是系统自带。
 */
import { readStore, writeStore } from './storage.js'

export const EMOJI_STYLE_KEY = 'dsh-piggy:emoji-style'

export function emojiStyle() {
  return readStore(EMOJI_STYLE_KEY) === 'system' ? 'system' : 'bundled'
}

export function setEmojiStyle(style) {
  writeStore(EMOJI_STYLE_KEY, style === 'system' ? 'system' : 'bundled')
}

/** 外壳页面里有没有加载内置 emoji 字体（旧外壳没有，就不给这个选项）。 */
export function hasBundledEmoji() {
  try {
    const fonts = /** @type {any} */ (document).fonts
    if (fonts === undefined || typeof fonts.forEach !== 'function') return false
    let found = false
    fonts.forEach(function (face) { if (String(face.family).replace(/["']/g, '') === 'Piggy Emoji') found = true })
    return found
  } catch {
    return false
  }
}

/** 宿主上挂 data-emoji，外壳的 CSS 按它换字体栈。 */
export function applyEmojiStyle(host) {
  host.setAttribute('data-emoji', emojiStyle())
}
