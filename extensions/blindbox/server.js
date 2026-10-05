// 盲盒扩展 · 宿主部分（设计 docs/design/blindbox.md，数值 docs/tasks/numbers/X1-blindbox.md）。
// 只出摆件（用户 2026-10-05：装扮先不碰）。每个系列 6 个普通款 + 1 个隐藏款，单独算保底和碎片。
// 只能改自己的数据；花钱、用盲盒券、让猪说话都走游戏给的 api。

const PRICE_ONE = 300
const PRICE_TEN = 2700
const HIDDEN_BASE = 0.03
const SOFT_FROM = 30
const SOFT_STEP = 0.07
const HARD_AT = 50
const SHARD_DUP = 1
const SHARD_DUP_HIDDEN = 5
const SWAP_NORMAL = 10
const SWAP_HIDDEN = 40
const TICKET = 'boxticket'

const item = (key, emoji, label, blurb) => ({ key, emoji, label, blurb })

export const SERIES = [
  {
    key: 'farm', emoji: '🌾', label: '农场好朋友', theme: 'farm',
    items: [
      item('chick', '🐥', '小鸡', '每天叫得比闹钟准，就是没有关闭按钮'),
      item('cow', '🐄', '奶牛', '慢慢嚼，慢慢想，什么都不急'),
      item('sheep', '🐑', '绵羊', '数它的时候它也在数你'),
      item('duck', '🦆', '鸭子', '走路一摇一摆，自信是天生的'),
      item('rabbit', '🐇', '兔子', '耳朵比胆子大'),
      item('dog', '🐕', '小狗', '看家第一名，看饭盆也是第一名'),
    ],
    hidden: item('goldpig', '🐷', '金猪', '农场里唯一一只没人敢吃的猪'),
    hiddenLine: '金……金猪？！它在发光！',
  },
  {
    key: 'beach', emoji: '🏖', label: '海边假日', theme: 'beach',
    items: [
      item('crab', '🦀', '螃蟹', '横着走也能走得很远'),
      item('shell', '🐚', '贝壳', '贴在耳边能听见大海，也能听见饭点'),
      item('octopus', '🐙', '章鱼', '八只手，一次能拿八个零食'),
      item('turtle', '🐢', '海龟', '游了一百年，还是不着急'),
      item('seal', '🦭', '海豹', '在沙滩上晒成一条软软的面包'),
      item('dolphin', '🐬', '海豚', '据说会笑，其实是天生长这样'),
    ],
    hidden: item('whale', '🐳', '大鲸鱼', '它打个喷嚏，整片海都下了一场雨'),
    hiddenLine: '是大鲸鱼！整片海都是它的！',
  },
  {
    key: 'night', emoji: '🌙', label: '深夜食堂', theme: 'night',
    items: [
      item('ramen', '🍜', '拉面', '深夜十二点的热气是有魔法的'),
      item('oden', '🍢', '关东煮', '一串接一串，停不下来'),
      item('onigiri', '🍙', '饭团', '捏得圆圆的，像猪的脸'),
      item('dumpling', '🥟', '饺子', '里面包了什么？不要问'),
      item('dango', '🍡', '团子', '三个一串，刚好一人一个'),
      item('tea', '🍵', '热茶', '喝一口，今天就算结束了'),
    ],
    hidden: item('lantern', '🏮', '灯笼小摊', '只在你最饿的那天晚上出现'),
    hiddenLine: '灯笼亮了……深夜食堂开张了！',
  },
]

const seriesByKey = key => SERIES.find(entry => entry.key === key) ?? null

function slot(data, key) {
  if (data.series === undefined || data.series === null || typeof data.series !== 'object') data.series = {}
  // 在原对象上补齐，别换新对象（外面可能还拿着它）。
  const s = data.series[key] !== null && typeof data.series[key] === 'object' ? data.series[key] : (data.series[key] = {})
  if (!Number.isInteger(s.pulls)) s.pulls = 0
  if (!Number.isInteger(s.since)) s.since = 0
  if (!Number.isInteger(s.shards)) s.shards = 0
  if (s.have === null || typeof s.have !== 'object') s.have = {}
  return s
}

