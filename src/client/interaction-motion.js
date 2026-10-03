// @ts-check
/** Short interaction feedback. The browser owns interpolation; game timing stays untouched. */

/** @param {Element} node */
function canAnimate(node) {
  return typeof node.animate === 'function' &&
    !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

let appEntry = null

/** @param {Element} content */
export function animateAppEntry(content) {
  if (!canAnimate(content)) return
  appEntry?.cancel()
  appEntry = content.animate([
    { opacity: 0.7, transform: 'translateY(5px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 170, easing: 'cubic-bezier(.2,.8,.2,1)' })
}

/** @param {Element} tile */
export function animatePurchase(tile) {
  if (!canAnimate(tile)) return
  tile.animate([
    { transform: 'scale(0.94)', opacity: 0.72 },
    { transform: 'scale(1.04)', opacity: 1, offset: 0.5 },
    { transform: 'scale(1)', opacity: 1 },
  ], { duration: 320, easing: 'ease-out' })
}
