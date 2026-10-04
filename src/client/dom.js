// @ts-check
/**
 * 极小的 DOM 构造助手。
 *
 * @module dsh-piggy/client/dom
 */

import { num } from './values.js'
export function el(tag, className, text) {
  var node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export function button(className, attrs, onClick) {
  var node = el('button', className)
  node.type = 'button'
  for (var key in attrs) node.setAttribute(key, attrs[key])
  node.addEventListener('click', function (event) {
    event.stopPropagation()
    onClick(event)
  })
  return node
}

export function meter(value, variant) {
  var wrap = el('div', 'dp-meter' + (variant ? ' ' + variant : ''))
  var fill = document.createElement('i')
  fill.style.width = Math.max(0, Math.min(100, num(value, 0))) + '%'
  wrap.appendChild(fill)
  return wrap
}

/**
 * 一排横着放不下的页签：鼠标滚轮上下滚也能左右翻，并把当前选中的那个滚到中间
 * （重画后滚动位置会归零，不然后面的页签一选中就看不见了）。
 */
export function sideScroller(strip, active) {
  if (typeof strip.addEventListener === 'function') {
    strip.addEventListener('wheel', function (event) {
      if (strip.scrollWidth <= strip.clientWidth) return
      var delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (delta === 0) return
      strip.scrollLeft += delta
      event.preventDefault()
    }, { passive: false })
  }
  if (active && typeof active.offsetLeft === 'number') {
    strip.scrollLeft = Math.max(0, active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2)
  }
}
