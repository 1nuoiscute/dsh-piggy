import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

import farm, { CROPS, PLOT_PRICES, advancePlot, stageTime } from '../extensions/farm/server.js'
import { fakeDom } from './helpers/bundle.js'

const T0 = Date.UTC(2026, 9, 5)

function fakeApi(coins = 10_000) {
  const bag = {}
  const said = []
  const api = {
    now: T0,
    coins: () => coins,
    spend(n) { if (coins < n) return false; coins -= n; return true },
    earn(n) { coins += n },
    give(key, n) { bag[key] = (bag[key] ?? 0) + n; return true },
    say(line) { said.push(line) },
  }
  return { api, bag, said, coins: () => coins }
}

test('八种作物与地价严格按数值单', () => {
  assert.deepEqual(PLOT_PRICES, [0, 0, 500, 1200, 2500, 5000])
  assert.deepEqual(CROPS.map(c => [c.emoji, c.label, c.price, c.minutes, c.yield, c.sell, c.food]), [
    ['🥬', '小白菜', 10, 30, 3, 6, null],
    ['🍓', '草莓', 20, 60, 3, 12, 'strawberry'],
    ['🥕', '胡萝卜', 25, 120, 4, 12, null],
    ['🍠', '红薯', 40, 180, 3, 25, 'sweetpotato'],
    ['🍅', '番茄', 60, 240, 4, 25, null],
    ['🎃', '南瓜', 90, 360, 2, 75, 'pumpkin'],
    ['🌽', '玉米', 80, 300, 5, 30, null],
    ['🍉', '西瓜', 150, 480, 2, 140, null],
  ])
})

test('每个阶段必须浇水，干地离线再久也不长，成熟不坏', () => {
  const duration = stageTime('cabbage')
  const planted = { crop: 'cabbage', stage: 0, wateredAt: null }
  assert.deepEqual(advancePlot(planted, T0 + 20 * duration), planted)
  const watered = { ...planted, wateredAt: T0 }
  assert.equal(advancePlot(watered, T0 + duration - 1).stage, 0)
  const sprout = advancePlot(watered, T0 + 20 * duration)
  assert.deepEqual(sprout, { crop: 'cabbage', stage: 1, wateredAt: null })
  assert.deepEqual(advancePlot(sprout, T0 + 100 * duration), sprout)
  const grown = advancePlot({ ...sprout, wateredAt: T0 + 20 * duration }, T0 + 21 * duration)
  assert.equal(grown.stage, 2)
  assert.equal(grown.wateredAt, null)
  const ripe = advancePlot({ ...grown, wateredAt: T0 + 21 * duration }, T0 + 22 * duration)
  assert.equal(ripe.stage, 3)
  assert.deepEqual(advancePlot(ripe, T0 + 1000 * duration), ripe)
  assert.equal(watered.stage, 0)
})

test('买种和开地花金币，种植消耗种子；无效操作不扣钱', () => {
  const data = farm.init()
  const t = fakeApi(535)
  assert.equal(farm.actions.buy(data, { item: 'cabbage' }, t.api).ok, true)
  assert.equal(data.seeds.cabbage, 1)
  assert.equal(t.coins(), 525)
  assert.equal(farm.actions.unlock(data, { plot: 2 }, t.api).ok, true)
  assert.equal(data.unlocked, 3)
  assert.equal(t.coins(), 25)
  assert.equal(farm.actions.unlock(data, { plot: 4 }, t.api).ok, false)
  assert.equal(farm.actions.buy(data, { item: 'watermelon' }, t.api).ok, false)
  assert.equal(t.coins(), 25)
  assert.equal(farm.actions.plant(data, { plot: 0, item: 'cabbage' }, t.api).ok, true)
  assert.equal(data.seeds.cabbage, 0)
  assert.equal(farm.actions.plant(data, { plot: 0, item: 'cabbage' }, t.api).ok, false)
  assert.equal(farm.actions.plant(data, { plot: 3, item: 'cabbage' }, t.api).ok, false)
})

