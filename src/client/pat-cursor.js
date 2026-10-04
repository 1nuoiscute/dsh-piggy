// @ts-check
/**
 * 摸猪的光标：挥手 emoji（用户 2026-10-05：原来手画的手掌太丑）。
 * 运行时用 canvas 把 emoji 画成 32×32 的 PNG，写进宿主的 --pat-cursor；字体跟面板一样
 * （桌面版内置 Noto，网页版系统 emoji），所以光标和界面里的 emoji 是同一套。
 * 画不了（没有 canvas、测试环境）就继续用 CSS 里的手画光标兜底。
 */
const SIZE = 32
let drawnFor = null

/** @param {any} host */
export function applyPatCursor(host) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function' || typeof getComputedStyle !== 'function') return
  let family = 'sans-serif'
  try { family = String(getComputedStyle(host).getPropertyValue('--ac-font') || '').trim() || 'sans-serif' } catch { return }
  if (drawnFor === family) return
  drawnFor = family
  const font = `26px ${family}`
  const draw = () => {
    try {
      const canvas = /** @type {HTMLCanvasElement} */ (document.createElement('canvas'))
      if (typeof canvas.getContext !== 'function') return
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (ctx === null) return
      ctx.font = font
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('👋', SIZE / 2, SIZE / 2 + 1)
      const url = canvas.toDataURL('image/png')
      if (typeof url === 'string' && url.startsWith('data:image/png')) host.style.setProperty('--pat-cursor', `url(${url}) 14 18, pointer`)
    } catch { /* 留着 CSS 里的手画光标 */ }
  }
  const fonts = /** @type {any} */ (document).fonts
  try {
    if (fonts !== undefined && typeof fonts.load === 'function') fonts.load(font, '👋').then(draw, draw)
    else draw()
  } catch { /* 留着兜底光标 */ }
}