/** 这一抽出隐藏款的概率（since = 上次出隐藏款以来已经抽了几次）。 */
export function hiddenChance(since) {
  const nth = since + 1
  if (nth >= HARD_AT) return 1
  // 软保底最多涨到 95%，只有第 50 抽是 100%（不然第 43 抽就已经必出了）。
  return Math.min(0.95, HIDDEN_BASE + (nth >= SOFT_FROM ? (nth - SOFT_FROM + 1) * SOFT_STEP : 0))
}

function pullOne(s, def, random) {
  s.pulls += 1
  const hidden = random() < hiddenChance(s.since)
  s.since = hidden ? 0 : s.since + 1
  const got = hidden ? def.hidden : def.items[Math.min(def.items.length - 1, Math.floor(random() * def.items.length))]
  const before = s.have[got.key] ?? 0
  s.have[got.key] = before + 1
  const shards = before > 0 ? (hidden ? SHARD_DUP_HIDDEN : SHARD_DUP) : 0
  s.shards += shards
  return { key: got.key, hidden, isNew: before === 0, shards }
}

function remember(data, series, items) {
  data.seq = (Number.isInteger(data.seq) ? data.seq : 0) + 1
  data.last = { id: data.seq, series, items }
}

function lineFor(def, items) {
  const hidden = items.find(entry => entry.hidden)
  if (hidden) return def.hiddenLine
  const fresh = items.filter(entry => entry.isNew)
  const first = [...def.items, def.hidden].find(entry => entry.key === items[0].key)
  if (items.length === 1) return fresh.length > 0 ? '是' + first.label + '！我要把它摆在最显眼的地方' : '又是' + first.label + '……没关系，攒碎片'
  return fresh.length > 0 ? '十连开完了，新来了 ' + fresh.length + ' 个朋友！' : '十连全是见过的……碎片多了一大把'
}

export default {
  init() { return { series: {}, last: null, seq: 0 } },

  actions: {
    /** 开盒：count 1 或 10；ticket 为真时用一张盲盒券开 1 个。 */
    open(data, payload, api, random = Math.random) {
      const def = seriesByKey(payload.series)
      if (def === null) return { ok: false, reason: 'unknown' }
      const count = payload.count === 10 ? 10 : 1
      if (payload.ticket === true && count === 1) {
        if (!api.take(TICKET, 1)) return { ok: false, reason: 'no-ticket' }
      } else if (!api.spend(count === 10 ? PRICE_TEN : PRICE_ONE)) {
        return { ok: false, reason: 'poor' }
      }
      const s = slot(data, def.key)
      const items = []
      for (let i = 0; i < count; i += 1) items.push(pullOne(s, def, random))
      remember(data, def.key, items)
      api.say(lineFor(def, items))
      return { ok: true }
    },

    /** 用碎片换一个还没有的。 */
    swap(data, payload, api) {
      const def = seriesByKey(payload.series)
      if (def === null) return { ok: false, reason: 'unknown' }
      const target = [...def.items, def.hidden].find(entry => entry.key === payload.item)
      if (target === undefined) return { ok: false, reason: 'unknown' }
      const s = slot(data, def.key)
      if ((s.have[target.key] ?? 0) > 0) return { ok: false, reason: 'owned' }
      const hidden = target === def.hidden
      const cost = hidden ? SWAP_HIDDEN : SWAP_NORMAL
      if (s.shards < cost) return { ok: false, reason: 'no-shards' }
      s.shards -= cost
      s.have[target.key] = 1
      remember(data, def.key, [{ key: target.key, hidden, isNew: true, shards: 0, swapped: true }])
      api.say(hidden ? def.hiddenLine : '用碎片换来了' + target.label + '！')
      return { ok: true }
    },
  },

  view(data, api) {
    return {
      prices: { one: PRICE_ONE, ten: PRICE_TEN },
      swap: { normal: SWAP_NORMAL, hidden: SWAP_HIDDEN },
      tickets: api.count(TICKET),
      coins: api.coins(),
      last: data.last ?? null,
      series: SERIES.map(def => {
        const s = slot(structuredClone(data), def.key)
        const all = [...def.items.map(entry => ({ ...entry, hidden: false })), { ...def.hidden, hidden: true }]
        const items = all.map(entry => ({ ...entry, count: s.have[entry.key] ?? 0 }))
        return {
          key: def.key, emoji: def.emoji, label: def.label, theme: def.theme,
          items, shards: s.shards, pulls: s.pulls,
          pityLeft: HARD_AT - s.since,
          owned: items.filter(entry => entry.count > 0).length,
        }
      }),
    }
  },
}
