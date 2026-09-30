// @ts-check
/**
 * 极小的 DOM 构造助手。
 *
 * @module dsh-pig/client/dom
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
    onClick()
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
