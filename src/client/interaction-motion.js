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

/** 面板在猪的哪一侧：用于动画从靠猪的那个角长出来。 */
function panelOrigin(ctx) {
  const below = ctx.host.getAttribute('data-panel-vertical') === 'below' || (ctx.card.style.top !== 'auto' && ctx.card.style.top !== '')
  const right = ctx.host.getAttribute('data-panel-side') === 'right'
  return { below, origin: (below ? 'top ' : 'bottom ') + (right ? 'left' : 'right') }
}

/**
 * 打开面板：面板和名牌从猪那一角淡入、略微放大到位（用户 2026-10-05 要开关动画）。
 * @param {any} ctx
 */
export function animatePanelOpen(ctx) {
  const { below, origin } = panelOrigin(ctx)
  for (const node of [ctx.card, ctx.hud]) {
    if (!node || node.hidden || !canAnimate(node)) continue
    node.style.transformOrigin = origin
    node.animate([
      { opacity: 0, transform: `translateY(${below ? -6 : 6}px) scale(.94)` },
      { opacity: 1, transform: 'none' },
    ], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' })
  }
}

/**
 * 收起面板：真面板照旧立刻隐藏（逻辑不变），原位放一个不接收点击的残影淡出。
 * 残影按宿主被钉住的那两条边定位：收起后场景变矮变窄，但钉住的边不动，残影就不会跳。
 * @param {any} ctx
 */
export function animatePanelClose(ctx) {
  const { below, origin } = panelOrigin(ctx)
  const host = ctx.host
  for (const node of [ctx.card, ctx.hud]) {
    if (!node || node.hidden || !canAnimate(node) || typeof node.cloneNode !== 'function') continue
    const ghost = node.cloneNode(true)
    ghost.setAttribute('data-ghost', 'true')
    ghost.setAttribute('aria-hidden', 'true')
    const fromTop = host.style.top !== '' && host.style.top !== 'auto'
    const fromLeft = host.style.left !== '' && host.style.left !== 'auto'
    const style = ghost.style
    style.pointerEvents = 'none'
    style.margin = '0'
    style.width = node.offsetWidth + 'px'
    style.height = node.offsetHeight + 'px'
    style.maxHeight = 'none'
    style.top = fromTop ? node.offsetTop + 'px' : 'auto'
    style.bottom = fromTop ? 'auto' : (host.offsetHeight - node.offsetTop - node.offsetHeight) + 'px'
    style.left = fromLeft ? node.offsetLeft + 'px' : 'auto'
    style.right = fromLeft ? 'auto' : (host.offsetWidth - node.offsetLeft - node.offsetWidth) + 'px'
    style.transformOrigin = origin
    node.parentNode.insertBefore(ghost, node.nextSibling)
    const fade = ghost.animate([
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: `translateY(${below ? -4 : 4}px) scale(.96)` },
    ], { duration: 140, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })
    fade.onfinish = () => ghost.remove()
    setTimeout(() => ghost.remove(), 400)
  }
}
