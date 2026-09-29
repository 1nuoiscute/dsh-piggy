/**
 * dsh-pig · render — every word the pig says.
 *
 * Pure string building: the command handlers, the HTTP actions, the tests and
 * the client bubble all read from here, so the pig's voice lives in exactly one
 * file.
 *
 * @module dsh-pig/render
 */

import {
  ACTIONS,
  ACTION_ORDER,
  JOBS,
  MAX,
  REVIVE_ITEM,
  SCHOOL_STAGES,
  SHOP,
  SUBJECTS,
  TRAITS,
  TRAIT_ORDER,
  TRIPS,
  actionCooldownSeconds,
  activitySecondsLeft,
  bar,
  courseView,
  formatWeight,
  healthPercent,
  mood,
  nextStageFor,
  stageFor,
  traitView,
  xpToNext,
} from './core.js'
import { illnessAt } from './data.js'

const RULE = '━━━━━━━━━━━━━━━━━━━━━━━━━━'

/** Which portrait face matches the mood. */
function face(currentMood) {
  switch (currentMood.key) {
    case 'sleepy': return { l: '˘', r: '˘', m: 'ω' }
    case 'hungry': return { l: '◕', r: '◕', m: 'o' }
    case 'dirty': return { l: 'ò', r: 'ó', m: '益' }
    case 'sick': return { l: '×', r: '×', m: '︿' }
    case 'dead': return { l: '×', r: '×', m: '︵' }
    case 'working': return { l: '•', r: '•', m: 'ω' }
    case 'happy': return { l: '^', r: '^', m: 'ω' }
    case 'lonely': return { l: '◕', r: '◕', m: '︵' }
    default: return { l: '◕', r: '◕', m: 'ω' }
  }
}

/** 🐖 with a face that follows the mood. */
export function portrait(stage, currentMood) {
  if (stage.level === 1) {
    return [
      '      🥚',
      '   ╭───────╮',
      '   │  〜〜  │',
      '   ╰───────╯',
    ]
  }
  const f = face(currentMood)
  const hat = currentMood.key === 'working' ? ' 💼' : currentMood.key === 'dead' ? ' 💀' : ''
  return [
    `      ${stage.emoji}${hat}`,
    '   ╭───────╮',
    `   │ ${f.l}   ${f.r} │`,
    `   │   ${f.m}   │`,
    '   ╰───────╯',
  ]
}

function xpLine(state) {
  const next = nextStageFor(state.xp)
  if (next === null) return `✨ 经验  ${state.xp}  ·  已到顶 🏔`
  return `✨ 经验  ${state.xp} / ${next.xp}   还差 ${xpToNext(state.xp)}`
}

function statusLine(state, nowMs) {
  if (state.dead) return '💀 状态  已经走了 · 用 ' + REVIVE_ITEM.label + ' 可以救回来'
  if (state.activity !== null) {
    const left = activitySecondsLeft(state, nowMs)
    const kind = state.activity.kind === 'study' ? '上课' : state.activity.kind === 'trip' ? '旅行' : '打工'
    return `${state.activity.emoji} ${kind}  ${state.activity.label}中 · 还有 ${left} 秒`
  }
  const ill = state.illness === null ? null : illnessAt(state.illness.chain, state.illness.stage)
  if (ill !== null) return `🤒 生病  ${ill.name}（第 ${ill.stage}/4 期）· 需要「${ill.cure}」`
  return null
}

/** The three QQ Pet traits, as one line. */
function traitsLine(state) {
  const traits = traitView(state)
  return TRAIT_ORDER
    .map(key => `${TRAITS[key].emoji} ${TRAITS[key].label} ${traits[key]}`)
    .join('   ')
}

function memoriesBlock(state) {
  if (state.memories.length === 0) return []
  return ['', '🕘 最近', ...state.memories.slice(-4).map(line => `   ${line}`)]
}

