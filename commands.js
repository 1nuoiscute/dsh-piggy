// @ts-check
/**
 * 斜杠命令与拒绝话术。
 *
 * 只读取状态与数值表，不算业务规则（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/commands
 */

import { ACTIONS, JOBS, MAX, REVIVE_ITEM, SCHOOL_STAGES, SHOP, SUBJECTS, TRAITS, TRAIT_ORDER, TRIPS, buy, feed, hatch } from './core.js'
import { jobByKey } from './data.js'
import { renderAbout, renderAction, renderBuy, renderHatch, renderNoPig, renderStatus, renderStudyReport, renderTooSoon, renderTripReport, renderUse, renderWeigh, renderWorkRefusal, renderWorkReport } from './render.js'

const str = value => (typeof value === 'string' ? value : '')

export function performAction(store, action) {
  const state = store.freshen()
  if (state === null) return { kind: 'error', text: renderNoPig('pig') }
  const result = store.act(action)
  if (!result.ok) {
    if (result.reason === 'cooldown') return { kind: 'success', text: renderTooSoon(state, Date.now(), action) }
    if (result.reason === 'away') return { kind: 'success', text: renderWorkRefusal(state, `${state.name} 正在外面，回来再说。`) }
    if (result.reason === 'dead') return { kind: 'error', text: `${state.name} 已经走了…用 ${REVIVE_ITEM.label} 可以救回来。` }
    if (result.reason === 'absent') return { kind: 'error', text: renderNoPig('pig') }
    return { kind: 'error', text: `🐖 ${ACTIONS[action]?.label ?? action} 没做成。` }
  }
  return { kind: 'success', text: renderAction(store.freshen(), Date.now(), action, result.crossed) }
}

export function dispatch(store, commandName, rawInput) {
  const trimmed = rawInput.trim()
  const [sub, ...rest] = trimmed === '' ? [''] : trimmed.split(/\s+/)
  const argument = rest.join(' ')
  const state = store.freshen()
  const nowMs = Date.now()
  const verb = sub.toLowerCase()

  switch (verb) {
    case '':
    case 'status': {
      if (state === null) return { kind: 'success', text: renderNoPig(commandName) }
      return { kind: 'success', text: renderStatus(state, nowMs) }
    }
    case 'hatch': {
      if (store.hatch()) return { kind: 'success', text: renderHatch(store.state, nowMs) }
      const existing = store.freshen()
      return { kind: 'success', text: `这里已经住着 ${existing.name} 了 🐖\n\n${renderStatus(existing, nowMs)}` }
    }
    case 'feed':
    case 'bathe':
    case 'play':
    case 'pet':
    case 'mo':
      return performAction(store, verb === 'mo' ? 'pet' : verb)

    case 'work': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const key = argument.trim() === '' ? 'odd' : argument.trim()
      const job = JOBS.find(j => j.key === key || j.label === key)
      if (job === undefined) return { kind: 'error', text: `没有「${key}」这份工作。/${commandName} work 看有哪些。` }
      const result = store.startWork(job.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderWorkReport(store.freshen(), Date.now(), job) }
    }

    case 'study': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const [subjectArg = '', stageArg = SCHOOL_STAGES[0].key] = argument.trim().split(/\s+/)
      const subject = SUBJECTS.find(s => s.key === subjectArg || s.label === subjectArg)
      const stage = SCHOOL_STAGES.find(s => s.key === stageArg || s.label === stageArg)
      if (subject === undefined || stage === undefined) {
        return { kind: 'error', text: `用法：/${commandName} study <科目> <学段>\n学段：${SCHOOL_STAGES.map(s => s.label).join(' · ')}\n科目：${SUBJECTS.map(s => s.label).join(' · ')}` }
      }
      const result = store.startStudy(subject.key, stage.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderStudyReport(store.freshen(), Date.now(), subject, stage) }
    }

    case 'trip':
    case 'travel': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const key = argument.trim() === '' ? 'suburb' : argument.trim()
      const trip = TRIPS.find(t => t.key === key || t.label === key)
      if (trip === undefined) return { kind: 'error', text: `没有「${key}」这个目的地。/${commandName} trip 看有哪些。` }
      const result = store.startTrip(trip.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderTripReport(store.freshen(), Date.now(), trip) }
    }

    case 'calloff': {
      const result = store.callOffActivity()
      if (!result.ok) return { kind: 'success', text: `${state?.name ?? '猪'} 没在外面。` }
      return {
        kind: 'success',
        text: result.refunded > 0
          ? `${state.name} 提前回来了，退回 ${result.refunded} 金币。`
          : `${state.name} 提前回来了，这趟白跑。`,
      }
    }

    case 'shop': {
      const lines = SHOP.map(item => `  ${item.emoji} ${item.label}  ${item.price} 金币`).join('\n')
      return { kind: 'success', text: `🛒 商店（你有 ${state?.coins ?? 0} 金币）\n${lines}\n\n买：/${commandName} buy <物品>` }
    }
    case 'buy': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const item = SHOP.find(i => i.key === argument.trim() || i.label === argument.trim())
      if (item === undefined) return { kind: 'error', text: `没有「${argument}」这样东西。/${commandName} shop 看货架。` }
      return { kind: 'success', text: renderBuy(store.freshen(), store.buy(item.key), item) }
    }
    case 'use': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const item = SHOP.find(i => i.key === argument.trim() || i.label === argument.trim())
      if (item === undefined) return { kind: 'error', text: `没有「${argument}」这样东西。` }
      return { kind: 'success', text: renderUse(store.freshen(), store.useItem(item.key), item) }
    }
    case 'weigh': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      return { kind: 'success', text: renderWeigh(state, nowMs) }
    }
    case 'name': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const cleaned = store.rename(argument)
      if (cleaned === null) return { kind: 'error', text: `用法：/${commandName} name <名字>（16 字以内）` }
      return { kind: 'success', text: `从今天起，它叫「${cleaned}」🐖` }
    }
    case 'about':
    case 'help':
      return { kind: 'success', text: renderAbout(commandName) }
    default:
      return {
        kind: 'error',
        text: `不认识「${sub}」。可用：/${commandName} · hatch · feed · bathe · play · pet · study · work · trip · shop · buy · use · weigh · name · about`,
      }
  }
}

