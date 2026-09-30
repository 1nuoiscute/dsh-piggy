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
import { createLayout } from './layout.js'
import { createPanel } from './panel.js'
import { createScene } from './scene.js'
import { CSS } from './styles.js'
import { ACT_URL, ART_URL, BOX_POKES_TO_OPEN, BOX_POKE_LINES, CARE_LABEL, DEV_KEY, DEV_TAB, KIND_ORDER, KIND_TITLE, MOUNTED, MODES, NO_ITEM_LINE, OPEN_KEY, PANEL_GAP, PANEL_MARGIN, PANEL_MIN_HEIGHT, PANEL_WIDTH, PET_LINES, PIG_PADDING_X, POLL_MS, POSITION_KEY, SCENE_RESERVE, STAGES, STATE_URL, TABS } from './constants.js'
import { button, el, meter } from './dom.js'
import { normalize } from './normalize.js'
import { readStore, writeStore } from './storage.js'
import { arr, num, obj, str } from './values.js'

window.__ModuleLoader__.load({
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
        progressWrap, progressFill, pokeHint, soul, pigArt, pigEmoji, pig, dressSlots, bar, content } = parts

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
      // Which souvenir's story card is open in the travel tab, if any.
      var souvenirPick = null
      // Which care action's item picker is open, if any.
      var picker = null

      /** The tabs get an explicit context instead of closing over the shell locals. */
      var ui = {
        get view() { return view }, set view(next) { view = next },
        get content() { return content }, set content(next) { content = next },
        send: send,
        renderContent: renderContent,
        get host() { return host }, set host(next) { host = next },
        setOpen: setOpen,
        fitPanel: fitPanel,
        get picker() { return picker }, set picker(next) { picker = next },
        get stage() { return stage }, set stage(next) { stage = next },
        get souvenirPick() { return souvenirPick }, set souvenirPick(next) { souvenirPick = next },
      }
      var isOpen = readStore(OPEN_KEY) === 'true'
      var lastStage = null
      var lastPendingAt = 0
      var pollTimer = null
      var fx = createEffects({
        scene: scene, pig: pig, card: card, bubble: bubble,
        isStopped: function () { return stopped },
      })
      var react = fx.react, burst = fx.burst, flash = fx.flash
      var showBubble = fx.showBubble, toast = fx.toast
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
        soul: soul,
        pigArt: pigArt,
        pigEmoji: pigEmoji,
        pig: pig,
        dressSlots: dressSlots,
        bar: bar,
        icons: icons,
        send: send,
        ui: ui,
        react: react,
        burst: burst,
        showBubble: showBubble,
        toast: toast,
        get view() { return view }, set view(next) { view = next },
        get tab() { return tab }, set tab(next) { tab = next },
        get stage() { return stage }, set stage(next) { stage = next },
        get picker() { return picker }, set picker(next) { picker = next },
        get isOpen() { return isOpen }, set isOpen(next) { isOpen = next },
        get lastStage() { return lastStage }, set lastStage(next) { lastStage = next },
        get lastPendingAt() { return lastPendingAt }, set lastPendingAt(next) { lastPendingAt = next },
        get userRight() { return userRight }, set userRight(next) { userRight = next },
        get userBottom() { return userBottom }, set userBottom(next) { userBottom = next },
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
      ui.renderContent = renderContent
      ui.setOpen = setOpen
      ui.fitPanel = fitPanel

      // ---- open / close ----

      /**
       * Developer tab. Drives the pig into any state so a change can be looked at
       * immediately instead of waiting days for it — and so the states that are
       * hard to reach by playing (dying, the last illness stage, an elder pig)
       * can be checked at all.
       */

      // ---- panel rendering ----

      /** The pig's bag for one care action: pick what to spend. */

      /** "+35 清洁" and friends, so the picker says what each item does. */

      /** "3 天" / "12 小时" / "40 分钟" for an upcoming stage. */

      /**
       * Long trips read better in hours, and the row has to fit a 292px panel:
       * "720 分钟" is three characters of noise that push the rarity hint off.
       */

      var AWAY_LINE = {
        work: '在忙',
        study: '在念书',
        trip: '在路上',
      }

      // ---- talking to the host ----
      async function refresh() {
        if (stopped) return
        // A poll can change the live content (a job finishing, an illness
        // starting), so re-check the panel still fits.
        fitPanel()
        try {
          var res = await fetch(STATE_URL, { cache: 'no-store' })
          if (!res.ok) throw new Error('HTTP ' + res.status)
          render(await res.json())
        } catch (error) {
          if (stopped) return
          showBubble('连接不上宿主', 4000)
        }
      }

      async function send(action, extra) {
        if (busy || stopped) return
        if (view.pig === null && action !== 'hatch') return
        busy = true
        flash(action)
        try {
          var body = { action: action }
          if (extra) for (var k in extra) body[k] = extra[k]
          var res = await fetch(ACT_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          })
          var next = await res.json()
          render(next)
          if (next && next.ok === false) {
            react('refuse', 520)
            if (next.reason === 'no-item') {
              var emptyKind = str(next.kind, '')
              showBubble(NO_ITEM_LINE[emptyKind] ?? '背包里没有能用的东西', 3200)
              return
            }
            var reasons = {
              cooldown: '还要等 ' + num(next.wait, 0) + ' 秒',
              poor: '钱不够',
              away: '它在外面',
              weak: '太虚弱了，先养好再出门',
              hungry: '太饿了',
              'wrong-medicine': '药不对症',
              empty: '背包里没有',
              'not-sick': '它没生病',
              dead: '它已经走了…',
              idle: '它没在外面',
              owned: '这件已经有了',
              'low-level': '等级不够（要 Lv.' + num(next.need, 0) + '，现在 Lv.' + num(next.have, 0) + '）',
              'not-owned': '还没有这件东西',
              'not-consumable': '这个是穿的，不是用的',
              'wrong-stage': '这个学段没有这门课',
              underqualified: '它还没这个本事，先去上课',
            }
            showBubble(reasons[next.reason] ?? '这个操作没成', 2400)
          }
        } catch (error) {
          showBubble('操作没送到宿主', 2600)
          react('refuse', 520)
        } finally {
          busy = false
        }
      }

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
        window.dshPigDev = {
          on: function () { setDevMode(true) },
          off: function () { setDevMode(false) },
          toggle: function () { setDevMode(!devMode) },
        }
      } catch (error) { /* frozen window */ }

      function dispose() {
        stopped = true
        window.removeEventListener?.('resize', onResize)
        if (pollTimer !== null) window.clearInterval(pollTimer)
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