/** The full `/pig` card. */
export function renderStatus(state, nowMs) {
  const stage = stageFor(state.xp)
  const current = mood(state, nowMs)
  const special = statusLine(state, nowMs)
  const lines = [
    `${stage.emoji} ${state.name}  Lv.${stage.level}「${stage.title}」   ${current.emoji} ${current.label}`,
    RULE,
    `🍚 饱食  ${bar(state.satiety)}  ${Math.round(state.satiety)}`,
    `❤️  心情  ${bar(state.happiness)}  ${Math.round(state.happiness)}`,
    `🫧 清洁  ${bar(state.cleanliness)}  ${Math.round(state.cleanliness)}`,
    `💚 健康  ${bar(healthPercent(state))}  ${state.health}/${MAX.health}`,
    `🪙 金币  ${state.coins}`,
    `⚖️  体重  ${formatWeight(state.weightG)}`,
    xpLine(state),
    traitsLine(state),
  ]
  if (special !== null) lines.push(RULE, special)
  lines.push(
    RULE,
    ...portrait(stage, current),
    `    「${stage.line}」`,
    RULE,
    '🍽  完成回合 +5 · 发消息 +2 · 工具调用 +3 · 报错也长肉',
    '👆  右下角的猪点着就能养：喂食 · 洗澡 · 玩耍 · 打工 · 商店',
  )
  return [...lines, ...memoriesBlock(state)].join('\n')
}

/** The hatching ceremony. */
export function renderHatch(state, nowMs) {
  const stage = stageFor(state.xp)
  return [
    '   蛋壳裂开了 ——',
    '',
    ...portrait(stage, mood(state, nowMs)),
    '',
    `✨ ${stage.emoji} ${state.name} 出生了（Lv.${stage.level}「${stage.title}」）`,
    `   「${stage.line}」`,
    '',
    `初始盘缠：🪙 ${state.coins} 金币。`,
    '正常干活就能养活它；右下角的猪点一下就能喂食、洗澡、送去打工。',
  ].join('\n')
}

/** One care action's outcome card. */
export function renderAction(state, nowMs, action, crossed) {
  const spec = ACTIONS[action]
  if (spec === undefined) return '🐖 不认识这个动作。'
  const current = mood(state, nowMs)
  const lines = [
    `${state.name} ${spec.verb}`,
    '',
    ...portrait(stageFor(state.xp), current),
    '',
    `🍚 饱食  ${bar(state.satiety)}  ${Math.round(state.satiety)}`,
    `❤️  心情  ${bar(state.happiness)}  ${Math.round(state.happiness)}`,
    `🫧 清洁  ${bar(state.cleanliness)}  ${Math.round(state.cleanliness)}`,
  ]
  for (const stage of crossed ?? []) lines.push('', `🎉 长成了「${stage.title}」${stage.emoji}`)
  const wait = actionCooldownSeconds(state, action, nowMs)
  if (wait > 0) lines.push('', `（${wait} 秒后还能再来一次）`)
  return lines.join('\n')
}

/** The refusal card when a care action is still cooling down. */
export function renderTooSoon(state, nowMs, action) {
  const spec = ACTIONS[action]
  if (spec === undefined) return '🐖 不认识这个动作。'
  const wait = actionCooldownSeconds(state, action, nowMs)
  const hints = {
    feed: `${state.name} 摆摆手：刚吃过，肚子还圆着呢。`,
    bathe: `${state.name} 缩了缩：刚洗完，香着呢，别再冲水了。`,
    play: `${state.name} 喘着气：让我歇会儿，刚玩过。`,
    pet: `${state.name} 还没缓过来。`,
  }
  return [hints[action] ?? `${state.name} 现在不想动。`, '', `${wait} 秒后可以再${spec.label}。`].join('\n')
}

/** Sent the pig out to work. */
export function renderWorkReport(state, nowMs, job) {
  return [
    `${state.name} 背上小包出门了 ${job.emoji}`,
    '',
    `💼 工作    ${job.label}`,
    `⏱  时长    ${job.minutes} 分钟`,
    `🪙 报酬    ${job.coins} 金币`,
    `🍚 消耗    饱食 ${job.satiety} · 清洁 ${job.cleanliness}`,
    '',
    `预计 ${activitySecondsLeft(state, nowMs)} 秒后回来。这期间不能喂食洗澡 —— 它在外面忙着。`,
  ].join('\n')
}