test('真实时间推进到成熟才可收，仓库出售和放背包均守恒', () => {
  const data = farm.init()
  const t = fakeApi()
  farm.actions.buy(data, { item: 'strawberry' }, t.api)
  farm.actions.plant(data, { plot: 0, item: 'strawberry' }, t.api)
  assert.equal(farm.actions.harvest(data, { plot: 0 }, t.api).ok, false)
  const duration = stageTime('strawberry')
  for (let stage = 0; stage < 3; stage += 1) {
    t.api.now = T0 + stage * duration
    assert.equal(farm.actions.water(data, { plot: 0 }, t.api).ok, true)
    assert.equal(farm.actions.water(data, { plot: 0 }, t.api).ok, false)
    t.api.now += duration
    assert.equal(farm.view(data, t.api).plots[0].stage, stage + 1)
  }
  assert.equal(farm.actions.harvest(data, { plot: 0 }, t.api).ok, true)
  assert.equal(data.harvest.strawberry, 3)
  assert.equal(data.acquired.strawberry, 3)
  assert.equal(data.plots[0], null)
  assert.equal(t.said.length, 1)
  assert.equal(farm.actions.sell(data, { item: 'strawberry', count: 2 }, t.api).ok, true)
  assert.equal(data.harvest.strawberry, 1)
  assert.equal(t.coins(), 10_000 - 20 + 24)
  assert.equal(farm.actions.store(data, { item: 'strawberry' }, t.api).ok, true)
  assert.equal(t.bag.strawberry, 1)
  assert.equal(data.harvest.strawberry, 0)
  assert.equal(farm.actions.store(data, { item: 'cabbage' }, t.api).ok, false)
  assert.equal(farm.view(data, t.api).dex.entries.find(c => c.key === 'strawberry').acquired, true)
})

test('货架和图鉴字段符合 H2 格式，view 不改存档', () => {
  const data = farm.init()
  const before = structuredClone(data)
  const t = fakeApi(15)
  const view = farm.view(data, t.api)
  assert.deepEqual(data, before)
  assert.equal(view.shelf.key, 'farm')
  assert.equal(view.shelf.currency.balance, 15)
  assert.equal(view.shelf.items.length, 8)
  assert.equal(view.shelf.items.find(c => c.key === 'cabbage').disabled, false)
  assert.equal(view.shelf.items.find(c => c.key === 'strawberry').disabled, true)
  assert.equal(view.dex.label, '作物')
  assert.equal(view.dex.entries.length, 8)
})

test('仓库给出背包食物名称，货架整小时用小时标注', () => {
  const view = farm.view(farm.init(), fakeApi().api)
  assert.equal(view.harvest.find(crop => crop.key === 'pumpkin').foodLabel, '南瓜粥')
  assert.equal(view.harvest.find(crop => crop.key === 'sweetpotato').foodLabel, '烤红薯')
  assert.equal(view.harvest.find(crop => crop.key === 'strawberry').foodLabel, '草莓')
  assert.equal(view.shelf.items.find(crop => crop.key === 'cabbage').note, '30 分钟成熟 · 收 3 个')
  assert.equal(view.shelf.items.find(crop => crop.key === 'strawberry').note, '60 分钟成熟 · 收 3 个')
  assert.equal(view.shelf.items.find(crop => crop.key === 'watermelon').note, '8 小时成熟 · 收 2 个')
})

test('仓库超过一个时显示全卖金额并发送全部数量，背包按钮写出食物', () => {
  const data = farm.init()
  data.harvest.pumpkin = 2
  data.harvest.strawberry = 1
  const view = farm.view(data, fakeApi().api)
  const dom = fakeDom()
  dom.document.getElementById = () => null
  let render
  const window = { dshPiggyExtensions: { register(_key, impl) { render = impl.render } } }
  runInNewContext(readFileSync(new URL('../extensions/farm/client.js', import.meta.url), 'utf8'), { window, document: dom.document, Date })
  const sent = []
  const app = {
    data: view,
    content: dom.body,
    el(tag, className, label) {
      const node = dom.document.createElement(tag)
      node.className = className ?? ''
      if (label !== undefined) node.textContent = label
      return node
    },
    button(className, attrs, onClick) {
      const node = this.el('button', className)
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
      node.addEventListener('click', onClick)
      return node
    },
    send(op, payload) { sent.push({ op, payload }) },
  }
  render(app)
  const find = (attr, key) => {
    let result
    dom.body.walk(node => { if (node.getAttribute(attr) === key) result = node })
    return result
  }
  const all = find('data-farm-sell-all', 'pumpkin')
  assert.equal(all.textContent, '全卖 150🪙')
  assert.equal(find('data-farm-sell-all', 'strawberry'), undefined)
  assert.equal(find('data-farm-store', 'pumpkin').textContent, '放进背包 · 南瓜粥')
  all.fire('click')
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [{ op: 'sell', payload: { item: 'pumpkin', count: 2 } }])
  const t = fakeApi()
  assert.equal(farm.actions.sell(data, sent[0].payload, t.api).ok, true)
  assert.equal(data.harvest.pumpkin, 0)
  assert.equal(t.coins(), 10_150)
})

test('全卖超过 99 个也能结算；单次收入超过宿主上限时分笔记账', () => {
  const data = farm.init()
  data.harvest.watermelon = 1000
  const t = fakeApi()
  let earned = 0
  t.api.earn = amount => { assert.ok(amount <= 100_000); earned += amount }
  assert.equal(farm.actions.sell(data, { item: 'watermelon', count: 1000 }, t.api).ok, true)
  assert.equal(data.harvest.watermelon, 0)
  assert.equal(earned, 140_000)
})
