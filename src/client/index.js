/**
 * dsh-piggy · client — the floating pig.
 *
 * Hand-written browser bundle: DSH loads it through `window.__ModuleLoader__`,
 * bundled by esbuild from the modules beside it: raw DOM and `fetch` only, no framework.
 *
 * Layout follows the original QQ 宠物: the pet sits at the top, and a cream icon
 * bar sits directly beneath it. Six icons — 状态 · 学习 · 打工 · 商店 · 旅行 ·
 * 背包 — switch what the area below the bar shows, so nothing ever needs typing.
 *
 * Every value the host sends goes through `normalize()` first. A host/client
 * version mismatch must degrade to sane defaults and an explanation, never to a
 * screen full of `undefined`.
 */

import { renderBagTab } from './tabs/bag.js'
import { renderDevTab } from './tabs/dev.js'
import { renderShopTab } from './tabs/shop.js'
import { renderStatusTab } from './tabs/status.js'
import { renderStudyTab } from './tabs/study.js'
import { renderTravelTab } from './tabs/travel.js'
import { renderWorkTab } from './tabs/work.js'
import { createEffects } from './effects.js'
import { createIo } from './io.js'
import { createLayout } from './layout.js'
import { createPanel } from './panel.js'
import { createScene } from './scene.js'
import { CSS } from './styles.js'
import { ACT_URL, ART_URL, BOX_POKES_TO_OPEN, BOX_POKE_LINES, CARE_LABEL, DEV_TAB, KIND_ORDER, KIND_TITLE, MOUNTED, MODES, NO_ITEM_LINE, OPEN_KEY, PANEL_GAP, PANEL_MARGIN, PANEL_MIN_HEIGHT, PANEL_WIDTH, PET_LINES, PIG_PADDING_X, GREET_DELAY_MS, IDLE_CHAT_MINUTES, POLL_MS, POSITION_KEY, SCENE_RESERVE, STAGES, STATE_URL, TABS } from './constants.js'
import { button, el, meter } from './dom.js'
import { normalize } from './normalize.js'
import { desktopShell } from './desktop-shell.js'
import { readPosition } from './position.js'
import { createDevMode } from './dev-mode.js'
import { readStore, writeStore } from './storage.js'
import { attachUpdateNotice } from './update-notice.js'
import { updatesBridge } from './tabs/update.js'
import { arr, num, obj, str } from './values.js'

