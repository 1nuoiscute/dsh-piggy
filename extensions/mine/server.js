// 矿洞扩展：地图和时间计算只依赖传入参数，存档只保留已挖进度。
const WIDTH = 6
const SIZE = 48
const TEN_MINUTES = 600_000
const ORES = [
  { key: 'coal', emoji: '⚫', label: '煤', unlock: 1, price: 8 },
  { key: 'copper', emoji: '🟠', label: '铜', unlock: 1, price: 15 },
  { key: 'silver', emoji: '⚪', label: '银', unlock: 3, price: 35 },
  { key: 'gold', emoji: '🟡', label: '金', unlock: 5, price: 80 },
  { key: 'gem', emoji: '💎', label: '宝石', unlock: 8, price: 200 },
]
const FOSSILS = [
  { key: 'bone', emoji: '🦴', label: '骨头' },
  { key: 'ammonite', emoji: '🐚', label: '菊石' },
  { key: 'dinosaur', emoji: '🦕', label: '恐龙骨' },
  { key: 'trex', emoji: '🦖', label: '霸王龙牙' },
  { key: 'feather', emoji: '🪶', label: '羽毛化石' },
  { key: 'fish', emoji: '🐟', label: '鱼化石' },
]
const SHOP = [
  { key: 'iron', emoji: '⛏️', label: '铁镐', note: '石头、矿和化石少挖 1 下', price: 1500 },
  { key: 'diamond', emoji: '💠', label: '钻石镐', note: '再少挖 1 下，硬岩也少挖 1 下', price: 6000 },
  { key: 'drink', emoji: '🥤', label: '体力饮料', note: '恢复 10 体力，每天最多 5 瓶', price: 80 },
]

