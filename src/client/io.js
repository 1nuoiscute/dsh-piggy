// @ts-check
/**
 * 与宿主对话：拉快照、发动作。
 *
 * 只负责 HTTP 与错误话术，画界面交给 panel.js（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/client/io
 */
import { ACT_URL, NO_ITEM_LINE, STATE_URL } from './constants.js'
import { el } from './dom.js'
import { num, str } from './values.js'

/**
 * @param {object} ctx - the shell context
 */
export function createIo(ctx) {
      /** Bumped by every action, so a stale poll can tell it has been overtaken. */
      var actionSeq = 0

      async function send(action, extra) {
        if (ctx.busy || ctx.stopped) return
        if (ctx.view.pig === null && action !== 'hatch') return
        // Every action bumps the sequence: a poll that started before this
        // action is stale by the time it lands and must be dropped.
        actionSeq += 1
        ctx.busy = true
        ctx.flash(action)
        try {
          var body = { action: action }
          if (extra) for (var k in extra) body[k] = extra[k]
          var res = await fetch(ACT_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          })
          var next = await res.json()
          ctx.render(next)
          if (next && next.ok === false) {
            // Answering a line that has already moved on is normal (a second
            // window, a slow poll): say nothing rather than scold the user.
            if (next.reason === 'stale-line') return
            ctx.react('refuse', 520)
            if (next.reason === 'no-item') {
              var emptyKind = str(next.kind, '')
              ctx.showBubble(NO_ITEM_LINE[emptyKind] ?? '背包里没有能用的东西', 3200)
              return
            }
            var reasons = {
              box: '先把纸盒拆开',
              'not-adult': '成年阶段起才能加冕（Lv40）',
              'coronation-ineligible': '加冕条件还没补齐',
              cooldown: '还要等 ' + num(next.wait, 0) + ' 秒',
              poor: '钱不够',
              away: '它在外面',
              weak: '太虚弱了，先养好再出门',
              hungry: '太饿了',
              'wrong-medicine': '药不对症，病情加重了…',
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
            ctx.showBubble(reasons[next.reason] ?? '这个操作没成', 2400)
          }
        } catch (error) {
          ctx.showBubble('操作没送到宿主', 2600)
          ctx.react('refuse', 520)
        } finally {
          ctx.busy = false
        }
      }

      async function refresh() {
        if (ctx.stopped) return
        // A poll can change the live content (a job finishing, an illness
        // starting), so re-check the panel still fits.
        ctx.fitPanel()
        var startedAt = actionSeq
        try {
          var res = await fetch(STATE_URL, { cache: 'no-store' })
          if (!res.ok) throw new Error('HTTP ' + res.status)
          var next = await res.json()
          // An action landed while this poll was in flight: its result is newer
          // than ours, so painting ours would undo what the user just did.
          if (startedAt !== actionSeq) return
          ctx.render(next)
        } catch (error) {
          if (ctx.stopped) return
          ctx.showBubble('连接不上宿主', 4000)
        }
      }

  return { send: send, refresh: refresh }
}
