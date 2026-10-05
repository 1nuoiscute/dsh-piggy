import assert from 'node:assert/strict'
import { test } from 'node:test'

import mine, { dayKey, dayState, generateMap, recover, refresh, hitsNeeded, normalize } from '../extensions/mine/server.js'

const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute).getTime()
const fake = (now = at(5, 12), coins = 10_000) => {
  const said = []
  const api = { now, coins: () => coins, spend: n => coins >= n ? (coins -= n, true) : false, earn: n => { coins += n }, say: s => said.push(s) }
  return { api, said, coins: () => coins }
}

test('06:00 换天回满 100，离线每三分钟恢复一点并保留余数', () => {
  assert.equal(dayKey(at(6, 5, 59)), '2026-10-05')
  assert.equal(dayKey(at(6, 6)), '2026-10-06')
  assert.deepEqual(recover(0, at(5, 12), at(5, 12, 8)), { energy: 2, energyAt: at(5, 12, 6) })
  assert.deepEqual(recover(0, at(5, 12), at(5, 17)), { energy: 100, energyAt: at(5, 17) })
  const state = mine.init()
  refresh(state, at(5, 12)); state.energy = 1; state.layer = 6; state.maps[6] = { open: [0], hits: {} }
  refresh(state, at(6, 5, 59)); assert.equal(state.layer, 6)
  const fresh = dayState(state, at(6, 6))
  assert.equal(state.layer, 6); assert.equal(fresh.layer, 1)
  refresh(state, at(6, 6)); assert.equal(state.layer, 1); assert.equal(state.energy, 100); assert.deepEqual(state.maps, {})
})

test('地图按日期和层数确定，入口、梯子、化石和矿物边界正确', () => {
  const a = generateMap(1, '2026-10-05')
  assert.deepEqual(a, generateMap(1, '2026-10-05'))
  assert.notDeepEqual(a, generateMap(2, '2026-10-05'))
  assert.notDeepEqual(a, generateMap(1, '2026-10-06'))
  for (let layer = 1; layer <= 10; layer++) {
    for (const day of ['2026-10-05', '2026-10-06', '2026-10-07']) {
      const map = generateMap(layer, day)
      assert.equal(map.length, 48)
      assert.ok(map.slice(0, 6).every(cell => cell.kind === 'entrance'))
      assert.equal(map.filter(cell => cell.kind === 'ladder').length, 1)
      assert.ok(map.findIndex(cell => cell.kind === 'ladder') >= 36)
      assert.ok(map.filter(cell => cell.kind === 'fossil').length <= 1)
      assert.ok(map.filter(cell => cell.kind === 'ore').every(cell => cell.unlock <= layer))
    }
  }
})

test('镐子减少敲击次数，体力不足不挖，只有相邻格可以挖', () => {
  assert.equal(hitsNeeded('rock', 1), 2); assert.equal(hitsNeeded('rock', 2), 1)
  assert.equal(hitsNeeded('hard', 3), 2); assert.equal(hitsNeeded('soil', 3), 1)
  const t = fake(); const data = mine.init(); refresh(data, t.api.now)
  assert.equal(mine.actions.dig(data, { cell: 47 }, t.api).reason, 'not-adjacent')
  const first = mine.actions.dig(data, { cell: 6 }, t.api)
  assert.equal(first.ok, true); assert.equal(data.energy, 99)
  data.energy = 0
  assert.equal(mine.actions.dig(data, { cell: 7 }, t.api).reason, 'tired')
})

test('货架购买扣金币；卖矿仅在地面；图鉴记录收藏品', () => {
  const t = fake(); const data = mine.init(); refresh(data, t.api.now)
  const view = mine.view(data, t.api)
  assert.equal(view.shelf.label, '矿工用品'); assert.equal(view.dex.label, '矿石')
  assert.equal(mine.actions.buy(data, { item: 'iron' }, t.api).ok, true)
  assert.equal(t.coins(), 8500); assert.equal(data.pickaxe, 2)
  assert.equal(mine.actions.buy(data, { item: 'iron' }, t.api).ok, false)
  data.bag.coal = 2
  assert.equal(mine.actions.sell(data, {}, t.api).reason, 'underground')
  mine.actions.surface(data, {}, t.api)
  assert.equal(mine.actions.sell(data, {}, t.api).ok, true)
  assert.equal(t.coins(), 8516)
  assert.equal(data.bag.coal ?? 0, 0)
})

test('未挖的格子不泄露内容，敲击进度留下，挖开后不重复领矿', () => {
  const t = fake(); const data = mine.init(); refresh(data, t.api.now)
  const map = generateMap(1, data.day)
  const target = [6, 7, 8, 9, 10, 11].find(index => map[index].kind !== 'soil' && map[index].kind !== 'ladder')
  assert.ok(target !== undefined)
  const hidden = mine.view(data, t.api).cells[target]
  assert.equal(hidden.kind, undefined)
  assert.equal(hidden.key, undefined)
  assert.equal(hidden.remaining, undefined)
  assert.equal(mine.actions.dig(data, { cell: target }, t.api).ok, true)
  assert.equal(data.energy, 99)
  assert.equal(mine.view(data, t.api).cells[target].hits, 1)
  assert.equal(mine.view(data, t.api).cells[target].remaining, 1)
  assert.equal(mine.actions.dig(data, { cell: target }, t.api).ok, true)
  assert.equal(mine.view(data, t.api).cells[target].open, true)
  assert.equal(mine.actions.dig(data, { cell: target }, t.api).reason, 'already-open')
  assert.equal(data.energy, 98)
})

