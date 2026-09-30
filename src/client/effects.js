// @ts-check
/**
 * 猪的即时反馈：动作动画、粒子、气泡台词与 toast。
 *
 * 只碰交给它的几个元素，不读全局状态 —— 「猪还在不在」通过 isStopped()
 * 回调问外壳（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/client/effects
 */
import { PET_LINES } from './constants.js'
import { el } from './dom.js'

/**
 * @param {{ scene: object, pig: object, card: object, bubble: object, isStopped: () => boolean }} deps
 * @returns {{ react: Function, burst: Function, flash: Function, showBubble: Function, showLine: Function, toast: Function, dispose: Function }}
 */
export function createEffects(deps) {
  var scene = deps.scene
  var pig = deps.pig
  var card = deps.card
  var bubble = deps.bubble
  var isStopped = deps.isStopped

  var reactTimer = null
  var bubbleTimer = null

// ---- animation ----
function react(kind, ms) {
  if (reactTimer !== null) window.clearTimeout(reactTimer)
  // Re-assigning the same value does NOT restart a CSS animation, so
  // clicking three times quickly only played it once. Dropping the
  // attribute and forcing a reflow makes every click start from zero.
  pig.removeAttribute('data-react')
  void pig.offsetWidth
  pig.setAttribute('data-react', kind)
  reactTimer = window.setTimeout(function () {
    pig.removeAttribute('data-react')
    reactTimer = null
  }, ms || 900)
}

function burst(emojis, count) {
  for (var i = 0; i < (count || 1); i += 1) {
    (function (index) {
      window.setTimeout(function () {
        if (isStopped()) return
        var node = el('span', 'dp-fx', emojis[index % emojis.length])
        node.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 46) + 'px')
        // Anchor to the pig, not the scene. The scene is panel-wide when
        // open, so fixed coordinates put every particle off to one side.
        var spot = headSpot()
        node.style.left = (spot.x + Math.round((Math.random() - 0.5) * 22)) + 'px'
        node.style.top = spot.y + 'px'
        scene.appendChild(node)
        window.setTimeout(function () { node.remove() }, 1200)
      }, index * 110)
    })(i)
  }
}

/** Just above the pig's head, in scene coordinates. */
function headSpot() {
  var fallback = { x: 24, y: 8 }
  if (typeof pig.getBoundingClientRect !== 'function' || typeof scene.getBoundingClientRect !== 'function') return fallback
  var p = pig.getBoundingClientRect()
  var s = scene.getBoundingClientRect()
  if (p.width === 0 && p.height === 0) return fallback
  return { x: p.left - s.left + p.width / 2, y: p.top - s.top - 20 }
}

var REACTIONS = {
  hatch: { kind: 'levelup', ms: 980, fx: ['🥚', '✨', '🐖', '🎉'], count: 4, say: '孵出来啦！' },
  feed: { kind: 'feed', ms: 900, fx: ['🍎', '😋', '✨'], count: 3, say: '吃掉了！' },
  bathe: { kind: 'bathe', ms: 1050, fx: ['🫧', '🫧', '💧', '✨'], count: 4, say: '洗干净啦～' },
  play: { kind: 'play', ms: 900, fx: ['🎾', '⭐', '💨'], count: 3, say: '好开心！' },
  pet: { kind: 'pet', ms: 420, fx: ['❤️'], count: 1, say: '好舒服…' },
  work: { kind: 'away', ms: 900, fx: ['💼', '🧱', '🪙'], count: 3, say: '出门打工！' },
  study: { kind: 'away', ms: 900, fx: ['📚', '✏️', '🧠'], count: 3, say: '上学去！' },
  trip: { kind: 'away', ms: 900, fx: ['🧳', '🗺', '✨'], count: 3, say: '出发旅行！' },
  calloff: { kind: 'refuse', ms: 520, fx: ['💨'], count: 1, say: '提前回来了…' },
  buy: { kind: 'pet', ms: 620, fx: ['🪙', '🛒'], count: 2, say: '买到了！' },
  use: { kind: 'pet', ms: 620, fx: ['✨'], count: 2, say: '用掉了。' },
}

function flash(action) {
  var spec = REACTIONS[action]
  if (spec === undefined) return
  react(spec.kind, spec.ms)
  burst(spec.fx, spec.count)
  // Patting is the one thing you do over and over, so it gets a pool of
  // lines rather than the same four characters every time.
  var lines = action === 'pet' ? PET_LINES : null
  showBubble(lines === null ? spec.say : lines[Math.floor(Math.random() * lines.length)], 1600)
}

var bubbleTimer = null
function showBubble(text, ms) {
  if (bubbleTimer !== null) window.clearTimeout(bubbleTimer)
  bubble.textContent = text
  bubble.hidden = false
  bubbleTimer = window.setTimeout(function () {
    bubble.hidden = true
    bubbleTimer = null
  }, ms || 2600)
}

/**
 * A line the pig says, with optional reply buttons. Replying closes the bubble;
 * a line with buttons stays up longer so there is time to answer it.
 * @param {string} text
 * @param {string[]} replies
 * @param {(index: number) => void} onReply
 */
function showLine(text, replies, onReply) {
  if (replies.length === 0) {
    showBubble(text, 2600)
    return
  }
  if (bubbleTimer !== null) window.clearTimeout(bubbleTimer)
  bubble.textContent = text
  var row = el('div', 'dp-bubble-replies', '')
  replies.forEach(function (label, index) {
    var answer = el('button', 'dp-reply', label)
    answer.type = 'button'
    answer.addEventListener('click', function (event) {
      // The bubble sits over the pig; a reply must not also count as a pat.
      event.stopPropagation()
      bubble.hidden = true
      if (bubbleTimer !== null) window.clearTimeout(bubbleTimer)
      bubbleTimer = null
      onReply(index)
    })
    row.appendChild(answer)
  })
  bubble.appendChild(row)
  bubble.hidden = false
  bubbleTimer = window.setTimeout(function () {
    bubble.hidden = true
    bubbleTimer = null
  }, 6000)
}

function toast(text) {
  var node = el('div', 'dp-toast', text)
  card.insertBefore(node, card.firstChild)
  window.setTimeout(function () { node.remove() }, 4800)
}
  /** Drop the pending timers — the panel is going away, nothing should fire. */
  function dispose() {
    if (reactTimer !== null) window.clearTimeout(reactTimer)
    if (bubbleTimer !== null) window.clearTimeout(bubbleTimer)
    reactTimer = null
    bubbleTimer = null
  }

  return { react: react, burst: burst, flash: flash, showBubble: showBubble, showLine: showLine, toast: toast, dispose: dispose }
}
