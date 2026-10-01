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

  // 先把外壳挂上：client.js 在挂载那一刻（apply 里）就会读 __dshPiggyShell，
  // 晚一步它就把桌面版当网页版 —— 拖动只挪页面里的猪、窗口不跟。几何还没到时
  // room() 返回 null，页面会先用自己那套算，等几何到了再改。
  // 几何（窗口位置 + 工作区）靠主进程推过来：不订阅的话 room() 永远是 null，
  // 桌面版的分支就跑不到（面板会按小窗口的 innerWidth 乱开）。
  if (typeof shell.onGeometry === 'function') shell.onGeometry(function () {})
  if (typeof shell.askGeometry === 'function') shell.askGeometry()

  w.__dshPiggyShell = {
    /** 猪在屏幕上的位置与可用空间：页面里的布局按这个算面板朝哪边开。 */
    room: function () {
      var info = shell.geometry ? shell.geometry() : null
      if (info === null) return null
      var host = /** @type {any} */ (document.querySelector('[data-dsh-pig]'))
      var pigNode = host === null || host.querySelector === undefined ? null : host.querySelector('.dp-pig')
      if (pigNode === null) return null
      var pigBox = layoutBox(pigNode)
      // 猪在屏幕上的矩形（窗口原点 + 猪在窗口里的位置）
      var pig = {
        left: info.window.x + pigBox.x,
        top: info.window.y + pigBox.y,
        right: info.window.x + pigBox.x + pigBox.width,
        bottom: info.window.y + pigBox.y + pigBox.height,
      }
      return {
        above: Math.round(pig.top - info.workArea.y),
        below: Math.round(info.workArea.y + info.workArea.height - pig.bottom),
        left: Math.round(pig.left - info.workArea.x),
        right: Math.round(info.workArea.x + info.workArea.width - pig.right),
        width: info.workArea.width,
        height: info.workArea.height,
      }
    },
    moveBy: function (dx, dy) { shell.moveBy(dx, dy) },
  }

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
    while (walk !== null && walk !== undefined && walk !== document.body) {
      x += walk.offsetLeft || 0
      y += walk.offsetTop || 0
      walk = walk.offsetParent
    }
    return { x: x, y: y, width: node.offsetWidth || 0, height: node.offsetHeight || 0 }
  }

  /** 每个可见节点取布局框，再合并成一串互不重叠的矩形。猪的位置也一起报上去。 */
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

    var hostBox = layoutBox(host)
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
    // 猪在内容框里的位置（含尺寸）：主进程靠它把窗口挪成「猪在屏幕上一像素都不动」，
    // 钉边也靠它判断面板开在哪一侧。用 host.querySelector，不用后代选择器。
    var pigNode = host.querySelector === undefined ? null : host.querySelector('.dp-pig')
    var pigBox = pigNode === null ? { x: 0, y: 0, width: 0, height: 0 } : layoutBox(pigNode)
    var pig = { x: pigBox.x - content.x, y: pigBox.y - content.y, width: pigBox.width, height: pigBox.height }
    // 可点区域直接用页面坐标（页面原点就是窗口原点）。左上向下取整、右下向上取整，
    // 再各放宽 1px：以前按内容框原点换算再四舍五入到 4px，相邻两块之间会漏出一道缝，
    // 透出窗口后面的东西（用户看到的「黑条」），面板右边也会被切掉几像素。
    var shape = rects.map(function (r) {
      var x = Math.max(0, Math.floor(r.x) - 1)
      var y = Math.max(0, Math.floor(r.y) - 1)
      return { x: x, y: y, width: Math.ceil(r.r) + 1 - x, height: Math.ceil(r.b) + 1 - y }
    })
    var contentBox = { left: left, top: top, right: right, bottom: bottom }
    return { content: content, shape: shape, pig: pig, hostBox: hostBox, pigBox: pigBox, contentBox: contentBox }
  }

  /** 上一次写过的样式，避免每帧都改。 */
  var pinned = ''
  /** 当前锚边：面板收起（内容对称）时保持不变。 */
  var lastVertical = 'bottom'
  var lastHorizontal = 'right'

  /**
   * 让**整块内容**（猪、面板、HUD、气泡）离窗口的锚边正好 PAD。
   *
   * 以前钉的是猪：面板朝下开时 HUD 在猪上面，猪离顶边 16px，HUD 就伸到窗口外面去了。
   * 现在按内容外接框反推 host 的内边距；猪在屏幕上不动由主进程的两步补正保证。
   * 一次就收敛：下一帧量到的内容边正好在 PAD。
   */
  function pinPig(vertical, horizontal, hostBox, contentBox) {
    var host = /** @type {any} */ (document.querySelector('[data-dsh-pig]'))
    if (host === null) return
    var want = {}
    if (horizontal === 'left') {
      want.left = Math.round(hostBox.x - contentBox.left + PAD) + 'px'
      want.right = 'auto'
    } else {
      want.right = Math.round(contentBox.right - hostBox.x - hostBox.width + PAD) + 'px'
      want.left = 'auto'
    }
    if (vertical === 'top') {
      want.top = Math.round(hostBox.y - contentBox.top + PAD) + 'px'
      want.bottom = 'auto'
    } else {
      want.bottom = Math.round(contentBox.bottom - hostBox.y - hostBox.height + PAD) + 'px'
      want.top = 'auto'
    }
    var key = [vertical, horizontal, want.left, want.right, want.top, want.bottom].join('|')
    if (key === pinned) return
    pinned = key
    host.style.left = want.left
    host.style.right = want.right
    host.style.top = want.top
    host.style.bottom = want.bottom
  }

  /**
   * 面板在猪的哪一侧 → 猪该钉哪两条边。
   *
   * 直接看面板（.dp-card）相对猪的位置，不能看内容框对称性：宿主本来就比猪高（HUD 那几
   * 像素），收起时会被误判成「面板在下面」，一开除就翻锚点、窗口带着猪跳。
   * 面板收起时保持上一次的锚边（首次是右下角）。
   */
  function sides(host) {
    var card = host.querySelector === undefined ? null : /** @type {any} */ (host.querySelector('.dp-card'))
    var pigNode = host.querySelector === undefined ? null : /** @type {any} */ (host.querySelector('.dp-pig'))
    if (card === null || pigNode === null || card.hidden === true) return { vertical: lastVertical, horizontal: lastHorizontal }
    var cardBox = layoutBox(card)
    var pigBox = layoutBox(pigNode)
    if (cardBox.width < 1 || cardBox.height < 1) return { vertical: lastVertical, horizontal: lastHorizontal }
    // 面板在猪上方 → 猪贴窗口底边；在下方 → 贴顶边。横向同理。
    // 比中心而不是比边：面板比猪宽得多，可能和猪的范围重叠。
    var pigCenterY = pigBox.y + pigBox.height / 2
    var cardCenterY = cardBox.y + cardBox.height / 2
    var pigCenterX = pigBox.x + pigBox.width / 2
    var cardCenterX = cardBox.x + cardBox.width / 2
    lastVertical = cardCenterY < pigCenterY ? 'bottom' : 'top'
    lastHorizontal = cardCenterX < pigCenterX ? 'right' : 'left'
    return { vertical: lastVertical, horizontal: lastHorizontal }
  }

  function keyOf(content, shape, pig, pigBox) {
    // 猪在内容框里的位置也算进去：面板从上方翻到下方时尺寸可能没变，
    // 但锚点换边了，主进程必须知道。
    // 内容和猪在内容框里的位置按 4px 一档（动画抖动不算变化）；猪在**窗口坐标**里的
    // 位置按 1px 一档 —— 主进程补平移之后要靠这次重报验证，粗了会漏掉 4px 以内的补正。
    var parts = [Math.floor(content.width / STEP), Math.floor(content.height / STEP),
      Math.floor(pig.x / STEP), Math.floor(pig.y / STEP),
      Math.floor(pigBox.x), Math.floor(pigBox.y)]
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
    var host = /** @type {any} */ (document.querySelector('[data-dsh-pig]'))
    var side = sides(host)
    pinPig(side.vertical, side.horizontal, next.hostBox, next.contentBox)
    var key = keyOf(next.content, next.shape, next.pig, next.pigBox)
    if (key === lastKey) return
    lastKey = key
    shell.setContent({
      width: next.content.width,
      height: next.content.height,
      pig: next.pig,
      pigWindow: { x: next.pigBox.x, y: next.pigBox.y },
      anchor: side,
      shape: next.shape,
    })
  }

  // ---------------------------------------------------------------------------
  // 给页面里的猪算「屏幕上还有多少地方」：面板要朝屏幕里侧开
  // ---------------------------------------------------------------------------

  function start() {
    setInterval(tick, 120)
    window.addEventListener('pointermove', tick)
    window.addEventListener('pointerup', tick)
    tick()
  }
})()