/** Sent the pig to class. */
export function renderStudyReport(state, nowMs, subject, stage) {
  const level = courseView(state)[subject.key] ?? 0
  return [
    `${state.name} 背上书包去上课了 ${subject.emoji}`,
    '',
    `📚 课程    ${stage.label}${subject.label}`,
    `⏱  时长    ${stage.minutes} 分钟`,
    `🪙 学费    ${stage.tuition} 金币`,
    `📈 收获    ${TRAITS[subject.trait].label} +${stage.gain} · 经验 +${stage.xp}`,
    `🍚 消耗    饱食 ${stage.satiety} · 心情 ${stage.happiness}`,
    '',
    `这门课已经上了 ${level} 次。预计 ${activitySecondsLeft(state, nowMs)} 秒后下课。`,
  ].join('\n')
}

/** Sent the pig travelling. */
export function renderTripReport(state, nowMs, trip) {
  return [
    `${state.name} 拖着小行李箱出发了 ${trip.emoji}`,
    '',
    `🧳 目的地  ${trip.label}`,
    `⏱  时长    ${trip.minutes} 分钟`,
    `🪙 花费    ${trip.cost} 金币`,
    `❤️  心情    +${trip.happiness} · 经验 +${trip.xp}`,
    `🍚 消耗    饱食 ${trip.satiety}`,
    '',
    `会带回一件纪念品。预计 ${activitySecondsLeft(state, nowMs)} 秒后回来。`,
  ].join('\n')
}

/** A refusal from the work path, with the reason spelled out. */
export function renderWorkRefusal(state, text) {
  return [
    `💼 出不了门`,
    '',
    text,
    '',
    `现在：${mood(state, Date.now()).emoji} ${mood(state, Date.now()).label} · 🍚 ${Math.round(state.satiety)} · 🪙 ${state.coins}`,
  ].join('\n')
}

/** Bought something. */
export function renderBuy(state, result, item) {
  if (result?.ok !== true) {
    if (result?.reason === 'poor') return `🪙 钱不够：${item.emoji} ${item.label} 要 ${item.price} 金币，你只有 ${state?.coins ?? 0}。`
    if (result?.reason === 'dead') return `${state?.name ?? '猪'} 已经走了…先救回来再买东西。`
    return `🐖 没能买下 ${item.label}。`
  }
  return [
    `🛒 买到了 ${item.emoji} ${item.label}（-${item.price} 金币）`,
    '',
    `🪙 余额    ${state.coins}`,
    `🎒 背包    ${item.label} ×${state.inventory?.[item.key] ?? 0}`,
    '',
    `用起来：/pig use ${item.key}`,
  ].join('\n')
}

/** Used something from the backpack. */
export function renderUse(state, result, item) {
  if (result?.ok !== true) {
    switch (result?.reason) {
      case 'empty': return `🎒 背包里没有 ${item.emoji} ${item.label}。先去 /pig shop 买。`
      case 'not-sick': return `${state?.name ?? '猪'} 现在没生病，吃药没用。`
      case 'not-dead': return `${state?.name ?? '猪'} 活得好好的，用不上 ${REVIVE_ITEM.label}。`
      case 'dead': return `${state?.name ?? '猪'} 已经走了…只有 ${REVIVE_ITEM.label} 能救回来。`
      case 'wrong-medicine': {
        const need = result.needs
        return `💊 药不对症。${state?.name ?? '猪'} 现在需要的是「${need?.label ?? '别的药'}」。`
      }
      case 'working': return `${state?.name ?? '猪'} 在外面打工，回来再吃。`
      default: return `🐖 没能用上 ${item.label}。`
    }
  }
  const lines = [`${state.name} 用了 ${item.emoji} ${item.label}`]
  if (item.kind === 'medicine') lines.push('', '💚 病好了！健康恢复满值。')
  else if (item.kind === 'revive') lines.push('', '✨ 回来了！等级、经验和金币都还在。')
  else {
    lines.push(
      '',
      `🍚 饱食  ${bar(state.satiety)}  ${Math.round(state.satiety)}`,
      `❤️  心情  ${bar(state.happiness)}  ${Math.round(state.happiness)}`,
      `🫧 清洁  ${bar(state.cleanliness)}  ${Math.round(state.cleanliness)}`,
    )
  }
  for (const stage of result.crossed ?? []) lines.push('', `🎉 长成了「${stage.title}」${stage.emoji}`)
  return lines.join('\n')
}

