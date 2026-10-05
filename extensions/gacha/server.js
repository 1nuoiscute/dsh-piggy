// 扭蛋扩展 1.0；数值见 docs/tasks/numbers/X2-gacha.md。
// 扩展只保存自己的幸运值和记录；金币、背包和说话都经宿主 api。

const item = (key, label, emoji, count = 1) => ({ key, label, emoji, count })

export const POOLS = {
  snack: {
    label: '零食机', emoji: '🍬',
    normal: [item('apple', '苹果', '🍎'), item('bread', '面包', '🍞'), item('strawberry', '草莓', '🍓'), item('fish', '小鱼干', '🐟'), item('sweetpotato', '烤红薯', '🍠'), item('bone', '肉骨头', '🍖')],
    rare: [item('rice', '蛋炒饭', '🍚'), item('pumpkin', '南瓜粥', '🎃'), item('cake', '奶油蛋糕', '🎂'), item('skewer', '烤肉串', '🍢'), item('noodle', '大碗拉面', '🍜')],
    gold: [item('feast', '豪华大餐', '🍱', 3), item('seafoodrice', '海鲜饭', '🥘', 3), item('feast', '豪华大餐', '🍱', 5)],
  },
  goods: {
    label: '杂货机', emoji: '🧸',
    normal: [item('soap', '香皂', '🧼'), item('shower', '冲个澡', '🚿'), item('shampoo', '沐浴露', '🧴'), item('balloon', '气球', '🎈'), item('candle', '香薰', '🕯'), item('bait_worm', '蚯蚓鱼饵', '🪱')],
    rare: [item('bubble', '泡泡浴', '🛁'), item('yoyo', '悠悠球', '🪀'), item('citrusbath', '柚子浴', '🍊'), item('blocks', '积木', '🎲'), item('frisbee', '飞盘', '🥏'), item('bait_shrimp', '鲜虾鱼饵', '🦐')],
    gold: [item('trampoline', '蹦床', '🤸'), item('carousel', '旋转木马', '🎠'), item('bubbles', '泡泡机', '🫧'), item('deadsea', '死海泥', '🫧', 2), item('bait_glow', '夜光鱼饵', '✨', 5)],
  },
  medicine: {
    label: '药箱', emoji: '💊',
    normal: [item('banlangen', '板蓝根', '🌿'), item('pipa-syrup', '枇杷糖浆', '🍯'), item('xiaoshipian', '消食片', '💊'), item('qingliangyou', '清凉油', '🟢'), item('runfulu', '润肤露', '🧴')],
    rare: [item('tuishaoyao', '退烧药', '💊'), item('gancaoji', '甘草剂', '🌾'), item('lanse-xiaoyan', '蓝色消炎水', '🧪'), item('zhitongpian', '止痛片', '💊'), item('bohe-you', '薄荷油', '🍃')],
    gold: [item('baicaodan', '百草丹', '🌿'), item('soul', '还魂丹', '✨')],
  },
}

/** 本地日期从 06:00 开始。Date 的本地字段跟着宿主时区走。 */
export function gameDay(now) {
  const date = new Date(now)
  date.setHours(date.getHours() - 6)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function normalize(data) {
  if (!Number.isInteger(data.luck) || data.luck < 0) data.luck = 0
  if (!Number.isInteger(data.seq) || data.seq < 0) data.seq = 0
  if (!Array.isArray(data.history)) data.history = []
  if (typeof data.freeDay !== 'string') data.freeDay = ''
  return data
}

function choose(pool, random) {
  const r = Math.max(0, Math.min(0.999999999, Number(random()) || 0))
  return pool[Math.floor(r * pool.length)]
}

function roll(data, machine, random) {
  const r = Math.max(0, Math.min(0.999999999, Number(random()) || 0))
  const rarity = data.luck >= 20 || r < 0.03 ? 'gold' : r < 0.20 ? 'rare' : 'normal'
  data.luck = rarity === 'gold' ? 0 : data.luck + 1
  const picked = choose(POOLS[machine][rarity], random)
  const count = rarity === 'normal' ? (machine === 'medicine' ? 1 : 3) : rarity === 'rare' ? (machine === 'medicine' ? 1 : 2) : picked.count
  return { key: picked.key, label: picked.label, emoji: picked.emoji, count, rarity }
}

export default {
  init() { return { luck: 0, freeDay: '', history: [], last: null, seq: 0 } },

  actions: {
    spin(data, payload, api, random = Math.random) {
      if (!Object.hasOwn(POOLS, payload.machine)) return { ok: false, reason: 'unknown-machine' }
      if (payload.count !== 1 && payload.count !== 10) return { ok: false, reason: 'unknown-count' }
      normalize(data)
      const day = gameDay(api.now)
      const free = payload.count === 1 && data.freeDay !== day
      if (!free && !api.spend(payload.count === 10 ? 540 : 60)) return { ok: false, reason: 'poor' }
      if (free) data.freeDay = day
      const items = []
      for (let i = 0; i < payload.count; i += 1) {
        const got = roll(data, payload.machine, random)
        if (!api.give(got.key, got.count)) throw new Error('物品不存在：' + got.key)
        items.push(got)
      }
      data.seq += 1
      data.last = { id: data.seq, machine: payload.machine, items }
      data.history = items.concat(data.history).slice(0, 30)
      const best = items.find(got => got.rarity === 'gold')
      api.say(best ? '金色的！！是' + best.label + '！' : items.length === 1 ? '又是' + items[0].label + '……' : '十颗扭蛋都放进背包啦！')
      return { ok: true }
    },
  },

  view(data, api) {
    const d = normalize(structuredClone(data))
    return {
      machines: Object.entries(POOLS).map(([key, pool]) => ({ key, label: pool.label, emoji: pool.emoji })),
      coins: api.coins(), prices: { one: 60, ten: 540 }, free: d.freeDay !== gameDay(api.now),
      luck: d.luck, pityLeft: Math.max(0, 20 - d.luck), last: d.last, history: d.history,
    }
  },
}