test('体力饮料每天限五瓶，价格准确；换天保留矿袋和装备', () => {
  const t = fake(); const data = mine.init(); refresh(data, t.api.now)
  data.energy = 0; data.bag.copper = 3
  for (let i = 0; i < 5; i++) {
    data.energy = 0
    assert.equal(mine.actions.buy(data, { item: 'drink' }, t.api).ok, true)
    assert.equal(data.energy, 30)
  }
  assert.equal(data.drinks, 5)
  assert.equal(mine.actions.buy(data, { item: 'drink' }, t.api).reason, 'limit')
  assert.equal(t.coins(), 9600)
  mine.actions.buy(data, { item: 'iron' }, t.api)
  refresh(data, at(6, 6))
  assert.equal(data.drinks, 0)
  assert.equal(data.pickaxe, 2)
  assert.equal(data.bag.copper, 3)
})

test('梯子挖开后才能下层；第十层不能继续下', () => {
  const t = fake(); const data = mine.init(); refresh(data, t.api.now)
  assert.equal(mine.actions.descend(data, {}, t.api).reason, 'no-ladder')
  const ladder = generateMap(1, data.day).findIndex(cell => cell.kind === 'ladder')
  data.maps[1] = { open: [0, 1, 2, 3, 4, 5, ladder], hits: {} }
  assert.equal(mine.actions.descend(data, {}, t.api).ok, true)
  assert.equal(data.layer, 2)
  data.layer = 10
  assert.equal(mine.actions.descend(data, {}, t.api).reason, 'deepest')
})

test('化石和宝石记入图鉴，宝石也进矿袋', () => {
  const t = fake(); const data = mine.init(); refresh(data, t.api.now)
  for (const kind of ['fossil', 'gem']) {
    let layer = kind === 'gem' ? 8 : 1
    let day = data.day
    let now = t.api.now
    let index = -1
    for (let offset = 0; offset < 60 && index < 0; offset++) {
      now = at(5 + offset, 12)
      day = dayKey(now)
      index = generateMap(layer, day).findIndex(cell => kind === 'gem' ? cell.key === 'gem' : cell.kind === 'fossil')
    }
    assert.ok(index >= 0)
    data.day = day; data.layer = layer; data.maps[layer] = { open: [index - 6], hits: {} }
    const cell = generateMap(layer, day)[index]
    for (let hit = 0; hit < hitsNeeded(cell.kind, data.pickaxe); hit++) mine.actions.dig(data, { cell: index }, { ...t.api, now })
    assert.equal(data.found[cell.key], true)
    assert.equal(mine.view(data, { ...t.api, now }).dex.entries.find(entry => entry.key === cell.key).acquired, true)
  }
  assert.ok(data.bag.gem > 0)
  assert.ok(t.said.length >= 2)
})

test('缺字段的存档在 view 和全部动作中自动补齐，不丢已有矿袋', () => {
  const t = fake()
  const empty = {}
  const first = mine.view(empty, t.api)
  assert.equal(first.cells.length, 48)
  assert.equal(first.energy, 100)
  assert.equal(first.pickaxe, 1)
  assert.equal(first.shelf.items.length, 3)
  assert.deepEqual(empty, {}, 'view 不改原始存档')
  assert.equal(mine.actions.dig(empty, { cell: 6 }, t.api).ok, true)
  assert.equal(empty.maps[1].open.length >= 6, true)
  assert.equal(mine.actions.surface(empty, {}, t.api).ok, true)
  assert.equal(mine.actions.enter(empty, {}, t.api).ok, true)
  assert.equal(mine.actions.descend(empty, {}, t.api).reason, 'no-ladder')
  assert.equal(mine.actions.buy(empty, { item: 'drink' }, t.api).ok, true)
  assert.equal(mine.actions.sell(empty, {}, t.api).reason, 'underground')
  const partial = { day: dayKey(t.api.now), bag: { coal: 2 }, maps: { 1: { open: [0, 1, 2, 3, 4, 5] } } }
  normalize(partial)
  assert.equal(partial.bag.coal, 2)
  assert.deepEqual(partial.maps[1].hits, {})
  assert.equal(mine.view(partial, t.api).cells.length, 48)
})

test('下一点体力按剩余整分钟显示，满体力时不显示', () => {
  const t = fake()
  const data = mine.init()
  refresh(data, t.api.now)
  assert.equal(mine.view(data, t.api).nextEnergyMinutes, null)
  data.energy = 99
  assert.equal(mine.view(data, t.api).nextEnergyMinutes, 3)
  assert.equal(mine.view(data, { ...t.api, now: t.api.now + 2 * 60_000 + 1 }).nextEnergyMinutes, 1)
  assert.equal(mine.view(data, { ...t.api, now: t.api.now + 3 * 60_000 }).nextEnergyMinutes, null)
})

test('饮料恢复 30 且不超过 100，旧存档体力可继续离线恢复', () => {
  const t = fake()
  const data = mine.init()
  refresh(data, t.api.now)
  data.energy = 80
  assert.equal(mine.actions.buy(data, { item: 'drink' }, t.api).ok, true)
  assert.equal(data.energy, 100)
  assert.equal(mine.view(data, t.api).shelf.items.find(item => item.key === 'drink').note, '恢复 30 体力，每天最多 5 瓶')
  const old = { day: dayKey(t.api.now), energy: 30, energyAt: t.api.now }
  normalize(old)
  assert.equal(old.energy, 30)
  refresh(old, t.api.now + 3 * 60_000)
  assert.equal(old.energy, 31)
})
