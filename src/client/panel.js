// @ts-check
/**
 * 面板渲染：开关面板、切页签、把快照画到 DOM 上
 *
 * 只通过 ctx 读写外壳的状态与元素（getter/setter 转发），不直接碰全局。
 * @module dsh-pig/client/panel
 */
import { ART_URL, OPEN_KEY, TABS } from './constants.js'
import { button, el } from './dom.js'
import { normalize } from './normalize.js'
import { writeStore } from './storage.js'
import { CSS } from './styles.js'
import { renderBagTab } from './tabs/bag.js'
import { renderDevTab } from './tabs/dev.js'
import { renderShopTab } from './tabs/shop.js'
import { renderStatusTab } from './tabs/status.js'
import { renderStudyTab } from './tabs/study.js'
import { renderTravelTab } from './tabs/travel.js'
import { renderWorkTab } from './tabs/work.js'
import { str } from './values.js'

export function createPanel(ctx) {
      var AWAY_LINE = {
        work: '在忙',
        study: '在念书',
        trip: '在路上',
      }

      function setOpen(next) {
        ctx.isOpen = next
        ctx.host.setAttribute('data-open', next ? 'true' : 'false')
        // Collapsed must be the pig and *nothing else*. One switch hides the
        // whole panel now that the pig is not inside it — and driving visibility
        // from the DOM rather than only from CSS makes it something a test can
        // actually assert.
        ctx.card.hidden = !next
        // The hud rides with the panel: a bare pig in the corner should not have
        // a name and a coin count floating beside it.
        ctx.hud.hidden = !next
        if (!next) ctx.bubble.hidden = true
        writeStore(OPEN_KEY, next ? 'true' : 'false')
        if (next) {
          renderContent()
          ctx.fitPanel()
        } else {
          // Back to the default anchor so the next open starts from a clean
          // slate. `auto` (not '') keeps the stylesheet's bottom from re-applying
          // alongside a stale top.
          ctx.card.style.right = ''
          ctx.card.style.top = 'auto'
          ctx.card.style.bottom = ''
          ctx.card.style.maxHeight = ''
          ctx.card.style.maxWidth = ''
        }
      }

      function select(next) {
        ctx.tab = next
        ctx.picker = null
        renderContent()
        for (var k in ctx.icons) ctx.icons[k].setAttribute('data-active', k === ctx.tab ? 'true' : 'false')
      }

      function renderContent() {
        ctx.content.textContent = ''
        for (var k = 0; k < TABS.length; k += 1) {
          ctx.icons[TABS[k].key].setAttribute('data-active', TABS[k].key === ctx.tab ? 'true' : 'false')
        }
        if (ctx.host.getAttribute('data-open') !== 'true') return

        // Alerts sit above the tab body so they are visible from any tab.
        // Each one is guarded on `pig` because an unhatched pig is null — the
        // hatch affordance below is the only thing that may render then.
        if (ctx.view.legacy) {
          var legacy = el('div', 'dp-alert dp-legacy')
          legacy.appendChild(el('b', null, '⚠️ 宿主是旧版本'))
          legacy.appendChild(el('div', null, '金币、健康、打工、商店这些是新增的，重启 dsh（不是刷新页面）之后才会出现。'))
          ctx.content.appendChild(legacy)
        }
        if (ctx.view.pig !== null && ctx.view.dead) {
          var dead = el('div', 'dp-alert dp-dead')
          dead.appendChild(el('b', null, '🪦 ' + ctx.view.pig.name + ' 走了' + (ctx.view.pig.soul ? '，灵魂还留在墓碑上 👻' : '')))
          dead.appendChild(el('div', null, ctx.view.pig.soul
            ? '用还魂丹可以把它叫回来，或者领养一只新的小猪'
            : '在「背包」里用还魂丹就能救回来（金币、收藏、上过的课都保留）'))
          ctx.content.appendChild(dead)
          // Adopting is available the moment the pig dies — not only once the
          // soul turns up a day later. Waiting a day to start over was a
          // mistake: the grave is already a dead end with nothing to do.
          var adoptWrap = el('div', 'dp-actions')
          var adopt = button('dp-btn dp-btn-wide', { 'data-action': 'adopt' }, function () { ctx.send('adopt') })
          adopt.appendChild(el('span', null, '📦'))
          adopt.appendChild(el('span', null, '领养新猪'))
          adoptWrap.appendChild(adopt)
          ctx.content.appendChild(adoptWrap)
        } else if (ctx.view.pig !== null && ctx.view.pig.illness !== null) {
          var sick = el('div', 'dp-alert dp-sick')
          sick.appendChild(el('b', null, '🤒 ' + ctx.view.pig.illness.name + '（第 ' + ctx.view.pig.illness.stage + '/4 期）'))
          sick.appendChild(el('div', null, '需要「' + ctx.view.pig.illness.cure + '」—— 去商店买对应的药'))
          // If it cannot afford the cure, say the way out plainly: being ill is
          // not a reason to stay home, so it can go out and earn the medicine.
          // careView only carries the consumable shelves (feed/bathe/play), so
          // the price has to come from the shop listing.
          var cures = (ctx.view.shop || []).filter(function (i) { return i.kind === 'medicine' })
          var cheapest = cures.length === 0 ? null : cures.reduce(function (a, b) { return a.price <= b.price ? a : b })
          if (ctx.view.canGoOut) {
            sick.appendChild(el('div', 'dp-dim',
              '带病也能出门，但报酬只有一半；在外面病情会走得更快，躺着养最省'))
          }
          if (cheapest !== null && ctx.view.canGoOut && ctx.view.pig.coins < cheapest.price) {
            sick.appendChild(el('div', 'dp-dim',
              '钱不够也没关系 —— 先去打工，赚够 ' + cheapest.price + ' 🪙 买「' + cheapest.label + '」'))
          }
          ctx.content.appendChild(sick)
        } else if (ctx.view.pig !== null && ctx.view.activity !== null) {
          var away = el('div', 'dp-alert dp-work')
          away.appendChild(el('b', null, ctx.view.activity.emoji + ' 在外面：' + ctx.view.activity.label))
          away.appendChild(el('div', null, '还有 ' + ctx.view.activity.secondsLeft + ' 秒'))
          ctx.content.appendChild(away)
          var wrap = el('div', 'dp-actions')
          var call = button('dp-btn dp-btn-wide', { 'data-action': 'calloff' }, function () { ctx.send('calloff') })
          call.appendChild(el('span', null, '↩️'))
          call.appendChild(el('span', null, '叫它回来'))
          wrap.appendChild(call)
          ctx.content.appendChild(wrap)
        }

        if (ctx.view.pig === null) {
          ctx.content.appendChild(el('div', 'dp-empty', '门口放着一个纸盒，里面窸窸窣窣 📦'))
          var grid = el('div', 'dp-actions')
          var hatch = button('dp-btn dp-btn-wide', { 'data-action': 'hatch' }, function () { ctx.send('hatch') })
          hatch.appendChild(el('span', null, '🥚'))
          hatch.appendChild(el('span', null, '拆开纸盒'))
          grid.appendChild(hatch)
          ctx.content.appendChild(grid)
          ctx.content.appendChild(el('div', 'dp-empty', '拆开就会蹦出一只小猪 —— 不用敲命令'))
          return
        }

        if (ctx.tab === 'status') renderStatusTab(ctx.ui)
        else if (ctx.tab === 'study') renderStudyTab(ctx.ui)
        else if (ctx.tab === 'work') renderWorkTab(ctx.ui)
        else if (ctx.tab === 'shop') renderShopTab(ctx.ui)
        else if (ctx.tab === 'travel') renderTravelTab(ctx.ui)
        else if (ctx.tab === 'dev') renderDevTab(ctx.ui)
        else renderBagTab(ctx.ui)

        // Every tab is a different height, so the fit is recomputed after each
        // render rather than only on open.
        ctx.fitPanel()
      }

      function render(next) {
        ctx.view = normalize(next)
        ctx.host.setAttribute('data-dead', ctx.view.dead ? 'true' : 'false')
        ctx.host.setAttribute('data-open', ctx.isOpen ? 'true' : 'false')
      ctx.host.setAttribute('data-dev', 'false')
        // Drives both the prop and the pig's own activity animation.
        ctx.host.setAttribute('data-away', ctx.view.activity === null ? 'false' : ctx.view.activity.kind)
        if (ctx.view.activity === null) {
          ctx.work.hidden = true
        } else {
          ctx.work.hidden = false
          ctx.prop.textContent = ctx.view.activity.emoji
          ctx.progressFill.style.width = ctx.view.activity.progress + '%'
          ctx.work.setAttribute('data-kind', ctx.view.activity.kind)
          ctx.work.title = (AWAY_LINE[ctx.view.activity.kind] ?? '在外面') + '：' + ctx.view.activity.label
        }

        if (ctx.view.hatched !== true) {
          ctx.pigArt.hidden = true
          ctx.pigArt.removeAttribute('src')
          ctx.pigEmoji.hidden = false
          ctx.pigEmoji.textContent = ctx.view.boxStage.emoji
          ctx.pig.removeAttribute('data-art')
          ctx.pig.setAttribute('data-mood', 'box')
          // Size comes from the host so the box and the pig can never drift.
          ctx.host.style.setProperty('--pig-size', ctx.view.boxStage.size + 'px')
          ctx.soul.hidden = true
          ctx.host.setAttribute('data-soul', 'false')
          ctx.host.setAttribute('data-faded', 'false')
          ctx.host.setAttribute('data-unhatched', 'true')
          ctx.pokeHint.hidden = false
          ctx.hudName.textContent = '一个' + ctx.view.boxStage.label
          ctx.hudCoins.textContent = '点开拆开它'
          ctx.hudHealth.textContent = ''
          ctx.lastStage = null
        } else {
          const pigStage = ctx.view.pig.stage
          // A drawn stage shows its sprite; everything else is the emoji.
          if (pigStage.art !== null) {
            ctx.pigArt.src = ART_URL + pigStage.art + '.svg'
            ctx.pigArt.hidden = false
            ctx.pigEmoji.hidden = true
            ctx.pig.setAttribute('data-art', pigStage.art)
          } else {
            ctx.pigArt.hidden = true
            ctx.pigArt.removeAttribute('src')
            ctx.pigEmoji.hidden = false
            ctx.pigEmoji.textContent = pigStage.emoji
            ctx.pig.removeAttribute('data-art')
          }
          // Literally grows up: the stage carries its own size.
          ctx.host.style.setProperty('--pig-size', pigStage.size + 'px')
          ctx.pig.setAttribute('data-mood', ctx.view.pig.mood)
          ctx.host.setAttribute('data-soul', ctx.view.pig.soul ? 'true' : 'false')
          // Old age reads as a faded coat, since every stage is the same pig.
          ctx.host.setAttribute('data-faded', pigStage.faded ? 'true' : 'false')
          ctx.host.setAttribute('data-unhatched', 'false')
          ctx.pokeHint.hidden = true
          ctx.soul.hidden = ctx.view.pig.soul !== true
          ctx.pig.setAttribute('data-stage', pigStage.key)
          // 装扮挂在猪身上（见 .dp-slot），名字牌上不再重复一遍。
          ctx.dressSlots.textContent = ''
          for (var wd = 0; wd < ctx.view.dress.length; wd += 1) {
            var piece = ctx.view.dress[wd]
            if (!piece.worn || piece.slot === '') continue
            var node = el('span', 'dp-slot', piece.emoji)
            node.setAttribute('data-slot', piece.slot)
            ctx.dressSlots.appendChild(node)
          }
          ctx.hudName.textContent = ctx.view.pig.name
            + ' Lv.' + ctx.view.pig.level.level
            + ' · ' + pigStage.label
            + (ctx.view.pig.ageLabel ? ' · ' + ctx.view.pig.ageLabel : '')
            + (ctx.view.pig.ageForced ? ' 🔧' : '')
          ctx.hudCoins.textContent = '🪙 ' + ctx.view.pig.coins
          ctx.hudHealth.textContent = '💚 ' + ctx.view.pig.health + '/' + ctx.view.maxHealth
          // Growing up is announced with the same flourish a level-up used to get.
          if (ctx.lastStage !== null && pigStage.key !== ctx.lastStage) {
            ctx.react('levelup', 950)
            ctx.burst(['✨', '🎉', '⭐'], 4)
            ctx.showBubble('我长大啦！' + pigStage.emoji, 2600)
          }
          ctx.lastStage = pigStage.key
        }

        // Alerts on the icon bar itself, so a collapsed pig still warns.
        ctx.icons.study.setAttribute('data-alert', ctx.view.pig !== null && ctx.view.pig.illness === null && ctx.view.activity === null && ctx.view.pig.satiety < 25 ? 'false' : 'false')
        ctx.icons.shop.setAttribute('data-alert', ctx.view.pig !== null && ctx.view.pig.illness !== null ? 'true' : 'false')
        ctx.icons.travel.setAttribute('data-alert', ctx.view.pig !== null && ctx.view.pig.coins >= 400 ? 'true' : 'false')

        for (var i = 0; i < ctx.view.pending.length; i += 1) {
          var event = ctx.view.pending[i]
          if (event.at <= ctx.lastPendingAt) continue
          ctx.lastPendingAt = event.at
          ctx.toast(str(event.text, '猪有新消息'))
          if (event.kind === 'levelup') { ctx.react('levelup', 950); ctx.burst(['✨', '🎉'], 3) }
          else if (event.kind === 'cured') { ctx.react('cure', 900); ctx.burst(['💚', '✨'], 3) }
          else if (event.kind === 'death') ctx.react('refuse', 700)
          else if (event.kind === 'work') { ctx.react('away', 900); ctx.burst(['🪙', '💰'], 3) }
          else if (event.kind === 'study') { ctx.react('away', 900); ctx.burst(['📚', '✨'], 3) }
          else if (event.kind === 'trip') { ctx.react('away', 900); ctx.burst(['🧳', '🎁'], 3) }
        }

        renderContent()
      }

  return { setOpen, select, renderContent, render }
}