/** The scales. */
export function renderWeigh(state, nowMs) {
  const stage = stageFor(state.xp)
  const kilos = state.weightG / 1000
  let verdict = '还算苗条，继续保持'
  if (kilos >= 40) verdict = '这已经是一头正经的猪了'
  else if (kilos >= 15) verdict = '抱起来有点费劲'
  else if (kilos >= 6) verdict = '手感很好，沉甸甸的'
  else if (kilos >= 3) verdict = '圆润，但还能抱得动'
  return [
    `⚖️  ${state.name} 站上了秤`,
    '',
    `        ${stage.emoji}`,
    `     ${formatWeight(state.weightG)}`,
    '',
    `   「${verdict}」`,
  ].join('\n')
}

/** `/pig about`. */
export function renderAbout(commandName) {
  const actions = ACTION_ORDER.map(key => `  ${ACTIONS[key].emoji} ${ACTIONS[key].label}`).join(' · ')
  const jobs = JOBS.map(job => `  ${job.emoji} ${job.label}（${job.minutes} 分钟 · ${job.coins} 金币）`).join('\n')
  const courses = SUBJECTS.map(s => `${s.emoji}${s.label}`).join(' ')
  const stages = SCHOOL_STAGES.map(s => `${s.label}（${s.minutes} 分钟 · 学费 ${s.tuition} · +${s.gain}）`).join('\n')
  const trips = TRIPS.map(t => `  ${t.emoji} ${t.label}（${t.minutes} 分钟 · ${t.cost} 金币）`).join('\n')
  const shop = SHOP.map(item => `  ${item.emoji} ${item.label}  ${String(item.price).padStart(3)} 金币`).join('\n')
  return [
    '🐖 dsh-pig —— 一只住在 DSH 里的猪',
    RULE,
    '最省事的用法：点右下角的 🐖，面板上六个图标点着用。',
    '  ① 状态  ② 学习  ③ 打工  ④ 商店  ⑤ 旅行  ⑥ 背包',
    RULE,
    `照顾：${actions}`,
    '',
    '📚 学习（涨智力 / 魅力 / 武力）：',
    `  ${courses}`,
    stages,
    '',
    '💼 打工（出门赚钱）：',
    jobs,
    '',
    '🧳 旅行（带回纪念品）：',
    trips,
    '',
    '🛒 商店：',
    shop,
    '',
    '🤒 生病：饿着或脏着太久会得病，健康上限 5。必须对症下药；',
    `      健康归零就没了，用 ${REVIVE_ITEM.label} 救回来（保留等级、金币和收藏）。`,
    RULE,
    '命令（不想点鼠标时才用）：',
    `/${commandName} · hatch · feed · bathe · play · pet`,
    `/${commandName} study <科目> <小学|大学|研究生>`,
    `/${commandName} work <odd|site|office> · trip <suburb|mountain|sea|abroad> · calloff`,
    `/${commandName} shop · buy <物品> · use <物品>`,
    `/${commandName} weigh · name <名字> · about`,
    RULE,
    '它不调用模型、不注入上下文、不花一个 token。',
    '存档在 $DSH_HOME/dsh-pig/state.json。',
  ].join('\n')
}

/** The empty-house prompt. */
export function renderNoPig(commandName) {
  return `这里还没有猪。/${commandName} hatch 孵一只 🥚 —— 它会吃你之后的真实工作长大。`
}
