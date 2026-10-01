// @ts-check
/**
 * 桌面版的页面：跟 DSH 网页里一样挂上 client.js（同 tools/preview.html 的做法），
 * 窗口铺满整个工作区、透明；再不停算出猪、面板、气泡占了哪些地方，告诉主进程
 * 只把这些地方当成窗口，其余地方的点击直接落到桌面上。
 */
;(function () {
  /** @type {any} */
  var w = window
  var entry = null
  w.__ModuleLoader__ = { load: function (e) { entry = e } }

  var script = document.createElement('script')
  script.src = 'client.js'
  script.onload = function () {
    if (entry === null) return
    entry.factory(function () { return {} }).apply({})
    trackShape()
  }
  document.head.appendChild(script)

  /** Padding around each box, so bounces and shadows are not cut off. */
  var PAD = 8

  function visible(node) {
    var style = getComputedStyle(node)
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.01
  }

  /** Every visible box under the pig's root, merged into as few rectangles as possible. */
  function boxes() {
    var host = document.querySelector('[data-dsh-pig]')
    if (host === null) return []
    var rects = []
    var nodes = [host].concat(Array.prototype.slice.call(host.querySelectorAll('*')))
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i]
      if (node.closest('[hidden]') !== null || !visible(node)) continue
      var r = node.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      rects.push({ x: r.left - PAD, y: r.top - PAD, r: r.right + PAD, b: r.bottom + PAD })
    }
    // Merge overlapping boxes until nothing overlaps.
    var merged = true
    while (merged) {
      merged = false
      for (var a = 0; a < rects.length && !merged; a += 1) {
        for (var b = a + 1; b < rects.length; b += 1) {
          var p = rects[a], q = rects[b]
          if (p.x <= q.r && q.x <= p.r && p.y <= q.b && q.y <= p.b) {
            rects[a] = { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), r: Math.max(p.r, q.r), b: Math.max(p.b, q.b) }
            rects.splice(b, 1)
            merged = true
            break
          }
        }
      }
    }
    return rects.map(function (r) {
      var x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y))
      return { x: x, y: y, width: Math.ceil(r.r) - x, height: Math.ceil(r.b) - y }
    })
  }

  function trackShape() {
    var last = ''
    function tick() {
      var rects = boxes()
      var key = JSON.stringify(rects)
      if (key !== last) {
        last = key
        w.piggyShell.setShape(rects)
      }
    }
    // Cheap enough at a few frames a second; pointer moves (dragging) get it at once.
    setInterval(tick, 120)
    window.addEventListener('pointermove', tick)
    window.addEventListener('pointerup', tick)
    tick()
  }
})()
