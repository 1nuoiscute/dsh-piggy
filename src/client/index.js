/**
 * dsh-pig · client — the floating pig.
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
import { ACT_URL, ART_URL, BOX_POKES_TO_OPEN, BOX_POKE_LINES, CARE_LABEL, DEV_KEY, DEV_TAB, KIND_ORDER, KIND_TITLE, MOUNTED, MODES, NO_ITEM_LINE, OPEN_KEY, PANEL_GAP, PANEL_MARGIN, PANEL_MIN_HEIGHT, PANEL_WIDTH, PET_LINES, PIG_PADDING_X, GREET_DELAY_MS, IDLE_CHAT_MINUTES, POLL_MS, POSITION_KEY, SCENE_RESERVE, STAGES, STATE_URL, TABS } from './constants.js'
import { button, el, meter } from './dom.js'
import { normalize } from './normalize.js'
import { readStore, writeStore } from './storage.js'
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
        console.warn('[dsh-pig] 挂载失败，猪先退到一边', error)
        return () => {}
      }
    }

    function mount() {
      if (document.querySelector('[' + MOUNTED + ']') !== null) {
        console.warn('[dsh-pig] 已存在实例，跳过重复挂载')
        return () => {}
      }

      // Nunito + Noto Sans SC, per the design system's standalone recipe. The
      // request is non-blocking (`display=swap`) and the token font stack falls
      // back to system faces, so an offline or blocked load degrades quietly
      // instead of breaking the panel.
      var parts = createScene()
      var { font, style, host, card, scene, hud, hudName, hudCoins, hudHealth, bubble, work, prop,
        progressWrap, progressFill, pokeHint, dailyHint, soul, pigArt, pigEmoji, pig, dressSlots, bar, content } = parts

      var savedPos = readStore(POSITION_KEY)
      // The pig's position as the user set it, before any on-screen clamp.
      var userRight = 18
      var userBottom = 18
      if (savedPos !== null) {
        try {
          var parsed = JSON.parse(savedPos)
          if (parsed && typeof parsed.right === 'number') userRight = parsed.right
          if (parsed && typeof parsed.bottom === 'number') userBottom = parsed.bottom
        } catch (error) { /* ignore */ }
      }
      host.style.right = userRight + 'px'
      host.style.bottom = userBottom + 'px'

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

      /** The tabs on show right now: the normal six, plus 调试 when dev mode is on. */

      /** Rebuild the icon bar. Called whenever dev mode flips. */

      // ---- state ----
      var view = normalize(null)
      var tab = 'status'
      var stage = 'primary'
      // 用户自己点过学段之后，轮询就不许再替他改（B1 的「默认学段」只在没选过时生效）。
      var stagePicked = false
      // Which souvenir's story card is open in the travel tab, if any.
      var souvenirPick = null
      // Which care action's item picker is open, if any.
      var picker = null
      // The owner-name draft while it is being edited on the status tab (null = not editing).
      var ownerEdit = null
      // 猪的名字草稿（同上：编辑期间轮询不许重绘，否则输入框会丢焦点）。
      var pigNameEdit = null
      // Work tab: which skill's jobs are shown, and whose 详情 is open.
      var workTrait = 'strong'
      var jobDetail = null

      /** The tabs get an explicit context instead of closing over the shell locals. */
      var isOpen = readStore(OPEN_KEY) === 'true'
      var lastStage = null
      var lastPendingAt = 0
      var lastPendingId = 0
      var pollTimer = null
      var fx = createEffects({
        scene: scene, pig: pig, card: card, bubble: bubble,
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
        showBubble: showBubble,
        showLine: showLine,
        toast: toast,
        get view() { return view }, set view(next) { view = next },
        get tab() { return tab }, set tab(next) { tab = next },
        get stage() { return stage }, set stage(next) { stage = next },
        get stagePicked() { return stagePicked }, set stagePicked(next) { stagePicked = next },
        get picker() { return picker }, set picker(next) { picker = next },
        get souvenirPick() { return souvenirPick }, set souvenirPick(next) { souvenirPick = next },
        get ownerEdit() { return ownerEdit }, set ownerEdit(next) { ownerEdit = next },
        get pigNameEdit() { return pigNameEdit }, set pigNameEdit(next) { pigNameEdit = next },
        get workTrait() { return workTrait }, set workTrait(next) { workTrait = next },
        get jobDetail() { return jobDetail }, set jobDetail(next) { jobDetail = next },
        get isOpen() { return isOpen }, set isOpen(next) { isOpen = next },
        get lastStage() { return lastStage }, set lastStage(next) { lastStage = next },
        get lastPendingAt() { return lastPendingAt }, set lastPendingAt(next) { lastPendingAt = next },
        get lastPendingId() { return lastPendingId }, set lastPendingId(next) { lastPendingId = next },
        get userRight() { return userRight }, set userRight(next) { userRight = next },
        get userBottom() { return userBottom }, set userBottom(next) { userBottom = next },
        get busy() { return busy }, set busy(next) { busy = next },
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
      // `ui` was built before these existed; point it at the real ones now.
      var io = createIo(ctx)
      var send = io.send, refresh = io.refresh
      ctx.send = send
      ctx.render = render
      ctx.renderContent = renderContent
      ctx.send = send
      ctx.renderContent = renderContent
      ctx.setOpen = setOpen
      ctx.fitPanel = fitPanel
      ctx.flash = flash

      // 日常气泡（签到/礼包）的点击只在这里绑一次；它压在猪上面，事件不能冒泡给
      // 拖动和摸摸。
      dailyHint.addEventListener('pointerdown', function (event) { event.stopPropagation() })
      dailyHint.addEventListener('click', function (event) {
        event.stopPropagation()
        var action = dailyHint.getAttribute('data-action')
        if (action !== null && action !== '') send(action)
      })

      // ---- open / close ----

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
        writeStore(POSITION_KEY, JSON.stringify({ right: userRight, bottom: userBottom }))
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
      // Optional call: minimal test environments stub a window without listeners.
      function onResize() {
        clampPig()
        fitPanel()
      }
      window.addEventListener?.('resize', onResize)

      // ---- developer mode: Ctrl+Shift+D ----
      function setDevMode(on) {
        devMode = on === true
        writeStore(DEV_KEY, devMode ? '1' : '0')
        host.setAttribute('data-dev', devMode ? 'true' : 'false')
        paintBar()
        if (devMode) {
          setOpen(true)
          select('dev')
          showBubble('🔧 开发者模式已开', 2000)
        } else {
          if (tab === 'dev') select('status')
          showBubble('开发者模式已关', 1600)
        }
      }

      devMode = readStore(DEV_KEY) === '1'
      host.setAttribute('data-dev', devMode ? 'true' : 'false')
      if (devMode) paintBar()

      function onKeyDown(event) {
        if (event.ctrlKey && event.shiftKey && (event.key === 'D' || event.key === 'd')) {
          event.preventDefault()
          setDevMode(!devMode)
        }
      }
      window.addEventListener?.('keydown', onKeyDown)

      // Also reachable from the console, for when the panel is off screen.
      try {
        /** @type {any} */ (window).dshPigDev = {
          on: function () { setDevMode(true) },
          off: function () { setDevMode(false) },
          toggle: function () { setDevMode(!devMode) },
        }
      } catch (error) { /* frozen window */ }

      function dispose() {
        stopped = true
        window.removeEventListener?.('resize', onResize)
        // #11: the dev shortcut and the console handle outlived the pig, so a
        // reload could toggle a panel that had already been disposed.
        window.removeEventListener?.('keydown', onKeyDown)
        try { delete (/** @type {any} */ (window)).dshPigDev } catch (error) { /* frozen window */ }
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