/** @type {any} */ (window).__ModuleLoader__.load({
  id: 'dsh-piggy',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var devMode = false

    function apply(ctx) {
      // A client plugin that throws while activating can take the whole web boot
      // down with it, so the pig never lets an exception escape.
      try {
        return mount()
      } catch (error) {
        console.warn('[dsh-piggy] 挂载失败，猪先退到一边', error)
        return () => {}
      }
    }

    function mount() {
      if (document.querySelector('[' + MOUNTED + ']') !== null) {
        console.warn('[dsh-piggy] 已存在实例，跳过重复挂载')
        return () => {}
      }

      // Nunito + Noto Sans SC, per the design system's standalone recipe. The
      // request is non-blocking (`display=swap`) and the token font stack falls
      // back to system faces, so an offline or blocked load degrades quietly
      // instead of breaking the panel.
      var parts = createScene()
      var { font, style, host, card, scene, hud, hudName, hudCoins, hudHealth, bubble, work, prop,
        progressWrap, progressFill, pokeHint, dailyHint, pomoHint, soul, pigArt, pigEmoji, pig, dressSlots, bar, content } = parts

      // 桌面版外壳：用时现取（外壳脚本比 client 先跑，但晚到也不能当网页版 —— 那样拖动
      // 只挪页面里的猪、窗口不跟）。
      var deskShell = desktopShell()
      var savedPos = deskShell === null ? readPosition(readStore(POSITION_KEY)) : null
      // The pig's position as the user set it, before any on-screen clamp.
      var userRight = savedPos === null ? 18 : savedPos.right
      var userBottom = savedPos === null ? 18 : savedPos.bottom
      // 桌面版位置归外壳管（它把猪钉在窗口的锚边上）。这里再写 right/bottom 会和外壳的
      // left/top 一起把 host 拉宽拉高，猪就被挤跑了 —— 实测面板一开猪会漂 207px。
      if (deskShell === null) {
        host.style.right = userRight + 'px'
        host.style.bottom = userBottom + 'px'
      } else {
        host.style.right = 'auto'
        host.style.bottom = 'auto'
      }

      // Keep the pig itself on screen — and nothing more. There used to be a
      // composer-avoidance floor here that forced the widget above the input box:
      // it existed because the wrapper swallowed clicks aimed at the send button.
      // `pointer-events:none` solves that properly now, so the clamp only ever
      // stopped the user from parking their pet where they wanted it.

      /**
       * Place the panel so it is fully on screen, wherever the pig has been
       * parked. The pig itself is never moved by this: the panel is absolutely
       * positioned, so it takes no space in the wrapper's box.
       */

      var icons = {}

      // ---- state ----
      var view = normalize(null)
      // B9: the panel opens on the home screen of app tiles.
      var tab = 'home'
      var stage = 'primary'
      // 用户自己点过学段之后，轮询就不许再替他改（B1 的「默认学段」只在没选过时生效）。
      var stagePicked = false
      // B8: which category each tile tab is opened into (null = the top layer), and a picked tile inside it.
      var drill = { study: null, shop: null, bag: null, work: null, dex: null, pick: null }
      // Which souvenir's story card is open in the travel tab, if any.
      var souvenirPick = null
      // Which care action's item picker is open, if any.
      var picker = null
      // The owner-name draft while it is being edited on the status tab (null = not editing).
      var ownerEdit = null
      // 猪的名字草稿（同上：编辑期间轮询不许重绘，否则输入框会丢焦点）。
      var pigNameEdit = null
      // 居民卡: { field: 'catchphrase'|'motto', draft } while one is being edited.
      var cardEdit = null

      /** The tabs get an explicit context instead of closing over the shell locals. */
      var isOpen = readStore(OPEN_KEY) === 'true'
      var lastStage = null
      var lastPendingAt = 0
      var lastPendingId = 0
      var pollTimer = null
      var fx = createEffects({
        scene: scene, pig: pig, pigArt: pigArt, card: card, bubble: bubble, pomoHint: pomoHint,
        isStopped: function () { return stopped },
      })
      var react = fx.react, burst = fx.burst, flash = fx.flash
      var showBubble = fx.showBubble, showLine = fx.showLine, toast = fx.toast
      var stopped = false
      var busy = false

      /** The shell hands the modules an explicit context instead of sharing a scope. */
      var ctx = {
        host: host,
        card: card,
        content: content,
        scene: scene,
        hud: hud,
        hudName: hudName,
        hudCoins: hudCoins,
        hudHealth: hudHealth,
        bubble: bubble,
        work: work,
        prop: prop,
        progressWrap: progressWrap,
        progressFill: progressFill,
        pokeHint: pokeHint,
        dailyHint: dailyHint,
        pomoHint: pomoHint,
        soul: soul,
        pigArt: pigArt,
        pigEmoji: pigEmoji,
        pig: pig,
        dressSlots: dressSlots,
        bar: bar,
        icons: icons,
        flash: flash,
        react: react,
        burst: burst,
        transform: fx.transform,
        showBubble: showBubble,
        showLine: showLine,
        toast: toast,
        get view() { return view }, set view(next) { view = next },
        get tab() { return tab }, set tab(next) { tab = next },
        get stage() { return stage }, set stage(next) { stage = next },
        get stagePicked() { return stagePicked }, set stagePicked(next) { stagePicked = next },
        get tapVersion() { return dev.tap },
        get devOff() { return function () { dev.set(false) } },
        get drill() { return drill },
        get picker() { return picker }, set picker(next) { picker = next },
        get souvenirPick() { return souvenirPick }, set souvenirPick(next) { souvenirPick = next },
        get ownerEdit() { return ownerEdit }, set ownerEdit(next) { ownerEdit = next },
        get pigNameEdit() { return pigNameEdit }, set pigNameEdit(next) { pigNameEdit = next },
        get cardEdit() { return cardEdit }, set cardEdit(next) { cardEdit = next },
        get isOpen() { return isOpen }, set isOpen(next) { isOpen = next },
        get lastStage() { return lastStage }, set lastStage(next) { lastStage = next },
        get lastPendingAt() { return lastPendingAt }, set lastPendingAt(next) { lastPendingAt = next },
        get lastPendingId() { return lastPendingId }, set lastPendingId(next) { lastPendingId = next },
        get userRight() { return userRight }, set userRight(next) { userRight = next },
        get userBottom() { return userBottom }, set userBottom(next) { userBottom = next },
        get busy() { return busy }, set busy(next) { busy = next },
        justBought: null,
        get stopped() { return stopped }, set stopped(next) { stopped = next },
        get devMode() { return devMode },
      }
      var layout = createLayout(ctx)
      var panel = createPanel(ctx)
      ctx.select = panel.select
      ctx.setOpen = panel.setOpen
      ctx.fitPanel = layout.fitPanel
      ctx.paintBar = layout.paintBar
      ctx.buildIcon = layout.buildIcon
      ctx.clampPig = layout.clampPig
      var render = panel.render, renderContent = panel.renderContent
      var setOpen = panel.setOpen, select = panel.select
      var fitPanel = layout.fitPanel, clampPig = layout.clampPig
      var paintBar = layout.paintBar, buildIcon = layout.buildIcon
      for (var t = 0; t < TABS.length; t += 1) buildIcon(TABS[t])
      var io = createIo(ctx)
      var send = io.send, refresh = io.refresh
      ctx.send = send
      ctx.render = render
      ctx.renderContent = renderContent
      ctx.setOpen = setOpen
      ctx.fitPanel = fitPanel
      ctx.flash = flash

      var updateNotice = attachUpdateNotice(ctx, updatesBridge)

      // 日常气泡（签到/礼包）的点击只在这里绑一次；它压在猪上面，事件不能冒泡给
      // 拖动和摸摸。
      dailyHint.addEventListener('pointerdown', function (event) { event.stopPropagation() })
      dailyHint.addEventListener('click', function (event) {
        event.stopPropagation()
        var action = dailyHint.getAttribute('data-action')
        if (action !== null && action !== '') send(action)
      })

      /**
       * Developer tab. Drives the pig into any state so a change can be looked at
       * immediately instead of waiting days for it — and so the states that are
       * hard to reach by playing (dying, the last illness stage, an elder pig)
       * can be checked at all.
       */

      // ---- drag the pig; right-click it for the menu ----
      var drag = null
      scene.addEventListener('pointerdown', function (event) {
        if (event.button !== 0) return
        drag = {
          x: event.clientX, y: event.clientY,
          lastX: typeof event.screenX === 'number' ? event.screenX : event.clientX,
          lastY: typeof event.screenY === 'number' ? event.screenY : event.clientY,
          startX: typeof event.screenX === 'number' ? event.screenX : event.clientX,
          startY: typeof event.screenY === 'number' ? event.screenY : event.clientY,
          right: parseFloat(getComputedStyle(host).right) || 18,
          bottom: parseFloat(getComputedStyle(host).bottom) || 18,
          moved: false,
        }
        scene.setAttribute('data-dragging', 'true')
        scene.setPointerCapture?.(event.pointerId)
      })
      scene.addEventListener('pointermove', function (event) {
        if (drag === null) return
        var dx = event.clientX - drag.x
        var dy = event.clientY - drag.y
        // 桌面版（D1）：窗口缩在猪身上，拖动＝把窗口按屏幕坐标挪走，页面里不动位置。
        var shellNow = desktopShell()
        if (shellNow !== null) {
          // 窗口自己在动，clientX 是相对窗口的：窗口一挪，下一次增量就算错了。
          // 屏幕坐标不受窗口位置影响（screenX/screenY）。
          var screenX = typeof event.screenX === 'number' ? event.screenX : event.clientX
          var screenY = typeof event.screenY === 'number' ? event.screenY : event.clientY
          if (Math.abs(screenX - drag.startX) > 3 || Math.abs(screenY - drag.startY) > 3) drag.moved = true
          var stepX = screenX - drag.lastX
          var stepY = screenY - drag.lastY
          drag.lastX = screenX
          drag.lastY = screenY
          if (stepX !== 0 || stepY !== 0) shellNow.moveBy(stepX, stepY)
          return
        }
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
        userRight = drag.right - dx
        userBottom = drag.bottom - dy
        clampPig()
        // The panel rides along so it is never left behind off screen.
        fitPanel()
      })
      function endDrag() {
        if (drag === null) return false
        var moved = drag.moved
        drag = null
        scene.removeAttribute('data-dragging')
        clampPig()
        // 桌面版的位置归窗口管（主进程会存），页面不写自己的坐标。
        if (deskShell === null) writeStore(POSITION_KEY, JSON.stringify({ right: userRight, bottom: userBottom }))
        fitPanel()
        return moved
      }
      var boxPokes = 0

      /**
       * Poke the box. Three pokes and the piglet comes out — the count is what
       * makes it feel like something is in there rather than a button that
       * happens to be cardboard-shaped.
       */
      function pokeBox() {
        boxPokes += 1
        react('poke', 560)
        if (boxPokes >= BOX_POKES_TO_OPEN) {
          boxPokes = 0
          host.removeAttribute('data-poke')
          showBubble('哇——！', 1200)
          burst(['✨', '🎉', '💨'], 6)
          send('hatch')
          return
        }
        host.setAttribute('data-poke', String(boxPokes))
        burst(['💨'], 2)
        showBubble(BOX_POKE_LINES[boxPokes - 1], 2200)
      }

      // Left click is a pat on the head. The menu is on the context menu, so a
      // stray click can no longer open or close the panel by accident.
      scene.addEventListener('pointerup', function () {
        if (endDrag()) return
        // An unhatched save is a box, whether or not one exists yet.
        if (view.hatched !== true) {
          pokeBox()
          return
        }
        if (!view.dead) flash('pet')
      })
      scene.addEventListener('pointercancel', function () { endDrag() })
      scene.addEventListener('contextmenu', function (event) {
        event.preventDefault()
        setOpen(!isOpen)
        if (isOpen && view.pig !== null) flash('pet')
      })

      // ---- life ----
      clampPig()
      setOpen(isOpen)
      render(view)
      refresh()
      pollTimer = window.setInterval(refresh, POLL_MS)

      // B6: the pig greets the owner once per page load (the host decides
      // whether it has been away long enough), then speaks up now and then.
      var chatTimer = null
      function scheduleChat() {
        var minutes = IDLE_CHAT_MINUTES.min + Math.random() * (IDLE_CHAT_MINUTES.max - IDLE_CHAT_MINUTES.min)
        chatTimer = window.setTimeout(function () {
          if (!stopped && !busy && view.pig !== null) send('chat', { reason: 'idle' })
          scheduleChat()
        }, minutes * 60000)
      }
      var greetTimer = window.setTimeout(function () {
        if (!stopped && view.pig !== null) send('chat', { reason: 'enter' })
      }, GREET_DELAY_MS)
      scheduleChat()
      // Optional call: minimal test environments stub a window without listeners.
      function onResize() {
        clampPig()
        fitPanel()
      }
      window.addEventListener?.('resize', onResize)

      // ---- developer mode (C1) ----
      // 连点版本号解锁，只在内存里记住：见 dev-mode.js。
      function applyDevMode(next) {
        devMode = next
        host.setAttribute('data-dev', devMode ? 'true' : 'false')
        paintBar()
        if (devMode) {
          setOpen(true)
          select('dev')
          showBubble('🔧 开发者模式已开', 2000)
        } else {
          if (tab === 'dev') select('home')
          showBubble('开发者模式已关', 1600)
        }
      }
      var dev = createDevMode(applyDevMode, function (text, ms) { showBubble(text, ms) })
      devMode = false
      dev.install()

      function dispose() {
        stopped = true
        updateNotice.stop()
        window.removeEventListener?.('resize', onResize)
        // #11: the console handle outlived the pig, so a reload could toggle a
        // panel that had already been disposed.
        dev.dispose()
        if (pollTimer !== null) window.clearInterval(pollTimer)
        if (chatTimer !== null) window.clearTimeout(chatTimer)
        window.clearTimeout(greetTimer)
        fx.dispose()
        pollTimer = null
        host.remove()
        style.remove()
        font.remove()
      }

      return dispose
    }

    exports.name = 'dsh-piggy'
    exports.apply = apply
    return module.exports
  },
})