/** 和游戏一样按本地时间每天早上六点换天。 */
export function dayKey(now) {
  const d = new Date(now - 6 * 3_600_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 32 位整数 PRNG；层和日期相同则序列相同。 */
function randomFor(layer, day) {
  let seed = 2166136261
  for (const char of `${day}:${layer}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0
  return () => { seed = (seed + 0x6d2b79f5) >>> 0; let n = Math.imul(seed ^ seed >>> 15, seed | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296 }
}

function oreFor(layer, random) {
  const pool = ORES.filter(ore => ore.unlock <= layer)
  const weights = pool.map(ore => 1 + ore.unlock * 0.7)
  let roll = random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll < 0) return pool[i] }
  return pool.at(-1)
}

/** 第一行是入口，梯子只在最底两行；化石每层至多一个。 */
export function generateMap(layer, day) {
  const depth = Math.max(1, Math.min(10, Math.floor(layer)))
  const random = randomFor(depth, day)
  const t = (depth - 1) / 9
  const soil = 60 - 35 * t, rock = 25 + 10 * t, hard = 5 + 15 * t, ore = 9 + 9 * t
  const map = Array.from({ length: SIZE }, (_, index) => {
    if (index < WIDTH) return { kind: 'entrance' }
    const roll = random() * (soil + rock + hard + ore)
    if (roll < soil) return { kind: 'soil' }
    if (roll < soil + rock) return { kind: 'rock' }
    if (roll < soil + rock + hard) return { kind: 'hard' }
    const chosen = oreFor(depth, random)
    return { kind: 'ore', key: chosen.key, unlock: chosen.unlock }
  })
  const ladder = 36 + Math.floor(random() * 12)
  map[ladder] = { kind: 'ladder' }
  if (random() < 0.3) {
    let index = WIDTH + Math.floor(random() * (SIZE - WIDTH))
    if (index === ladder) index = index === SIZE - 1 ? index - 1 : index + 1
    map[index] = { kind: 'fossil', key: FOSSILS[Math.floor(random() * FOSSILS.length)].key, unlock: 0 }
  }
  return map
}

export function hitsNeeded(kind, pickaxe) {
  const base = { soil: 1, rock: 2, hard: 3, ore: 2, fossil: 2, ladder: 1 }[kind] ?? 1
  const reduction = pickaxe >= 3 ? (kind === 'hard' ? 1 : 2) : pickaxe >= 2 && ['rock', 'ore', 'fossil'].includes(kind) ? 1 : 0
  return Math.max(1, base - reduction)
}

export function recover(energy, energyAt, now) {
  const gained = Math.floor(Math.max(0, now - energyAt) / TEN_MINUTES)
  const next = Math.min(30, energy + gained)
  return { energy: next, energyAt: next === 30 ? now : energyAt + gained * TEN_MINUTES }
}

export function dayState(data, now) {
  const day = dayKey(now)
  if (data.day !== day) {
    return { ...data, day, layer: 1, maps: {}, surface: false, energy: 30, energyAt: now, drinks: 0 }
  }
  return { ...data, ...recover(data.energy, data.energyAt, now) }
}

export function refresh(data, now) {
  Object.assign(data, dayState(data, now))
  return data
}

function progress(data) {
  return data.maps[data.layer] ?? (data.maps[data.layer] = { open: [0, 1, 2, 3, 4, 5], hits: {} })
}

function adjacent(index, open) {
  const x = index % WIDTH
  return (x > 0 && open.includes(index - 1)) || (x < WIDTH - 1 && open.includes(index + 1)) || open.includes(index - WIDTH) || open.includes(index + WIDTH)
}

function reveal(data, cell, index, api) {
  if (cell.kind === 'ore') {
    data.bag[cell.key] = (data.bag[cell.key] ?? 0) + 1
    if (cell.key === 'gem') data.found.gem = true
    api.say('挖到了' + ORES.find(ore => ore.key === cell.key).label + '！')
  } else if (cell.kind === 'fossil') {
    data.found[cell.key] = true
    api.say('找到了一块' + FOSSILS.find(fossil => fossil.key === cell.key).label + '！')
  } else if (cell.kind === 'ladder') api.say('找到通往下一层的梯子了！')
  data.last = { layer: data.layer, index, kind: cell.kind, key: cell.key ?? null, at: api.now, id: (data.last?.id ?? 0) + 1 }
}

export default {
  init() { return { day: null, layer: 1, maps: {}, surface: false, energy: 30, energyAt: 0, drinks: 0, pickaxe: 1, bag: {}, found: {}, last: null } },
  actions: {
    dig(data, payload, api) {
      refresh(data, api.now)
      const index = payload?.cell
      if (!Number.isInteger(index) || index < WIDTH || index >= SIZE) return { ok: false, reason: 'unknown' }
      if (data.surface) return { ok: false, reason: 'surface' }
      const p = progress(data)
      if (p.open.includes(index)) return { ok: false, reason: 'already-open' }
      if (!adjacent(index, p.open)) return { ok: false, reason: 'not-adjacent' }
      if (data.energy < 1) return { ok: false, reason: 'tired' }
      const cell = generateMap(data.layer, data.day)[index]
      const wasFull = data.energy === 30
      data.energy -= 1
      if (wasFull) data.energyAt = api.now
      p.hits[index] = (p.hits[index] ?? 0) + 1
      if (p.hits[index] >= hitsNeeded(cell.kind, data.pickaxe)) {
        p.open.push(index); delete p.hits[index]; reveal(data, cell, index, api)
      } else data.last = { layer: data.layer, index, kind: 'crack', at: api.now, id: (data.last?.id ?? 0) + 1 }
      return { ok: true }
    },
    descend(data, _payload, api) {
      refresh(data, api.now)
      if (data.layer >= 10) return { ok: false, reason: 'deepest' }
      const ladder = generateMap(data.layer, data.day).findIndex(cell => cell.kind === 'ladder')
      if (!progress(data).open.includes(ladder)) return { ok: false, reason: 'no-ladder' }
      data.layer += 1; data.surface = false
      return { ok: true }
    },
    surface(data, _payload, api) { refresh(data, api.now); data.surface = true; return { ok: true } },
    enter(data, _payload, api) { refresh(data, api.now); data.surface = false; return { ok: true } },
    sell(data, _payload, api) {
      refresh(data, api.now)
      if (!data.surface) return { ok: false, reason: 'underground' }
      const total = ORES.reduce((sum, ore) => sum + (data.bag[ore.key] ?? 0) * ore.price, 0)
      if (!total) return { ok: false, reason: 'empty' }
      api.earn(total); data.bag = {}; api.say('矿石卖了 ' + total + ' 金币！')
      return { ok: true, coins: total }
    },
    buy(data, payload, api) {
      refresh(data, api.now)
      const item = SHOP.find(entry => entry.key === payload?.item)
      if (!item) return { ok: false, reason: 'unknown' }
      if (item.key === 'iron' && data.pickaxe !== 1 || item.key === 'diamond' && data.pickaxe !== 2) return { ok: false, reason: 'unavailable' }
      if (item.key === 'drink' && data.drinks >= 5) return { ok: false, reason: 'limit' }
      if (!api.spend(item.price)) return { ok: false, reason: 'poor' }
      if (item.key === 'iron') data.pickaxe = 2
      if (item.key === 'diamond') data.pickaxe = 3
      if (item.key === 'drink') { data.energy = Math.min(30, data.energy + 10); if (data.energy === 30) data.energyAt = api.now; data.drinks += 1 }
      return { ok: true }
    },
  },
  view(data, api) {
    const d = refresh(structuredClone(data), api.now)
    const p = progress(d)
    const map = generateMap(d.layer, d.day)
    return {
      day: d.day, layer: d.layer, surface: d.surface, energy: d.energy, energyAt: d.energyAt,
      pickaxe: d.pickaxe, drinks: d.drinks, bag: d.bag, last: d.last,
      cells: map.map((cell, index) => ({ index, open: p.open.includes(index), hits: p.hits[index] ?? 0, needed: hitsNeeded(cell.kind, d.pickaxe), adjacent: adjacent(index, p.open), ...(p.open.includes(index) ? cell : {}) })),
      canDescend: d.layer < 10 && p.open.includes(map.findIndex(cell => cell.kind === 'ladder')),
      shelf: { key: 'mine', label: '矿工用品', emoji: '⛏️', color: 'teal', currency: { label: '金币', emoji: '🪙', balance: api.coins() }, items: SHOP.map(item => ({ ...item, disabled: item.key === 'iron' ? d.pickaxe !== 1 || api.coins() < item.price : item.key === 'diamond' ? d.pickaxe !== 2 || api.coins() < item.price : d.drinks >= 5 || api.coins() < item.price, pick: null })) },
      dex: { key: 'mine', label: '矿石', emoji: '💎', color: 'teal', entries: [...FOSSILS, ORES[4]].map(entry => ({ key: entry.key, emoji: entry.emoji, label: entry.label, stars: 1, blurb: entry.key === 'gem' ? '矿洞深处的闪亮宝石' : '矿洞里发现的古老收藏品', potential: d.found[entry.key] ? 1 : 0, acquired: !!d.found[entry.key] })) },
    }
  },
}
