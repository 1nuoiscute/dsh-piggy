// @ts-check
/**
 * 与宿主对话：拉快照、发动作。
 *
 * 只负责 HTTP 与错误话术，画界面交给 panel.js（见 docs/CONVENTIONS.md）。
 * @module dsh-piggy/client/io
 */
import { ACT_URL, NO_ITEM_LINE, STATE_URL } from './constants.js'
import { el } from './dom.js'
import { createPomodoroClock } from './pomodoro-clock.js'
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
        ctx.flash(action, extra)
        try {
          var body = { action: action }
          if (extra) for (var k in extra) body[k] = extra[k]
          var res = await fetch(ACT_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          })
          var next = await res.json()
          if (action === 'buy' && next?.ok === true) ctx.justBought = extra?.item ?? null
          ctx.render(next)
          // 签到、礼包的结果一律由猪说出来（面板开着时也是）；对应的公告事件不再弹面板顶上的提示条。
          if ((action === 'signIn' || action === 'openGift') && next?.ok === true) {
            var reward = str(next.reward, '')
            ctx.showBubble((action === 'signIn' ? '签到成功' : '礼包打开') + (reward ? ' · ' + reward : ''), 4000)
          }
          if (next && next.ok === false) {
            // Answering a line that has already moved on is normal (a second
            // window, a slow poll): say nothing rather than scold the user.
            if (next.reason === 'stale-line') return
            // The pig chose not to speak up (away, ill, 免打扰): nothing to say.
            if (next.reason === 'silent') return
            ctx.react('refuse', 520)
            if (next.reason === 'no-item') {
              var emptyKind = str(next.kind, '')
              ctx.showBubble(NO_ITEM_LINE[emptyKind] ?? '背包里没有能用的东西', 3200)
              return
            }
            if (next.reason === 'contract-ineligible' || next.reason === 'coronation-ineligible') {
              var lacks = (Array.isArray(next.missing) ? next.missing : [])
                .map(function (row) { return str(row.label, '') + ' ' + num(row.have, 0) + '/' + num(row.need, 0) }).join(' · ')
              var actionName = next.reason === 'contract-ineligible' ? '签约' : '加冕'
              ctx.showBubble(lacks === '' ? actionName + '条件还没齐' : actionName + '还差：' + lacks, 3400)
              return
            }
            var reasons = {
              box: '先把纸盒拆开',
              'needs-item': '还没有王冠，去商店的晋升货架买',
              'coronation-ineligible': '加冕条件还没齐',
              'contract-ineligible': '契约还没生效：条件没补齐',
              'needs-contract': '这一种要签约，不是加冕',
              'not-a-contract': '这不是契约',
              already: '它已经是这个样子了',
              cooldown: '还要等 ' + num(next.wait, 0) + ' 秒',
              poor: '钱不够',
              away: '它在外面',
              weak: '太虚弱了，先养好再出门',
              hungry: '太饿了',
              'no-bait': '鱼饵不够' + (next.need ? '，本次需要 ' + num(next.need, 0) + ' 个' : '') + '，去商店的鱼饵货架买',
              escaped: '鱼跑掉了，再抛一次吧',
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

  // 番茄钟倒计时在本地一秒一秒走（轮询每 POLL_MS 才报一次），到点立刻 refresh。
  // 面板每次重画都会按服务端取整后的秒数写一遍，紧接着让秒针按本地时间覆盖回来（同一帧，不闪）。
  ctx.pomoTick = createPomodoroClock(function () { return ctx.view }, ctx.pomoHint, ctx.content, refresh,
    function () { return ctx.stopped === true }).tick
  return { send: send, refresh: refresh }
}
