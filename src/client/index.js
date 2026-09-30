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
      function devTab() {
        content.appendChild(el('div', 'dp-dev-note', '🔧 开发者模式 · 构建 v' + (view.version === '' ? '未知' : view.version) + ' · Ctrl+Shift+D 关闭'))
        if (view.pig !== null && view.pig.ageForced) {
          content.appendChild(el('div', 'dp-dev-note',
            '⚠️ 年龄是调试改的（HUD 上有 🔧）—— 按「⏪ 年龄归零」才会重新按真实时间算'))
        }

        var p = view.pig
        if (p === null) {
          content.appendChild(el('div', 'dp-empty', '还没有猪。先「拆开纸盒」再调。'))
          return
        }

        /** A row of small buttons under a caption. */
        function group(title, entries) {
          var head = el('div', 'dp-title')
          head.appendChild(el('b', null, title))
          content.appendChild(head)
          var wrap = el('div', 'dp-dev-row')
          for (var i = 0; i < entries.length; i += 1) {
            (function (entry) {
              var btn = button('dp-mini dp-dev-btn', { 'data-dev': entry.key }, function () { entry.run() })
              btn.textContent = entry.label
              wrap.appendChild(btn)
            })(entries[i])
          }
          content.appendChild(wrap)
        }

        var patch = function (body) { send('dev', { patch: body }) }

        group('状态', [
          { key: 'full', label: '😊 满状态', run: function () { patch({ satiety: 100, happiness: 100, cleanliness: 100, health: 5 }) } },
          { key: 'hungry', label: '🍎 饿', run: function () { patch({ satiety: 10 }) } },
          { key: 'dirty', label: '🫧 脏', run: function () { patch({ cleanliness: 10 }) } },
          { key: 'lonely', label: '🥺 孤单', run: function () { patch({ happiness: 10 }) } },
          { key: 'sleepy', label: '💤 困', run: function () { patch({ satiety: 90, happiness: 90, cleanliness: 90 }) } },
        ])

        group('生病', [
          { key: 'cold1', label: '🤒 感冒一期', run: function () { patch({ illness: { chain: 0, stage: 1 }, health: 4 }) } },
          { key: 'cold4', label: '☠️ 肺炎', run: function () { patch({ illness: { chain: 0, stage: 4 }, health: 1 }) } },
          { key: 'cough', label: '🫁 肺结核', run: function () { patch({ illness: { chain: 1, stage: 4 }, health: 1 }) } },
          { key: 'belly', label: '🤢 胃癌', run: function () { patch({ illness: { chain: 2, stage: 4 }, health: 1 }) } },
          { key: 'cure', label: '💚 治好', run: function () { patch({ illness: null, health: 5 }) } },
        ])

        group('年龄', [
          { key: 'box', label: '📦 纸盒', run: function () { patch({ hatched: false }) } },
          { key: 'piglet', label: '小猪', run: function () { patch({ hatched: true, ageDays: 0.2 }) } },
          { key: 'young', label: '青年', run: function () { patch({ ageDays: 2 }) } },
          { key: 'middle', label: '中年', run: function () { patch({ ageDays: 5 }) } },
          { key: 'elder', label: '老年', run: function () { patch({ ageDays: 9 }) } },
          { key: 'gone', label: '🪦 老死', run: function () { patch({ ageDays: 20 }) } },
          { key: 'real', label: '⏪ 年龄归零', run: function () { send('ageFromNow') } },
        ])

        group('资源', [
          { key: 'coin100', label: '🪙 +100', run: function () { patch({ coins: p.coins + 100 }) } },
          { key: 'coin999', label: '🪙 9999', run: function () { patch({ coins: 9999 }) } },
          { key: 'traits', label: '🧠+5 ✨+5 💪+5', run: function () { patch({ traits: { intel: 5, charm: 5, strong: 5 } }) } },
          { key: 'all', label: '🎁 一键拿齐', run: function () { send('giveAll') } },
        ])

        group('时间', [
          { key: 'real', label: '×1 真实', run: function () { send('timeScale', { scale: 1 }) } },
          { key: 'fast12', label: '×12', run: function () { send('timeScale', { scale: 12 }) } },
          { key: 'fast30', label: '×30', run: function () { send('timeScale', { scale: 30 }) } },
          { key: 'fast60', label: '×60', run: function () { send('timeScale', { scale: 60 }) } },
        ])

        group('生死', [
          { key: 'kill', label: '💀 弄死', run: function () { patch({ dead: true }) } },
          { key: 'revive', label: '✨ 复活', run: function () { patch({ dead: false, health: 5 }) } },
          { key: 'adopt', label: '📦 领养', run: function () { send('adopt') } },
          { key: 'reset', label: '🔄 重置', run: function () { send('reset') } },
        ])

        group('面板', [
          { key: 'open', label: '展开/收起', run: function () { setOpen(host.getAttribute('data-open') !== 'true') } },
          { key: 'away1', label: '⏩ +1 小时', run: function () { patch({ __advanceMs: 3600000 }) } },
          { key: 'away24', label: '⏩ +1 天', run: function () { patch({ __advanceMs: 86400000 }) } },
        ])

        content.appendChild(el('div', 'dp-dev-note',
          '当前：' + p.stage.label + ' · 健康 ' + p.health + ' · 🪙 ' + p.coins
          + (p.illness === null ? '' : ' · ' + p.illness.name)))
      }

      // ---- panel rendering ----
      function labelledBar(label, value, valueText, variant) {
        var row = el('div', 'dp-row')
        row.appendChild(el('span', null, label))
        row.appendChild(el('b', null, valueText))
        content.appendChild(row)
        content.appendChild(meter(value, variant))
      }

      function statusTab() {
        var p = view.pig
        if (p === null) return
        labelledBar('🍚 饱食', p.satiety, p.satiety + '%')
        labelledBar('❤️ 心情', p.happiness, p.happiness + '%', 'dp-mood')
        labelledBar('🫧 清洁', p.cleanliness, p.cleanliness + '%', 'dp-clean')
        labelledBar('💚 健康', p.healthPercent, p.health + '/' + view.maxHealth, 'dp-health')

        var traits = el('div', 'dp-traits')
        traits.appendChild(el('span', null, '🧠 智力 ' + p.traits.intel))
        traits.appendChild(el('span', null, '✨ 魅力 ' + p.traits.charm))
        traits.appendChild(el('span', null, '💪 武力 ' + p.traits.strong))
        content.appendChild(traits)

        var info = el('div', 'dp-row')
        info.appendChild(el('span', null, '⚖️ 体重 ' + p.weight))
        info.appendChild(el('b', null, '🪙 ' + p.coins))
        content.appendChild(info)

        var lvl = el('div', 'dp-row')
        lvl.appendChild(el('span', null, '⭐ 等级'))
        lvl.appendChild(el('b', null, 'Lv.' + p.level.level + ' ' + p.level.titleEmoji + p.level.titleLabel
          + (p.level.toNext > 0 ? ' · 还差 ' + p.level.toNext + ' xp' : '')))
        content.appendChild(lvl)

        var age = el('div', 'dp-row')
        age.appendChild(el('span', null, '🎂 年龄'))
        age.appendChild(el('b', null, p.ageLabel + (p.ageForced ? ' 🔧' : '') + (p.daysToNextStage === null ? ' · 已长成' : '')))
        content.appendChild(age)

        var grid = el('div', 'dp-actions')
        for (var i = 0; i < MODES.length; i += 1) {
          (function (key) {
            var info = view.actions[key]
            var shelf = view.care[key] ?? []
            var needsItem = shelf.length > 0
            var btn = button('dp-btn', { 'data-action': key }, function () {
              // Feeding, washing and playing all spend something, so the button
              // opens the pig's bag instead of guessing what to use.
              if (needsItem) {
                picker = picker === key ? null : key
                renderContent()
              } else {
                send(key)
              }
            })
            btn.setAttribute('data-open-picker', picker === key ? 'true' : 'false')
            btn.appendChild(el('span', null, CARE_LABEL[key][1]))
            btn.appendChild(el('span', null, CARE_LABEL[key][0]))
            if (needsItem) btn.appendChild(el('span', 'dp-count', String(shelf.length)))
            // Trust but verify: a dead pig cannot be cared for even if the host
            // forgot to clear its readiness flags.
            if (!info.ready || view.dead) {
              btn.disabled = true
              if (view.dead) btn.appendChild(el('span', 'dp-wait', '—'))
              else if (info.waitSeconds > 0) btn.appendChild(el('span', 'dp-wait', info.waitSeconds + 's'))
              else if (info.blocked === 'away') btn.appendChild(el('span', 'dp-wait', '不在家'))
            }
            grid.appendChild(btn)
          })(MODES[i])
        }
        content.appendChild(grid)

        if (picker !== null && (view.care[picker] ?? []).length > 0) content.appendChild(pickerPanel(picker))

        if (p.memories.length > 0) {
          content.appendChild(el('div', 'dp-memo', p.memories.slice(-3).join('\n')))
        }
      }

      /** The pig's bag for one care action: pick what to spend. */
      function pickerPanel(action) {
        var wrap = el('div', 'dp-pick')
        var asks = { feed: '喂点什么？', bathe: '用哪个洗澡？', play: '拿哪个玩具？' }
        wrap.appendChild(el('div', 'dp-pick-head', asks[action] ?? '用哪个？'))
        var list = el('div', 'dp-list')
        var shelf = view.care[action] ?? []
        for (var i = 0; i < shelf.length; i += 1) {
          (function (item) {
            var row = el('div', 'dp-item')
            row.appendChild(el('span', null, item.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, item.label + (item.default ? '（自带）' : ' ×' + num(item.count, 0))))
            grow.appendChild(el('div', 'dp-dim', careEffectLine(action, item)))
            row.appendChild(grow)
            var use = button('dp-mini', { 'data-care': action + ':' + item.key }, function () {
              picker = null
              send(action, { item: item.key })
            })
            use.textContent = '用'
            row.appendChild(use)
            list.appendChild(row)
          })(shelf[i])
        }
        wrap.appendChild(list)
        var cancel = button('dp-cancel', {}, function () { picker = null; renderContent() })
        cancel.textContent = '算了'
        wrap.appendChild(cancel)
        return wrap
      }

      /** "+35 清洁" and friends, so the picker says what each item does. */
      function careEffectLine(action, item) {
        var parts = []
        if (action === 'feed') {
          parts.push('饱食 +' + item.satiety)
          if (item.happiness) parts.push('心情 +' + item.happiness)
        } else if (action === 'bathe') {
          parts.push('清洁 +' + item.cleanliness)
          if (item.happiness) parts.push('心情 +' + item.happiness)
        } else {
          parts.push('心情 +' + item.happiness)
          if (item.satiety) parts.push('饱食 ' + item.satiety)
        }
        return parts.join(' · ')
      }

      function studyTab() {
        if (view.subjects.length === 0) {
          content.appendChild(el('div', 'dp-empty', '宿主还没提供课程表。'))
          return
        }
        // Prefer the host's own ladder: a client that hard-codes seven stages
        // would keep offering a stage the host has never heard of.
        var stageList = view.stages.length > 0 ? view.stages : STAGES
        var seg = el('div', 'dp-seg')
        for (var s = 0; s < stageList.length; s += 1) {
          (function (entry) {
            var detail = null
            for (var k = 0; k < view.stages.length; k += 1) if (view.stages[k].key === entry.key) detail = view.stages[k]
            var locked = detail !== null && detail.unlocked === false
            // Tuition lives in the note below rather than in the button: seven
            // stages do not fit in a 292px panel with a price glued to each.
            var btn = button(null, { 'data-stage': entry.key }, function () {
              stage = entry.key
              renderContent()
            })
            btn.textContent = entry.label + (locked ? ' 🔒' : '')
            btn.setAttribute('data-active', entry.key === stage ? 'true' : 'false')
            btn.setAttribute('data-locked', locked ? 'true' : 'false')
            seg.appendChild(btn)
          })(stageList[s])
        }
        content.appendChild(seg)

        var detail = null
        for (var d = 0; d < view.stages.length; d += 1) if (view.stages[d].key === stage) detail = view.stages[d]
        if (detail !== null) {
          var note = el('div', 'dp-empty', detail.minutes + ' 分钟 · 学费 ' + detail.tuition + ' 🪙 · 属性 +' + detail.gain)
          note.style.marginBottom = '7px'
          note.style.marginTop = '0'
          content.appendChild(note)
          // A gated stage says exactly what it is waiting for.
          if (detail.unlocked === false && detail.progress !== null) {
            content.appendChild(el('div', 'dp-locked',
              '🔒 要先念完' + detail.progress.label + '（' + detail.progress.done + '/' + detail.progress.need + '）'))
          }
        }

        // Only this stage's own courses. An empty list (old host) means "show
        // everything", never "show nothing".
        var wanted = detail !== null && detail.subjects.length > 0 ? detail.subjects : null
        var grid = el('div', 'dp-grid')
        for (var i = 0; i < view.subjects.length; i += 1) {
          (function (sub) {
            if (wanted !== null && wanted.indexOf(sub.key) < 0) return
            var btn = button('dp-item', { 'data-subject': sub.key }, function () {
              send('study', { subject: sub.key, stage: stage })
            })
            if (detail !== null && detail.unlocked === false) btn.disabled = true
            btn.style.cursor = 'pointer'
            btn.style.textAlign = 'left'
            btn.appendChild(el('span', null, sub.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, sub.label))
            // The stage on screen is the count that matters; a host without the
            // per-stage table falls back to the lifetime total. Kept short —
            // two columns of 292px do not fit "这一级上过 N 次".
            var perStage = sub.levels[stage]
            var times = typeof perStage === 'number' ? perStage : sub.level
            grow.appendChild(el('div', 'dp-dim', sub.traitLabel + ' · 本级 ' + times + ' 次'))
            btn.appendChild(grow)
            grid.appendChild(btn)
          })(view.subjects[i])
        }
        content.appendChild(grid)

        // ---- 兴趣：不按学段排队，随时能学，加的是同三条属性 ----
        if (view.interests.length > 0) {
          var ihead = el('div', 'dp-title')
          ihead.style.marginTop = '10px'
          ihead.appendChild(el('b', null, '🎯 兴趣'))
          content.appendChild(ihead)
          var ilist = el('div', 'dp-list')
          for (var n = 0; n < view.interests.length; n += 1) {
            (function (entry) {
              var row = el('div', 'dp-item')
              row.appendChild(el('span', null, entry.emoji))
              var grow = el('div', 'dp-grow')
              grow.appendChild(el('div', null, entry.label))
              grow.appendChild(el('div', 'dp-dim', entry.minutes + ' 分钟 · ' + entry.cost + ' 🪙 · '
                + entry.traitEmoji + entry.traitLabel + ' +' + entry.gain
                + (entry.times > 0 ? ' · 学过 ' + entry.times + ' 次' : '')))
              row.appendChild(grow)
              var go = button('dp-mini', { 'data-interest': entry.key }, function () {
                send('interest', { interest: entry.key })
              })
              go.textContent = entry.times > 0 ? '再学' : '去学'
              go.disabled = !view.canGoOut || !entry.affordable
              row.appendChild(go)
              ilist.appendChild(row)
            })(view.interests[n])
          }
          content.appendChild(ilist)
        }
      }

      function workTab() {
        if (view.jobs.length === 0) {
          content.appendChild(el('div', 'dp-empty', '宿主还没提供工作列表。'))
          return
        }
        var list = el('div', 'dp-list')
        for (var i = 0; i < view.jobs.length; i += 1) {
          (function (job) {
            var row = el('div', 'dp-item')
            row.appendChild(el('span', null, job.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, job.label))
            var line = job.minutes + ' 分钟 · 赚 ' + job.coins + ' 🪙'
            if (job.traitPoints > 0) {
              line += ' · 省 ' + job.speedPercent + '% 时间'
            }
            grow.appendChild(el('div', 'dp-dim', line))
            // Spell out which lessons are paying for this, or the linkage between
            // 学习 and 打工 is invisible.
            // Spell out which lesson is paying for this, and stop there — the
            // "go to 学习 to raise it" lecture belongs in the docs, not the panel.
            var byTrait = job.traitEmoji + job.traitLabel + ' ' + job.traitPoints
              + (job.payPercent > 0 ? ' · 报酬 +' + job.payPercent + '%' : '')
            grow.appendChild(el('div', 'dp-dim', byTrait))
            // A gate with no reason on screen is a bug report waiting to happen.
            var locked = job.qualified === false
            if (locked) grow.appendChild(el('div', 'dp-lock', '🔒 需要 ' + job.lockText))
            row.appendChild(grow)
            var go = button('dp-mini', { 'data-job': job.key }, function () { send('work', { job: job.key }) })
            go.textContent = locked ? '没资格' : '出发'
            go.disabled = !view.canGoOut || locked
            row.appendChild(go)
            list.appendChild(row)
          })(view.jobs[i])
        }
        content.appendChild(list)
      }

      function shopTab() {
        if (view.shop.length === 0) {
          content.appendChild(el('div', 'dp-empty', '宿主还没提供货架。'))
          return
        }
        var head = el('div', 'dp-title')
        head.appendChild(el('b', null, '🛒 商店'))
        head.appendChild(el('span', null, '🪙 ' + view.pig.coins))
        content.appendChild(head)
        var list = el('div', 'dp-shopgrid')
        var shelf = ''
        // The host sends the shop in shelf order, but sort defensively so a
        // reordered table cannot produce duplicate headers.
        var ordered = view.shop.slice().sort(
          (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
        )
        for (var i = 0; i < ordered.length; i += 1) {
          (function (item) {
            // Shelves, so 21 items read as five short lists instead of one long one.
            if (item.kind !== shelf) {
              shelf = item.kind
              list.appendChild(el('div', 'dp-shelf', KIND_TITLE[shelf] ?? shelf))
            }
            // A grid cell, not a list row: 45 items in a 292px column meant
            // endless scrolling and you could never see a shelf at a glance.
            var cell = button('dp-cell'
              + (item.needed ? ' dp-wanted' : '')
              + (item.kind === 'dress' ? ' dp-dress' : (item.affordable ? '' : ' dp-poor'))
              + (item.owned ? ' dp-owned' : ''),
              { 'data-buy': item.key }, function () { send('buy', { item: item.key }) })
            cell.appendChild(el('span', 'dp-cell-e', item.emoji))
            cell.appendChild(el('span', 'dp-cell-n', item.label))
            // 家当 has no count and no repeat purchase: it says "已拥有", or the
            // level it is waiting for — never a price the pig cannot use.
            if (item.owned) {
              cell.appendChild(el('span', 'dp-cell-p', '已拥有'))
              cell.disabled = true
            } else if (item.kind === 'dress' && item.unlocked === false) {
              cell.appendChild(el('span', 'dp-cell-p', '🔒 Lv.' + item.level))
            } else {
              cell.appendChild(el('span', 'dp-cell-p', item.price + ' 🪙'))
            }
            if (item.count > 0) cell.appendChild(el('b', 'dp-cell-c', '×' + item.count))
            if (item.needed) cell.appendChild(el('b', 'dp-cell-tag', '需要'))
            if (item.owned && item.worn) cell.appendChild(el('b', 'dp-cell-tag', '穿着'))
            list.appendChild(cell)
          })(ordered[i])
        }
        content.appendChild(list)
      }

      function travelTab() {
        if (view.trips.length === 0) {
          content.appendChild(el('div', 'dp-empty', '宿主还没提供目的地。'))
          return
        }
        var list = el('div', 'dp-list')
        for (var i = 0; i < view.trips.length; i += 1) {
          (function (trip) {
            var row = el('div', 'dp-item')
            row.appendChild(el('span', null, trip.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, trip.label))
            grow.appendChild(el('div', 'dp-dim', formatMinutes(trip.minutes) + ' · ' + trip.cost + ' 🪙'
              + (trip.bestRarity ? ' · 可带回 ' + trip.bestRarityEmoji + trip.bestRarity : '')))
            row.appendChild(grow)
            var go = button('dp-mini', { 'data-trip': trip.key }, function () { send('trip', { trip: trip.key }) })
            go.textContent = '出发'
            go.disabled = !view.canGoOut || !trip.affordable
            row.appendChild(go)
            list.appendChild(row)
          })(view.trips[i])
        }
        content.appendChild(list)

        var souvenirs = view.pig.souvenirs
        var head = el('div', 'dp-title')
        head.style.marginTop = '10px'
        head.appendChild(el('b', null, '🎁 纪念品 ' + souvenirs.length))
        content.appendChild(head)
        if (souvenirs.length === 0) {
          content.appendChild(el('div', 'dp-empty', '还没出过远门。'))
          return
        }

        var chips = el('div', 'dp-grid')
        for (var s = 0; s < souvenirs.length; s += 1) {
          (function (entry) {
            var chip = button('dp-item', { 'data-souvenir': entry.key }, function () {
              souvenirPick = souvenirPick === entry.key ? null : entry.key
              renderContent()
            })
            chip.appendChild(el('span', null, entry.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, entry.label))
            grow.appendChild(el('div', 'dp-dim', entry.rarityEmoji + entry.rarityLabel
              + (entry.price > 0 ? ' · 值 ' + entry.price + ' 🪙' : '')))
            chip.appendChild(grow)
            chips.appendChild(chip)
          })(souvenirs[s])
        }
        content.appendChild(chips)

        // The story card: tapping a souvenir is how the pig tells you where it
        // went and what it brought back.
        var picked = null
        for (var q = 0; q < souvenirs.length; q += 1) if (souvenirs[q].key === souvenirPick) picked = souvenirs[q]
        if (picked !== null) {
          // Named uniquely: the CSS-guard test maps `var x = el(...)` names to
          // classes, and reusing `card` here shadowed the real .dp-card entry.
          var souvenirCard = el('div', 'dp-locked')
          souvenirCard.appendChild(el('div', null, picked.emoji + ' ' + picked.label + ' · ' + picked.rarityEmoji + picked.rarityLabel
            + (picked.fromLabel === '' ? '' : ' · 来自' + picked.fromLabel)))
          souvenirCard.appendChild(el('div', null, picked.story === ''
            ? '（这只纪念品是旧版本带回来的，没有留下故事。）'
            : '「' + picked.story + '」'))
          if (picked.price > 0) {
            var sell = button('dp-mini', { 'data-sell': picked.key }, function () {
              souvenirPick = null
              send('sell', { souvenir: picked.key })
            })
            sell.textContent = '卖掉 +' + picked.price + ' 🪙'
            sell.style.marginTop = '6px'
            souvenirCard.appendChild(sell)
          }
          content.appendChild(souvenirCard)
        }
      }

      function bagTab() {
        var owned = []
        for (var i = 0; i < view.shop.length; i += 1) {
          if (num(view.inventory[view.shop[i].key], 0) > 0) owned.push(view.shop[i])
        }
        if (owned.length === 0) {
          content.appendChild(el('div', 'dp-empty', '背包空空的 —— 去「商店」买点东西。'))
        } else {
          var list = el('div', 'dp-list')
          for (var j = 0; j < owned.length; j += 1) {
            (function (item) {
              var row = el('div', 'dp-item' + (item.needed ? ' dp-wanted' : ''))
              row.appendChild(el('span', null, item.emoji))
              var grow = el('div', 'dp-grow')
              grow.appendChild(el('div', null, item.label + ' ×' + num(view.inventory[item.key], 0)))
              grow.appendChild(el('div', 'dp-dim', kindLabel(item)))
              row.appendChild(grow)
              var use = button('dp-mini', { 'data-use': item.key }, function () { send('use', { item: item.key }) })
              use.textContent = '使用'
              row.appendChild(use)
              list.appendChild(row)
            })(owned[j])
          }
          content.appendChild(list)
        }

        // 家当: owned dress, with wear/take-off. Hidden entirely on an old host
        // that never sent the shelf, so the panel does not show a dead section.
        if (view.dress.length > 0) {
          var dhead = el('div', 'dp-title')
          dhead.style.marginTop = '10px'
          var wornCount = 0
          for (var w = 0; w < view.dress.length; w += 1) if (view.dress[w].worn) wornCount += 1
          dhead.appendChild(el('b', null, '👕 家当 ' + wornCount + '/' + view.dress.length + ' 穿着中'))
          content.appendChild(dhead)
          var ownedDress = []
          for (var m = 0; m < view.dress.length; m += 1) if (view.dress[m].owned) ownedDress.push(view.dress[m])
          if (ownedDress.length === 0) {
            content.appendChild(el('div', 'dp-empty', '还没有装扮 —— 商店「装扮」那一栏，等级够了就能买。'))
          } else {
            var dlist = el('div', 'dp-list')
            for (var n = 0; n < ownedDress.length; n += 1) {
              (function (item) {
                var row = el('div', 'dp-item')
                row.appendChild(el('span', null, item.emoji))
                var grow = el('div', 'dp-grow')
                grow.appendChild(el('div', null, item.label + (item.worn ? ' · 穿着' : '')))
                grow.appendChild(el('div', 'dp-dim', (item.slotLabel === '' ? '' : item.slotLabel + ' · ')
                  + (item.blurb === '' ? 'Lv.' + item.level + ' 解锁' : item.blurb)))
                row.appendChild(grow)
                var toggle = button('dp-mini', { 'data-wear': item.key }, function () {
                  send('wear', { item: item.key, on: !item.worn })
                })
                toggle.textContent = item.worn ? '脱下' : '穿上'
                row.appendChild(toggle)
                dlist.appendChild(row)
              })(ownedDress[n])
            }
            content.appendChild(dlist)
          }
        }

        var souvenirs = view.pig.souvenirs
        var head = el('div', 'dp-title')
        head.style.marginTop = '10px'
        head.appendChild(el('b', null, '🎁 纪念品 ' + souvenirs.length))
        content.appendChild(head)
        content.appendChild(el('div', 'dp-empty', souvenirs.length === 0
          ? '收藏册还空着。'
          : souvenirs.map(entry => entry.emoji + entry.label).join(' · ')))
      }

      /** "3 天" / "12 小时" / "40 分钟" for an upcoming stage. */
      function formatDays(days) {
        if (days >= 1) return Math.round(days) + ' 天'
        const hours = days * 24
        return hours >= 1 ? Math.round(hours) + ' 小时' : Math.max(1, Math.round(hours * 60)) + ' 分钟'
      }

      /**
       * Long trips read better in hours, and the row has to fit a 292px panel:
       * "720 分钟" is three characters of noise that push the rarity hint off.
       */
      function formatMinutes(minutes) {
        if (minutes < 60) return minutes + ' 分钟'
        const hours = Math.floor(minutes / 60)
        const rest = minutes % 60
        return rest === 0 ? hours + ' 小时' : hours + ' 小时' + rest + ' 分'
      }

      function kindLabel(item) {
        if (item.kind === 'medicine') return item.needed ? '对症！' : '药'
        if (item.kind === 'revive') return '复活用'
        if (item.kind === 'bath') return '洗浴'
        return '食物'
      }

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

        if (tab === 'status') statusTab()
        else if (tab === 'study') studyTab()
        else if (tab === 'work') workTab()
        else if (tab === 'shop') shopTab()
        else if (tab === 'travel') travelTab()
        else if (tab === 'dev') devTab()
        else bagTab()

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