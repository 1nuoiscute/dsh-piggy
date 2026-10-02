import test from 'node:test'
import assert from 'node:assert/strict'

import { SNAPSHOT, contentOf, findByAttr, findByClass, mount, openPanel, settle } from './helpers/bundle.js'

const fishing = { pending: null, bag: [], period: 'evening', autoTrips: 0, autoLeft: 2 }
const bait = { key: 'bait_worm', kind: 'bait', label: '蚯蚓鱼饵', emoji: '🪱', price: 5 }
const status = extra => ({ ...SNAPSHOT, fishing: { ...fishing, ...extra }, canGoOut: true,
  shop: [...SNAPSHOT.shop, bait], inventory: { ...SNAPSHOT.inventory, bait_worm: 20 } })

test('C5 home has a one-click cast and keeps both auto choices', async () => {
  const { dom, calls } = await mount({ status: status() })
  openPanel(dom)
  assert.notEqual(findByAttr(contentOf(dom), 'data-app', 'fishing'), undefined)
  findByAttr(contentOf(dom), 'data-app', 'fishing').fire('click')
  const cast = findByAttr(contentOf(dom), 'data-fish', 'cast')
  assert.equal(findByClass(contentOf(dom), 'dp-fish-charge'), undefined)
  cast.fire('click')
  await settle()
  assert.deepEqual(JSON.parse(calls.at(-1).body), { action: 'fishCast', power: .7, bait: 'bait_worm' })
  assert.notEqual(findByAttr(contentOf(dom), 'data-fish-auto', '30'), undefined)
  assert.notEqual(findByAttr(contentOf(dom), 'data-fish-auto', '60'), undefined)
})

test('fishing lets the player choose bait; no bait disables casting', async () => {
  const shrimp = { key: 'bait_shrimp', kind: 'bait', label: '鲜虾鱼饵', emoji: '🦐', price: 15 }
  const { dom, calls } = await mount({ status: { ...status(), shop: [...status().shop, shrimp],
    inventory: { ...status().inventory, bait_shrimp: 20 } } })
  openPanel(dom, 'fishing')
  findByAttr(contentOf(dom), 'data-fish-bait', 'bait_shrimp').fire('click')
  findByAttr(contentOf(dom), 'data-fish-auto', '30').fire('click')
  await settle()
  assert.deepEqual(JSON.parse(calls.at(-1).body), { action: 'fishAuto', minutes: 30, bait: 'bait_shrimp' })

  const empty = await mount({ status: { ...status(), inventory: { ...SNAPSHOT.inventory } } })
  openPanel(empty.dom, 'fishing')
  assert.equal(findByAttr(contentOf(empty.dom), 'data-fish', 'cast').disabled, true)
})

test('C5 caught result shows fish facts and keeps it into the bag', async () => {
  const caught = { id: 'catch-1', key: 'fish_carp', label: '鲤鱼', emoji: '🐟', sizeCm: 33.2, price: 12, phase: 'caught', difficulty: 18, behavior: 'smooth' }
  const { dom, calls } = await mount({ status: status({ pending: caught }) })
  openPanel(dom, 'fishing')
  assert.match(contentOf(dom).allText(), /鲤鱼.*33\.2 cm.*12/)
  findByAttr(contentOf(dom), 'data-fish', 'keep').fire('click')
  await settle()
  assert.equal(JSON.parse(calls.at(-1).body).action, 'fishKeep')
})

test('C5 hooked fish uses a circular skill-check QTE scaled by difficulty', async () => {
  const hooked = { id: 'catch-qte', key: 'fish_koi', label: '黄金锦鲤', emoji: '🎏', phase: 'hooked', difficulty: 86, behavior: 'dash' }
  const { dom, calls } = await mount({ status: status({ pending: hooked }) })
  openPanel(dom, 'fishing')
  const qte = findByAttr(contentOf(dom), 'data-fish-qte', 'true')
  assert.notEqual(qte, undefined)
  assert.equal(qte.getAttribute('data-qte-needed'), '4')
  assert.equal(qte.getAttribute('data-qte-difficulty'), '86')
  assert.equal(findByClass(contentOf(dom), 'dp-fish-track'), undefined)
  assert.equal(qte.getAttribute('data-qte-misses'), '0')
  assert.ok(Number(qte.getAttribute('data-qte-zone-size')) >= 75)
  assert.ok(Number(qte.getAttribute('data-qte-speed')) <= 0.5)
  const callCount = calls.length
  qte.fire('pointerdown', { pointerType: 'mouse', timeStamp: 100 }) // 点早也要立刻反馈。
  await settle()
  assert.equal(calls.length, callCount)
  assert.match(qte.getAttribute('data-qte-feedback'), /还没到时机/)
})

test('C5 fish bag exposes feed and sell on each individual catch', async () => {
  const caught = { id: 'catch-2', key: 'fish_koi', label: '黄金锦鲤', emoji: '🎏', sizeCm: 70.5, price: 220 }
  const { dom, calls } = await mount({ status: status({ bag: [caught] }) })
  openPanel(dom, 'bag')
  findByAttr(contentOf(dom), 'data-bag', 'fish').fire('click')
  assert.match(contentOf(dom).allText(), /黄金锦鲤.*70\.5 cm.*220/)
  findByAttr(contentOf(dom), 'data-fish-feed', caught.id).fire('click')
  await settle()
  assert.deepEqual(JSON.parse(calls.at(-1).body), { action: 'fishFeed', id: caught.id })
})
