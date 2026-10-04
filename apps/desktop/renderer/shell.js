// @ts-check
/**
 * 桌面版的页面（D1）。
 *
 * 窗口不再铺满屏幕：页面把「猪 + 面板 + 气泡」的**布局外接框**报给主进程，主进程把窗口
 * 调成那个大小再四周留 16px；拖猪的时候主进程按固定起点读取鼠标位置，
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

  /**
   * 收起时在猪头上方预留的气泡区（宽 = 气泡最大宽度，高 = 两行气泡 + 礼包/番茄钟角标）。
   * Windows 上透明窗口每改一次大小，会有一帧按旧位置画内容 —— 摸猪冒气泡、气泡消失
   * 各改一次窗口，看起来就是「猪在闪」。把这块区域一直算进窗口，冒气泡只改可点区域。
   * macOS 没有 setShape，透明区域会挡住桌面点击，所以不预留。
   */
  var BUBBLE_ZONE = { width: 272, height: 104 }

  /**
   * 面板打开时整块内容（面板 + 名牌 + 猪）相对猪的外框，按面板朝向和猪的大小记在本机。
   * 收起时窗口仍按这个外框留位置：开、关面板只改可点区域，窗口一像素不动 ——
   * Windows 上透明窗口每改一次大小都可能闪一下白底（用户 2026-10-04「右键猪出现白底」）。
   * 只有第一次打开、或者面板换了朝向/猪换了大小时，才会改一次窗口。
   */
  var OPEN_BOX_KEY = 'dsh-piggy:desktop-open-box'
  var openBoxes = {}
  try { openBoxes = JSON.parse(localStorage.getItem(OPEN_BOX_KEY) || '{}') || {} } catch (e) { openBoxes = {} }
  function openBoxKey(pigBox) { return lastVertical + '|' + lastHorizontal + '|' + Math.round(pigBox.width) }

  /** 可点/可见区域四周放宽几像素：礼包上下浮动、猪摇摆会越出布局盒一点，别被切平。 */
  var SHAPE_SLACK = 6

  // 先把外壳挂上：client.js 在挂载那一刻（apply 里）就会读 __dshPiggyShell，
  // 晚一步它就把桌面版当网页版 —— 拖动只挪页面里的猪、窗口不跟。几何还没到时
  // room() 返回 null，页面会先用自己那套算，等几何到了再改。
  // 几何（窗口位置 + 工作区）靠主进程推过来：不订阅的话 room() 永远是 null，
  // 桌面版的分支就跑不到（面板会按小窗口的 innerWidth 乱开）。
  if (typeof shell.onGeometry === 'function') shell.onGeometry(function () {})
  if (typeof shell.askGeometry === 'function') shell.askGeometry()

  var closedRoom = null
  w.__dshPiggyShell = {
    /** 猪在屏幕上的位置与可用空间：页面里的布局按这个算面板朝哪边开。 */
    room: function () {
      var host = /** @type {any} */ (document.querySelector('[data-dsh-pig]'))
      if (host !== null && host.getAttribute('data-open') === 'true' && closedRoom !== null) return closedRoom
      var info = shell.geometry ? shell.geometry() : null
      if (info === null) return null
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
      var result = {
        above: Math.round(pig.top - info.workArea.y),
        below: Math.round(info.workArea.y + info.workArea.height - pig.bottom),
        left: Math.round(pig.left - info.workArea.x),
        right: Math.round(info.workArea.x + info.workArea.width - pig.right),
        width: info.workArea.width,
        height: info.workArea.height,
      }
      if (host.getAttribute('data-open') === 'false') closedRoom = result
      return result
    },
    refreshRoom: function () { closedRoom = null },
    beginDrag: function () { shell.beginDrag() },
    /** 旧游戏包（0.27.2 及以前）只认 moveBy：回退到旧版本时拖动照样能用。 */
    moveBy: function (dx, dy) { if (typeof shell.moveBy === 'function') shell.moveBy(dx, dy) },
    dragHeartbeat: function () { shell.dragHeartbeat?.() },
    endDrag: function () { shell.endDrag() },
    syncGeometry: function () { tick(true) },
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
    // 面板（.dp-card）自己裁掉溢出的内容，所以只量面板本身，不进去量几百个子节点 ——
    // 以前每 120ms、每次鼠标移动都把面板里每个节点 getComputedStyle 一遍，面板一长就卡。
    var nodes = [host]
    var all = host.querySelectorAll('*')
    for (var a = 0; a < all.length; a += 1) {
      var candidate = all[a]
      var inCard = candidate.closest('.dp-card')
      if ((inCard !== null && inCard !== candidate) || candidate.closest('.dp-fx') !== null) continue
      nodes.push(candidate)
    }
    var geometry = shell.geometry ? shell.geometry() : null

    var rects = []
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i]
      // Short-lived sparkle particles can fly outside the pig. Letting them
      // define the native window width makes the compositor push the pig away
      // from a screen edge when a panel closes.
      if (node.closest('[hidden]') !== null || !visible(node)) continue
      var bubble = node.closest('.dp-bubble')
      // At the top edge there is physically no room to show a bubble above the
      // pig. Do not enlarge/reposition the native window to rescue that bubble;
      // it would move the pig even though the panel itself fits below.
      if (bubble !== null && geometry !== null
        && geometry.window.y + layoutBox(bubble).y < geometry.workArea.y) continue
      var box = layoutBox(node)
      if (box.width < 1 || box.height < 1) continue
      rects.push({ x: box.x, y: box.y, r: box.x + box.width, b: box.y + box.height })
    }
    if (rects.length === 0) return { content: null, rects: [] }

    var hostBox = layoutBox(host)
    var pigNode = host.querySelector === undefined ? null : host.querySelector('.dp-pig')
    var pigBox = pigNode === null ? { x: 0, y: 0, width: 0, height: 0 } : layoutBox(pigNode)
    // 收起时的气泡预留区：只进窗口外框，不进可点区域。
    var zone = null
    if (shell.platform !== 'darwin' && host.getAttribute('data-open') === 'false' && pigNode !== null) {
      var zoneLeft = host.getAttribute('data-panel-side') === 'right'
        ? hostBox.x : hostBox.x + hostBox.width - BUBBLE_ZONE.width
      zone = { x: zoneLeft, y: pigBox.y - BUBBLE_ZONE.height, r: zoneLeft + BUBBLE_ZONE.width, b: pigBox.y }
    }
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
    // 面板打开时按它的最高高度（max-height）留位置：切到内容少的 App 面板会变矮，
    // 但窗口不跟着缩，下次切回来也不用再长 —— 只改可点区域。
    var card = host.querySelector === undefined ? null : /** @type {any} */ (host.querySelector('.dp-card'))
    if (shell.platform !== 'darwin' && card !== null && card.hidden !== true && host.getAttribute('data-open') === 'true') {
      var cardBox = layoutBox(card)
      var maxHeight = parseFloat(card.style.maxHeight) || 0
      if (maxHeight > cardBox.height && cardBox.width > 0) {
        var opensBelow = cardBox.y > pigBox.y
        zone = opensBelow
          ? { x: cardBox.x, y: cardBox.y, r: cardBox.x + cardBox.width, b: cardBox.y + maxHeight }
          : { x: cardBox.x, y: cardBox.y + cardBox.height - maxHeight, r: cardBox.x + cardBox.width, b: cardBox.y + cardBox.height }
      }
    }
    var outline = zone === null ? rects : rects.concat([zone])
    if (shell.platform !== 'darwin' && pigNode !== null) {
      var keyNow = openBoxKey(pigBox)
      if (host.getAttribute('data-open') === 'true' && card !== null && card.hidden !== true) {
        // 记下打开时的外框（相对猪）。
        var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
        for (var o = 0; o < outline.length; o += 1) {
          l = Math.min(l, outline[o].x); t = Math.min(t, outline[o].y)
          r = Math.max(r, outline[o].r); b = Math.max(b, outline[o].b)
        }
        var rel = { l: Math.round(l - pigBox.x), t: Math.round(t - pigBox.y), r: Math.round(r - pigBox.x), b: Math.round(b - pigBox.y) }
        var old = openBoxes[keyNow]
        if (old === undefined || old.l !== rel.l || old.t !== rel.t || old.r !== rel.r || old.b !== rel.b) {
          openBoxes[keyNow] = rel
          try { localStorage.setItem(OPEN_BOX_KEY, JSON.stringify(openBoxes)) } catch (e) { /* 存不下就每次启动重新量 */ }
        }
      } else if (openBoxes[keyNow] !== undefined) {
        // 收起：按打开时的外框留位置。
        var saved = openBoxes[keyNow]
        outline = outline.concat([{ x: pigBox.x + saved.l, y: pigBox.y + saved.t, r: pigBox.x + saved.r, b: pigBox.y + saved.b }])
      }
    }
    for (var m = 0; m < outline.length; m += 1) {
      left = Math.min(left, outline[m].x)
      top = Math.min(top, outline[m].y)
      right = Math.max(right, outline[m].r)
      bottom = Math.max(bottom, outline[m].b)
    }
    // 尺寸按 4px 向上取整：面板高度带小数时，换个 App 会差 1px，Windows 上那也是一次改窗口。
    var content = { x: left - PAD, y: top - PAD,
      width: Math.ceil((right - left + PAD * 2) / STEP) * STEP, height: Math.ceil((bottom - top + PAD * 2) / STEP) * STEP }
    // 猪在内容框里的位置（含尺寸）：主进程靠它把窗口挪成「猪在屏幕上一像素都不动」，
    // 钉边也靠它判断面板开在哪一侧。用 host.querySelector，不用后代选择器。
    var pig = { x: pigBox.x - content.x, y: pigBox.y - content.y, width: pigBox.width, height: pigBox.height }
    // 可点区域直接用页面坐标（页面原点就是窗口原点）。左上向下取整、右下向上取整，
    // 再各放宽 1px：以前按内容框原点换算再四舍五入到 4px，相邻两块之间会漏出一道缝，
    // 透出窗口后面的东西（用户看到的「黑条」），面板右边也会被切掉几像素。
    var shape = rects.map(function (r) {
      var x = Math.max(0, Math.floor(r.x) - SHAPE_SLACK)
      var y = Math.max(0, Math.floor(r.y) - SHAPE_SLACK)
      return { x: x, y: y, width: Math.ceil(r.r) + SHAPE_SLACK - x, height: Math.ceil(r.b) + SHAPE_SLACK - y }
    })
    // 摸猪、喂食冒出的爱心等粒子会从猪头往上飘约 56px：飘的时候把这块也加进可见区域，
    // 不然粒子飞出可点区域就被切掉一半，看起来一闪一闪的。只改可点区域，不改窗口大小。
    if (pigNode !== null && host.querySelector !== undefined && host.querySelector('.dp-fx') !== null) {
      var fx = { x: Math.max(0, Math.floor(pigBox.x - 36)), y: Math.max(0, Math.floor(pigBox.y - 84)) }
      shape.push({ x: fx.x, y: fx.y, width: Math.ceil(pigBox.x + pigBox.width + 36) - fx.x, height: Math.ceil(pigBox.y + 12) - fx.y })
    }
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
    return parts.slice(0, 4).concat(parts.slice(4, 6),
      parts.slice(6).map(function (n) { return Math.floor(n / STEP) })).join(',')
  }

  // ---------------------------------------------------------------------------
  // 上报：内容框变了才说
  // ---------------------------------------------------------------------------

  var lastKey = null

  /** 最近一次量出来的可见/可点矩形（窗口坐标），Windows 穿透模式按它判断鼠标在不在内容上。 */
  var hitRects = []
  var lastHit = null
  var mouseX = -1
  var mouseY = -1
  function updateHit(x, y) {
    mouseX = x
    mouseY = y
    if (typeof shell.setHit !== 'function') return
    var inside = dragging()
    for (var i = 0; !inside && i < hitRects.length; i += 1) {
      var r = hitRects[i]
      inside = x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height
    }
    if (inside === lastHit) return
    lastHit = inside
    shell.setHit(inside)
  }
  if (typeof document.addEventListener === 'function') document.addEventListener('mousemove', function (event) { updateHit(event.clientX, event.clientY) }, true)
  var root = /** @type {any} */ (document.documentElement)
  if (root && typeof root.addEventListener === 'function') root.addEventListener('mouseleave', function () {
    if (dragging()) return
    mouseX = -1
    mouseY = -1
    lastHit = false
    if (typeof shell.setHit === 'function') shell.setHit(false)
  })

  function tick(immediate) {
    var next = boxes()
    if (next.content === null) return
    var host = /** @type {any} */ (document.querySelector('[data-dsh-pig]'))
    var side = sides(host)
    pinPig(side.vertical, side.horizontal, next.hostBox, next.contentBox)
    // pinPig writes CSS position. Measure again in this same turn so the main
    // process receives the pig's final window-local position before resizing.
    next = boxes()
    if (next.content === null) return
    var windowInfo = shell.geometry ? shell.geometry() : null
    var oldWidth = Number(windowInfo?.window?.width) || next.content.width
    var oldHeight = Number(windowInfo?.window?.height) || next.content.height
    // A right/bottom-pinned pig moves inside the window as it grows. Send its
    // post-resize local coordinate now, instead of waiting 120ms to measure it.
    var futurePigX = next.pigBox.x + (side.horizontal === 'right' ? next.content.width - oldWidth : 0)
    var futurePigY = next.pigBox.y + (side.vertical === 'bottom' ? next.content.height - oldHeight : 0)
    hitRects = next.shape
    // 内容变了（比如面板收起）而鼠标没动：按最后的鼠标位置重新判断，免得透明处还挡着点击。
    if (mouseX >= 0) updateHit(mouseX, mouseY)
    var key = keyOf(next.content, next.shape, next.pig, next.pigBox)
    if (key === lastKey) return
    lastKey = key
    shell.setContent({
      width: next.content.width,
      height: next.content.height,
      pig: next.pig,
      pigWindow: { x: futurePigX, y: futurePigY },
      // 猪**现在**在窗口里的位置（还没按新内容改窗口）。主进程第一次收到上报时只能靠它
      // 算猪在屏幕上的原位 —— 拿上面那个「改完窗口后」的预测值去算，启动时面板开着
      // 猪就会被挪走（上次退出时面板没关的话，猪会跑到屏幕外）。
      pigNow: { x: next.pigBox.x, y: next.pigBox.y },
      panelOpen: host.getAttribute('data-open') === 'true',
      anchor: side,
      shape: next.shape,
    }, immediate === true)
  }

  // ---------------------------------------------------------------------------
  // 给页面里的猪算「屏幕上还有多少地方」：面板要朝屏幕里侧开
  // ---------------------------------------------------------------------------

  // 只在内容真的变了时量：DOM 变了（MutationObserver）、窗口改了大小、松手。
  // 以前是每 120ms 一次 + 每次鼠标移动一次，Windows 上「一卡一卡」的主要来源之一。
  // 拖动中不量：拖动只挪窗口，内容不变。另留 1 秒一次的兜底。
  var scheduled = false
  function dragging() {
    var scene = document.querySelector('[data-dsh-pig] .dp-scene')
    return scene !== null && scene.getAttribute('data-dragging') === 'true'
  }
  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(function () {
      scheduled = false
      if (!dragging()) tick()
    })
  }

  // 桌面版不用系统原生的 title 小提示框：Windows 上透明置顶窗口里的原生提示会画坏
  // （用户 2026-10-05「点礼物后弹窗显示异常」）。鼠标移上去时把 title 改成 aria-label。
  if (typeof document.addEventListener === 'function') document.addEventListener('mouseover', function (event) {
    var target = /** @type {any} */ (event.target)
    var titled = target !== null && typeof target.closest === 'function' ? target.closest('[title]') : null
    if (titled === null) return
    if (!titled.getAttribute('aria-label')) titled.setAttribute('aria-label', titled.getAttribute('title'))
    titled.removeAttribute('title')
  }, true)

  function start() {
    var host = document.querySelector('[data-dsh-pig]')
    if (host !== null && typeof MutationObserver === 'function') {
      new MutationObserver(schedule).observe(host, { subtree: true, childList: true, attributes: true, characterData: true })
    }
    window.addEventListener('resize', schedule)
    window.addEventListener('pointerup', schedule)
    setInterval(function () { if (!dragging()) tick() }, 1000)
    tick()
  }
})()