function refusalText(result, state) {
  switch (result.reason) {
    case 'dead': return `${state.name} 已经走了…`
    case 'away': return `${state.name} 已经在外面了。`
    case 'sick': return `${state.name} 病着，不能出门 —— 先治好它。`
    case 'hungry': return `${state.name} 太饿了，先喂点东西。`
    case 'poor': return `钱不够，需要 ${result.price} 金币，你只有 ${state.coins}。`
    case 'underqualified': {
      const want = (result.missing ?? []).map(entry => `${entry.emoji} ${entry.label} ${entry.need}（现在 ${entry.have}）`).join('、')
      return `这份工作还轮不到它 —— 需要 ${want}。去「学习」上课就能涨。`
    }
    case 'wrong-stage':
      return `${result.stage}没有「${result.subject}」这门课 —— 换个学段，或者换一门课。`
    case 'locked': {
      const need = result.need
      return need === null || need === undefined
        ? '这一级还没解锁 —— 先把上一级的课念完。'
        : `要先念完${need.label}（${need.done}/${need.need}）。`
    }
    case 'unknown': return '没有这个选项。'
    default: return '现在没法出门。'
  }
}

export { jobByKey, MAX, SHOP, JOBS, SUBJECTS, SCHOOL_STAGES, TRIPS, TRAITS, TRAIT_ORDER }

/**
 * Register the `/pig` fallback command. The GUI is the primary path; this is
 * what still works when the panel cannot mount.
 * @param {object} ctx - plugin context
 * @param {object} store - the pig store
 * @param {string} commandName - validated command name
 */
export function registerSlashCommand(ctx, store, commandName) {
  ctx.inject(['commands'], (commandCtx) => {
    commandCtx.commands.register({
      name: commandName,
      description: 'your pig 🐖: status · study · work · shop · travel · bag',
      input: { hint: '[hatch|feed|bathe|play|pet|study <科目>|work <job>|trip <目的地>|shop|buy|use|weigh|about]' },
      handler: invocation => {
        try {
          return dispatch(store, commandName, String(invocation.rawInput ?? ''))
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error)
          return { kind: 'error', text: `🐖 猪摔了一跤：${detail}` }
        }
      },
    })
  })
}
