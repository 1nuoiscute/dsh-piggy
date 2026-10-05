// 盲盒扩展的宿主逻辑（extensions/blindbox/server.js）：概率、保底、碎片、券。
import assert from 'node:assert/strict'
import { test } from 'node:test'

import blindbox, { SERIES, hiddenChance } from '../extensions/blindbox/server.js'

function fakeApi({ coins = 100000, tickets = 0 } = {}) {
  const said = []
  const api = {
    now: 0,
    coins: () => coins,
    spend: n => { if (coins < n) return false; coins -= n; return true },
    earn: n => { coins += n },
    give: () => true,
    say: text => said.push(text),
    count: key => (key === 'boxticket' ? tickets : 0),
    take: (key, n = 1) => { if (key !== 'boxticket' || tickets < n) return false; tickets -= n; return true },
  }
  return { api, said, left: () => coins, tickets: () => tickets }
}

test('hidden chance: 3% base, +7% a pull from the 30th, certain on the 50th', () => {
  assert.equal(hiddenChance(0), 0.03)
  assert.equal(hiddenChance(28), 0.03)
  assert.ok(Math.abs(hiddenChance(29) - 0.10) < 1e-9)
  assert.ok(Math.abs(hiddenChance(30) - 0.17) < 1e-9)
  assert.equal(hiddenChance(45), 0.95, 'soft pity tops out at 95%')
  assert.equal(hiddenChance(49), 1)
})

test('fifty unlucky pulls in a row still end on the hidden one, and the counter resets', () => {
  const data = blindbox.init()
  const { api, left } = fakeApi()
  const unlucky = () => 0.999
  for (let i = 0; i < 49; i += 1) assert.equal(blindbox.actions.open(data, { series: 'farm', count: 1 }, api, unlucky).ok, true)
  assert.equal(data.series.farm.have.goldpig, undefined)
  blindbox.actions.open(data, { series: 'farm', count: 1 }, api, unlucky)
  assert.equal(data.series.farm.have.goldpig, 1)
  assert.equal(data.series.farm.since, 0)
  assert.equal(left(), 100000 - 50 * 300)
})

test('ten in one go costs 2700; duplicates turn into shards that buy a missing one', () => {
  const data = blindbox.init()
  const { api, said, left } = fakeApi()
  blindbox.actions.open(data, { series: 'beach', count: 10 }, api, () => 0.5)
  assert.equal(left(), 100000 - 2700)
  assert.equal(data.last.items.length, 10)
  const s = data.series.beach
  assert.equal(s.shards, 9, 'same normal one ten times: nine duplicates')
  assert.match(said.at(-1), /十连/)
  blindbox.actions.open(data, { series: 'beach', count: 1 }, api, () => 0.5)
  assert.equal(s.shards, 10)
  const missing = SERIES.find(x => x.key === 'beach').items.find(item => s.have[item.key] === undefined)
  assert.equal(blindbox.actions.swap(data, { series: 'beach', item: missing.key }, api).ok, true)
  assert.equal(s.shards, 0)
  assert.equal(s.have[missing.key], 1)
  assert.equal(blindbox.actions.swap(data, { series: 'beach', item: missing.key }, api).reason, 'owned')
})

test('a ticket opens one box for free; no coins and no ticket is refused', () => {
  const data = blindbox.init()
  const withTicket = fakeApi({ coins: 0, tickets: 1 })
  assert.equal(blindbox.actions.open(data, { series: 'night', count: 1, ticket: true }, withTicket.api, () => 0.2).ok, true)
  assert.equal(withTicket.tickets(), 0)
  assert.equal(blindbox.actions.open(data, { series: 'night', count: 1, ticket: true }, withTicket.api).reason, 'no-ticket')
  assert.equal(blindbox.actions.open(data, { series: 'night', count: 1 }, withTicket.api).reason, 'poor')
})

test('the view lists every series with its figures, pity and prices', () => {
  const data = blindbox.init()
  const { api } = fakeApi({ tickets: 2 })
  blindbox.actions.open(data, { series: 'farm', count: 1 }, api, () => 0.5)
  const view = blindbox.view(data, api)
  assert.equal(view.tickets, 2)
  assert.equal(view.series.length, 3)
  const farm = view.series.find(s => s.key === 'farm')
  assert.equal(farm.items.length, 7)
  assert.equal(farm.items.at(-1).hidden, true)
  assert.equal(farm.owned, 1)
  assert.equal(farm.pityLeft, 49)
})
