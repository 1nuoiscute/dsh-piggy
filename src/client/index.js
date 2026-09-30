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
      var font = document.createElement('link')
      font.rel = 'stylesheet'
      font.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900'
        + '&family=Noto+Sans+SC:wght@400;500;700&display=swap'
      document.head.appendChild(font)

      var style = document.createElement('style')
      style.textContent = CSS
      document.head.appendChild(style)

      var host = document.createElement('div')
      host.setAttribute(MOUNTED, '')
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
      function clampPig() {
        var vw = window.innerWidth || 0
        var vh = window.innerHeight || 0
        if (vw <= 0 || vh <= 0) return
        // Bound by the pig, not by the scene. The scene widens to the panel when
        // open, and clamping against that would shove the pig sideways on any
        // window resize; the panel's own overflow is `fitPanel`'s problem.
        var pigRect = pig.getBoundingClientRect ? pig.getBoundingClientRect() : null
        var w = (pigRect ? pigRect.width || 0 : 0) + 2 * PIG_PADDING_X
        // Vertically reserve the OPEN scene, or a pig parked high up pushes its
        // own hud off the top of the window the moment the panel opens.
        var sceneRect = scene.getBoundingClientRect ? scene.getBoundingClientRect() : null
        var h = Math.max(sceneRect ? sceneRect.height || 0 : 0, SCENE_RESERVE)
        var right = Math.min(Math.max(4, userRight), Math.max(4, vw - w - 4))
        // Only the pig anchors vertically. Clamping by the open panel would move
        // the pig when the panel appears, which is the one thing the layout
        // exists to prevent — `fitPanel` shrinks the panel instead.
        var bottom = Math.min(Math.max(4, userBottom), Math.max(4, vh - h - 4))
        host.style.right = Math.round(right) + 'px'
        host.style.bottom = Math.round(bottom) + 'px'
      }

      /**
       * Place the panel so it is fully on screen, wherever the pig has been
       * parked. The pig itself is never moved by this: the panel is absolutely
       * positioned, so it takes no space in the wrapper's box.
       */
      function fitPanel() {
        if (!isOpen) return
        var vw = window.innerWidth || 0
        var vh = window.innerHeight || 0
        if (vw <= 0 || vh <= 0) return

        var rect = scene.getBoundingClientRect()
        var roomAbove = rect.top - PANEL_GAP - PANEL_MARGIN
        var roomBelow = vh - rect.bottom - PANEL_GAP - PANEL_MARGIN

        // Open on whichever side has space. Ties go above, which is where a
        // bottom-docked pig expects its menu — but a pig parked near the top
        // must flip, otherwise its own menu opens off the screen.
        // Exactly one of top/bottom may apply. Clearing with '' would fall back
        // to the stylesheet's `bottom`, leaving both set — and an absolutely
        // positioned box with both edges pinned collapses to zero height.
        if (roomAbove >= roomBelow) {
          card.style.top = 'auto'
          card.style.bottom = 'calc(100% + ' + PANEL_GAP + 'px)'
          card.style.maxHeight = Math.max(PANEL_MIN_HEIGHT, Math.round(roomAbove)) + 'px'
        } else {
          card.style.bottom = 'auto'
          card.style.top = 'calc(100% + ' + PANEL_GAP + 'px)'
          card.style.maxHeight = Math.max(PANEL_MIN_HEIGHT, Math.round(roomBelow)) + 'px'
        }

        // Horizontal: the panel is wider than the pig, so anchoring its right
        // edge to the pig can push it off the left of the window. A negative
        // `right` moves the panel without touching the wrapper's width, so the
        // pig stays exactly where it was put.
        var width = Math.min(PANEL_WIDTH, vw - 2 * PANEL_MARGIN)
        card.style.maxWidth = Math.round(width) + 'px'
        var shift = PANEL_MARGIN - (rect.right - width)
        card.style.right = shift > 0 ? -Math.round(shift) + 'px' : '0px'

        // The hud lives inside the scene, which runs past the left edge whenever
        // the panel above had to be shifted back into view. Line it up with the
        // panel's left edge so it stays visible too.
        var cardLeft = Math.max(rect.right - width, PANEL_MARGIN)
        hud.style.left = Math.max(9, Math.round(cardLeft - rect.left)) + 'px'
      }

      var card = el('div', 'dp-card')
      // The pig lives beside the panel, not inside it, so it stays transparent
      // and unmoved when the panel opens.
      var scene = el('div', 'dp-scene')

      var hud = el('div', 'dp-hud')
      var hudName = el('div', null, '猪猪')
      var hudCoins = el('div', null, '🪙 0')
      var hudHealth = el('div', null, '💚 5/5')
      hud.appendChild(hudName)
      hud.appendChild(hudCoins)
      hud.appendChild(hudHealth)
      scene.appendChild(hud)

      var bubble = el('div', 'dp-bubble', '')
      bubble.hidden = true
      scene.appendChild(bubble)

      // What the pig is doing while it is out: a prop to work/read/travel with,
      // and a line showing how far through it is. Sits to the pig's left, so the
      // pig itself never shifts when it appears.
      var work = el('div', 'dp-work')
      var prop = el('span', 'dp-prop', '💼')
      var progressWrap = el('div', 'dp-progress')
      var progressFill = document.createElement('i')
      progressWrap.appendChild(progressFill)
      work.appendChild(prop)
      work.appendChild(progressWrap)
      work.hidden = true
      scene.appendChild(work)

      // Shown while the box is still shut, so it reads as something to poke
      // rather than a decorative cardboard box sitting in the corner.
      var pokeHint = el('div', 'dp-poke-hint')
      pokeHint.appendChild(el('span', null, '👆'))
      pokeHint.appendChild(el('span', null, '戳三下'))
      pokeHint.hidden = true
      scene.appendChild(pokeHint)

      var soul = el('span', 'dp-soul', '👻')
      soul.hidden = true
      scene.appendChild(soul)

      // Drawn stages (the piglet, the elder pig) use an <img>; the rest fall
      // back to the emoji. Both live in the pig box so the layout never cares.
      var pigArt = document.createElement('img')
      pigArt.className = 'dp-pig-img'
      pigArt.alt = ''
      pigArt.hidden = true
      var pigEmoji = el('span', 'dp-pig-emoji', '🐖')
      var pig = el('div', 'dp-pig')
      pig.appendChild(pigArt)
      pig.appendChild(pigEmoji)
      // 装扮点位：每个点位挂一件，位置全在 CSS 里（.dp-slot[data-slot=…]）。
      var dressSlots = el('div', 'dp-dress')
      pig.appendChild(dressSlots)
      scene.appendChild(pig)
      // Right-click is not discoverable on its own, so the native tooltip says so.
      scene.title = '左键摸摸 · 右键打开面板 · 拖动可移动'

      var bar = el('div', 'dp-bar')
      var icons = {}

      /** The tabs on show right now: the normal six, plus 调试 when dev mode is on. */
      function visibleTabs() {
        return devMode ? TABS.concat([DEV_TAB]) : TABS
      }

      /** Rebuild the icon bar. Called whenever dev mode flips. */
      function paintBar() {
        while (bar.firstChild) bar.removeChild(bar.firstChild)
        var list = visibleTabs()
        for (var t = 0; t < list.length; t += 1) buildIcon(list[t])
        if (icons[tab] === undefined) tab = 'status'
        for (var k in icons) icons[k].setAttribute('data-active', k === tab ? 'true' : 'false')
      }

      function buildIcon(tab) {
        (function (tab) {
          var btn = button('dp-ico', { 'data-tab': tab.key }, function () {
            if (host.getAttribute('data-open') !== 'true') setOpen(true)
            select(tab.key)
          })
          btn.appendChild(el('span', 'dp-ico-e', tab.emoji))
          btn.appendChild(el('span', null, tab.label))
          icons[tab.key] = btn
          bar.appendChild(btn)
        })(tab)
      }

      for (var t = 0; t < TABS.length; t += 1) buildIcon(TABS[t])

      var content = el('div', 'dp-content')

      // Panel first, pig second: as flex siblings in a bottom-anchored column,
      // the pig ends up at a fixed screen position whether the panel is open or
      // not, and the panel can only ever grow upwards from it.
      card.appendChild(content)
      card.appendChild(bar)
      host.appendChild(card)
      host.appendChild(scene)
      if (document.body !== null && document.body !== undefined) {
        document.body.appendChild(host)
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          try { document.body.appendChild(host) } catch (error) { /* shell not ready */ }
        }, { once: true })
      }

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
      var reactTimer = null
      var stopped = false
      var busy = false

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
              if (stopped) return
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

      function toast(text) {
        var node = el('div', 'dp-toast', text)
        card.insertBefore(node, card.firstChild)
        window.setTimeout(function () { node.remove() }, 4800)
      }

      // ---- open / close ----
      function setOpen(next) {
        isOpen = next
        host.setAttribute('data-open', next ? 'true' : 'false')
        // Collapsed must be the pig and *nothing else*. One switch hides the
        // whole panel now that the pig is not inside it — and driving visibility
        // from the DOM rather than only from CSS makes it something a test can
        // actually assert.
        card.hidden = !next
        // The hud rides with the panel: a bare pig in the corner should not have
        // a name and a coin count floating beside it.
        hud.hidden = !next
        if (!next) bubble.hidden = true
        writeStore(OPEN_KEY, next ? 'true' : 'false')
        if (next) {
          renderContent()
          fitPanel()
        } else {
          // Back to the default anchor so the next open starts from a clean
          // slate. `auto` (not '') keeps the stylesheet's bottom from re-applying
          // alongside a stale top.
          card.style.right = ''
          card.style.top = 'auto'
          card.style.bottom = ''
          card.style.maxHeight = ''
          card.style.maxWidth = ''
        }
      }

      function select(next) {
        tab = next
        picker = null
        renderContent()
        for (var k in icons) icons[k].setAttribute('data-active', k === tab ? 'true' : 'false')
      }

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

      function renderContent() {
        content.textContent = ''
        for (var k = 0; k < TABS.length; k += 1) {
          icons[TABS[k].key].setAttribute('data-active', TABS[k].key === tab ? 'true' : 'false')
        }
        if (host.getAttribute('data-open') !== 'true') return

        // Alerts sit above the tab body so they are visible from any tab.
        // Each one is guarded on `pig` because an unhatched pig is null — the
        // hatch affordance below is the only thing that may render then.
        if (view.legacy) {
          var legacy = el('div', 'dp-alert dp-legacy')
          legacy.appendChild(el('b', null, '⚠️ 宿主是旧版本'))
          legacy.appendChild(el('div', null, '金币、健康、打工、商店这些是新增的，重启 dsh（不是刷新页面）之后才会出现。'))
          content.appendChild(legacy)
        }
        if (view.pig !== null && view.dead) {
          var dead = el('div', 'dp-alert dp-dead')
          dead.appendChild(el('b', null, '🪦 ' + view.pig.name + ' 走了' + (view.pig.soul ? '，灵魂还留在墓碑上 👻' : '')))
          dead.appendChild(el('div', null, view.pig.soul
            ? '用还魂丹可以把它叫回来，或者领养一只新的小猪'
            : '在「背包」里用还魂丹就能救回来（金币、收藏、上过的课都保留）'))
          content.appendChild(dead)
          // Adopting is available the moment the pig dies — not only once the
          // soul turns up a day later. Waiting a day to start over was a
          // mistake: the grave is already a dead end with nothing to do.
          var adoptWrap = el('div', 'dp-actions')
          var adopt = button('dp-btn dp-btn-wide', { 'data-action': 'adopt' }, function () { send('adopt') })
          adopt.appendChild(el('span', null, '📦'))
          adopt.appendChild(el('span', null, '领养新猪'))
          adoptWrap.appendChild(adopt)
          content.appendChild(adoptWrap)
        } else if (view.pig !== null && view.pig.illness !== null) {
          var sick = el('div', 'dp-alert dp-sick')
          sick.appendChild(el('b', null, '🤒 ' + view.pig.illness.name + '（第 ' + view.pig.illness.stage + '/4 期）'))
          sick.appendChild(el('div', null, '需要「' + view.pig.illness.cure + '」—— 去商店买对应的药'))
          // If it cannot afford the cure, say the way out plainly: being ill is
          // not a reason to stay home, so it can go out and earn the medicine.
          // careView only carries the consumable shelves (feed/bathe/play), so
          // the price has to come from the shop listing.
          var cures = (view.shop || []).filter(function (i) { return i.kind === 'medicine' })
          var cheapest = cures.length === 0 ? null : cures.reduce(function (a, b) { return a.price <= b.price ? a : b })
          if (view.canGoOut) {
            sick.appendChild(el('div', 'dp-dim',
              '带病也能出门，但报酬只有一半；在外面病情会走得更快，躺着养最省'))
          }
          if (cheapest !== null && view.canGoOut && view.pig.coins < cheapest.price) {
            sick.appendChild(el('div', 'dp-dim',
              '钱不够也没关系 —— 先去打工，赚够 ' + cheapest.price + ' 🪙 买「' + cheapest.label + '」'))
          }
          content.appendChild(sick)
        } else if (view.pig !== null && view.activity !== null) {
          var away = el('div', 'dp-alert dp-work')
          away.appendChild(el('b', null, view.activity.emoji + ' 在外面：' + view.activity.label))
          away.appendChild(el('div', null, '还有 ' + view.activity.secondsLeft + ' 秒'))
          content.appendChild(away)
          var wrap = el('div', 'dp-actions')
          var call = button('dp-btn dp-btn-wide', { 'data-action': 'calloff' }, function () { send('calloff') })
          call.appendChild(el('span', null, '↩️'))
          call.appendChild(el('span', null, '叫它回来'))
          wrap.appendChild(call)
          content.appendChild(wrap)
        }

        if (view.pig === null) {
          content.appendChild(el('div', 'dp-empty', '门口放着一个纸盒，里面窸窸窣窣 📦'))
          var grid = el('div', 'dp-actions')
          var hatch = button('dp-btn dp-btn-wide', { 'data-action': 'hatch' }, function () { send('hatch') })
          hatch.appendChild(el('span', null, '🥚'))
          hatch.appendChild(el('span', null, '拆开纸盒'))
          grid.appendChild(hatch)
          content.appendChild(grid)
          content.appendChild(el('div', 'dp-empty', '拆开就会蹦出一只小猪 —— 不用敲命令'))
          return
        }

        if (tab === 'status') renderStatusTab(ui)
        else if (tab === 'study') renderStudyTab(ui)
        else if (tab === 'work') renderWorkTab(ui)
        else if (tab === 'shop') renderShopTab(ui)
        else if (tab === 'travel') renderTravelTab(ui)
        else if (tab === 'dev') renderDevTab(ui)
        else renderBagTab(ui)

        // Every tab is a different height, so the fit is recomputed after each
        // render rather than only on open.
        fitPanel()
      }

      var AWAY_LINE = {
        work: '在忙',
        study: '在念书',
        trip: '在路上',
      }

      function render(next) {
        view = normalize(next)
        host.setAttribute('data-dead', view.dead ? 'true' : 'false')
        host.setAttribute('data-open', isOpen ? 'true' : 'false')
      host.setAttribute('data-dev', 'false')
        // Drives both the prop and the pig's own activity animation.
        host.setAttribute('data-away', view.activity === null ? 'false' : view.activity.kind)
        if (view.activity === null) {
          work.hidden = true
        } else {
          work.hidden = false
          prop.textContent = view.activity.emoji
          progressFill.style.width = view.activity.progress + '%'
          work.setAttribute('data-kind', view.activity.kind)
          work.title = (AWAY_LINE[view.activity.kind] ?? '在外面') + '：' + view.activity.label
        }

        if (view.hatched !== true) {
          pigArt.hidden = true
          pigArt.removeAttribute('src')
          pigEmoji.hidden = false
          pigEmoji.textContent = view.boxStage.emoji
          pig.removeAttribute('data-art')
          pig.setAttribute('data-mood', 'box')
          // Size comes from the host so the box and the pig can never drift.
          host.style.setProperty('--pig-size', view.boxStage.size + 'px')
          soul.hidden = true
          host.setAttribute('data-soul', 'false')
          host.setAttribute('data-faded', 'false')
          host.setAttribute('data-unhatched', 'true')
          pokeHint.hidden = false
          hudName.textContent = '一个' + view.boxStage.label
          hudCoins.textContent = '点开拆开它'
          hudHealth.textContent = ''
          lastStage = null
        } else {
          const stage = view.pig.stage
          // A drawn stage shows its sprite; everything else is the emoji.
          if (stage.art !== null) {
            pigArt.src = ART_URL + stage.art + '.svg'
            pigArt.hidden = false
            pigEmoji.hidden = true
            pig.setAttribute('data-art', stage.art)
          } else {
            pigArt.hidden = true
            pigArt.removeAttribute('src')
            pigEmoji.hidden = false
            pigEmoji.textContent = stage.emoji
            pig.removeAttribute('data-art')
          }
          // Literally grows up: the stage carries its own size.
          host.style.setProperty('--pig-size', stage.size + 'px')
          pig.setAttribute('data-mood', view.pig.mood)
          host.setAttribute('data-soul', view.pig.soul ? 'true' : 'false')
          // Old age reads as a faded coat, since every stage is the same pig.
          host.setAttribute('data-faded', stage.faded ? 'true' : 'false')
          host.setAttribute('data-unhatched', 'false')
          pokeHint.hidden = true
          soul.hidden = view.pig.soul !== true
          pig.setAttribute('data-stage', stage.key)
          // 装扮挂在猪身上（见 .dp-slot），名字牌上不再重复一遍。
          dressSlots.textContent = ''
          for (var wd = 0; wd < view.dress.length; wd += 1) {
            var piece = view.dress[wd]
            if (!piece.worn || piece.slot === '') continue
            var node = el('span', 'dp-slot', piece.emoji)
            node.setAttribute('data-slot', piece.slot)
            dressSlots.appendChild(node)
          }
          hudName.textContent = view.pig.name
            + ' Lv.' + view.pig.level.level
            + ' · ' + stage.label
            + (view.pig.ageLabel ? ' · ' + view.pig.ageLabel : '')
            + (view.pig.ageForced ? ' 🔧' : '')
          hudCoins.textContent = '🪙 ' + view.pig.coins
          hudHealth.textContent = '💚 ' + view.pig.health + '/' + view.maxHealth
          // Growing up is announced with the same flourish a level-up used to get.
          if (lastStage !== null && stage.key !== lastStage) {
            react('levelup', 950)
            burst(['✨', '🎉', '⭐'], 4)
            showBubble('我长大啦！' + stage.emoji, 2600)
          }
          lastStage = stage.key
        }

        // Alerts on the icon bar itself, so a collapsed pig still warns.
        icons.study.setAttribute('data-alert', view.pig !== null && view.pig.illness === null && view.activity === null && view.pig.satiety < 25 ? 'false' : 'false')
        icons.shop.setAttribute('data-alert', view.pig !== null && view.pig.illness !== null ? 'true' : 'false')
        icons.travel.setAttribute('data-alert', view.pig !== null && view.pig.coins >= 400 ? 'true' : 'false')

        for (var i = 0; i < view.pending.length; i += 1) {
          var event = view.pending[i]
          if (event.at <= lastPendingAt) continue
          lastPendingAt = event.at
          toast(str(event.text, '猪有新消息'))
          if (event.kind === 'levelup') { react('levelup', 950); burst(['✨', '🎉'], 3) }
          else if (event.kind === 'cured') { react('cure', 900); burst(['💚', '✨'], 3) }
          else if (event.kind === 'death') react('refuse', 700)
          else if (event.kind === 'work') { react('away', 900); burst(['🪙', '💰'], 3) }
          else if (event.kind === 'study') { react('away', 900); burst(['📚', '✨'], 3) }
          else if (event.kind === 'trip') { react('away', 900); burst(['🧳', '🎁'], 3) }
        }

        renderContent()
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
        if (reactTimer !== null) window.clearTimeout(reactTimer)
        if (bubbleTimer !== null) window.clearTimeout(bubbleTimer)
        pollTimer = null
        reactTimer = null
        bubbleTimer = null
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