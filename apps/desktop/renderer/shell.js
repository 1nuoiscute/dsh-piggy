// @ts-check
/**
 * 桌面版的页面（D1）。
 *
 * 窗口不再铺满屏幕：页面把「猪 + 面板 + 气泡」的**布局外接框**报给主进程，主进程把窗口
 * 调成那个大小再四周留 16px；拖猪的时候页面只把鼠标增量转给主进程（窗口跟着走），
 * 页面自己不动位置。
 *
 * 量框必须用布局盒（offsetLeft/offsetTop/offsetWidth/offsetHeight 累加到 body），
 * 不能用 getBoundingClientRect：呼吸/浮动动画只改 transform，rect 每帧都在抖，
 * Windows 上那会变成每秒一次 SetWindowRgn。
 */
;(function () {
  /** @type {any} */
  var w = window
  var shell = w.piggyShell

  /** 四周留白：和 lib/window-geometry.js 的 WINDOW_PADDING 一致。 */
  var PAD = 16

  /** 取整步长：和 lib/window-geometry.js 的 QUANTIZE_STEP 一致。 */
  var STEP = 4

  /** 猪在窗口里的固定内边距：桌面版位置归窗口管，页面里不再自己挪。 */
  var INSET = 16

  var entry = null
  w.__ModuleLoader__ = { load: function (e) { entry = e } }

  var script = document.createElement('script')
  script.onload = function () {
    if (entry === null) return
    entry.factory(function () { return {} }).apply({})
    start()
  }
  script.src = 'client.js'
  document.head.appendChild(script)

  // ---------------------------------------------------------------------------
  // 量框：只用布局盒
  // ---------------------------------------------------------------------------

  function visible(node) {
    var style = getComputedStyle(node)
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.01
  }

  /** 累加 offsetLeft/offsetTop 得到相对 body 的布局框 —— transform 动画不影响它。 */
  function layoutBox(node) {
    var x = 0
    var y = 0
    var walk = node
    while (walk !== null && walk !== document.body) {
      x += walk.offsetLeft || 0
      y += walk.offsetTop || 0
      walk = walk.offsetParent
    }
    return { x: x, y: y, width: node.offsetWidth || 0, height: node.offsetHeight || 0 }
  }

  /** 每个可见节点取布局框，再合并成一串互不重叠的矩形。 */
  function boxes() {
    var host = document.querySelector('[data-dsh-pig]')
    if (host === null) return { content: null, rects: [] }
    var nodes = [host]
    var all = host.querySelectorAll('*')
    for (var a = 0; a < all.length; a += 1) nodes.push(all[a])

    var rects = []
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i]
      if (node.closest('[hidden]') !== null || !visible(node)) continue
      var box = layoutBox(node)
      if (box.width < 1 || box.height < 1) continue
      rects.push({ x: box.x, y: box.y, r: box.x + box.width, b: box.y + box.height })
    }
    if (rects.length === 0) return { content: null, rects: [] }

    var merged = true
    while (merged) {
      merged = false
      for (var p = 0; p < rects.length && !merged; p += 1) {
        for (var q = p + 1; q < rects.length; q += 1) {
          var one = rects[p]
          var two = rects[q]
          if (one.x <= two.r && two.x <= one.r && one.y <= two.b && two.y <= one.b) {
            rects[p] = { x: Math.min(one.x, two.x), y: Math.min(one.y, two.y), r: Math.max(one.r, two.r), b: Math.max(one.b, two.b) }
            rects.splice(q, 1)
            merged = true
            break
          }
        }
      }
    }

    var left = Infinity
    var top = Infinity
    var right = -Infinity
    var bottom = -Infinity
    for (var m = 0; m < rects.length; m += 1) {
      left = Math.min(left, rects[m].x)
      top = Math.min(top, rects[m].y)
      right = Math.max(right, rects[m].r)
      bottom = Math.max(bottom, rects[m].b)
    }
    var content = { x: left - PAD, y: top - PAD, width: right - left + PAD * 2, height: bottom - top + PAD * 2 }
    // 窗口坐标下的可点区域（内容框左上角是窗口原点）。
    var shape = rects.map(function (r) {
      return {
        x: Math.round((r.x - content.x) / STEP) * STEP,
        y: Math.round((r.y - content.y) / STEP) * STEP,
        width: Math.round((r.r - r.x) / STEP) * STEP,
        height: Math.round((r.b - r.y) / STEP) * STEP,
      }
    })
    return { content: content, shape: shape }
  }

  function keyOf(content, shape) {
    var parts = [content.width, content.height]
    for (var i = 0; i < shape.length; i += 1) parts.push(shape[i].x, shape[i].y, shape[i].width, shape[i].height)
    // 4px 一档：动画抖几像素不会换 key。
    return parts.map(function (n) { return Math.floor(n / STEP) }).join(',')
  }

  // ---------------------------------------------------------------------------
  // 上报：内容框变了才说
  // ---------------------------------------------------------------------------

  var lastKey = null

  function tick() {
    var next = boxes()
    if (next.content === null) return
    var key = keyOf(next.content, next.shape)
    if (key === lastKey) return
    lastKey = key
    shell.setContent({ width: next.content.width, height: next.content.height, shape: next.shape })
  }

  // ---------------------------------------------------------------------------
  // 拖动：窗口跟着鼠标走（屏幕坐标），页面里不动
  // ---------------------------------------------------------------------------

  function moveChannel() {
    var dragging = false
    var lastX = 0
    var lastY = 0
    window.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return
      dragging = true
      lastX = event.clientX
      lastY = event.clientY
    })
    window.addEventListener('pointermove', function (event) {
      if (!dragging) return
      var dx = event.clientX - lastX
      var dy = event.clientY - lastY
      if (dx === 0 && dy === 0) return
      lastX = event.clientX
      lastY = event.clientY
      shell.moveBy(dx, dy)
    })
    window.addEventListener('pointerup', function () { dragging = false })
    window.addEventListener('pointercancel', function () { dragging = false })
  }

  // ---------------------------------------------------------------------------
  // 给页面里的猪算「屏幕上还有多少地方」：面板要朝屏幕里侧开
  // ---------------------------------------------------------------------------

  function start() {
    var host = /** @type {any} */ (document.querySelector('[data-dsh-pig]'))
    if (host !== null) {
      host.style.right = INSET + 'px'
      host.style.bottom = INSET + 'px'
    }
    w.__dshPiggyShell = {
      /** 猪在屏幕上的位置与可用空间：页面里的布局按这个算面板朝哪边开。 */
      room: function () {
        var info = shell.geometry ? shell.geometry() : null
        if (info === null) return null
        var scene = document.querySelector('[data-dsh-pig] .dp-scene')
        var sceneBox = scene === null ? { height: 0 } : layoutBox(scene)
        var pigBottom = info.window.y + info.window.height - INSET
        return {
          above: Math.round(pigBottom - sceneBox.height - info.workArea.y),
          below: Math.round(info.workArea.y + info.workArea.height - pigBottom),
          width: info.workArea.width,
          height: info.workArea.height,
        }
      },
      moveBy: function (dx, dy) { shell.moveBy(dx, dy) },
    }
    moveChannel()
    setInterval(tick, 120)
    window.addEventListener('pointermove', tick)
    window.addEventListener('pointerup', tick)
    tick()
  }
})()
