// 扩展中心的客户端部分：关掉的扩展不在主菜单、图鉴、猪身上出现；「扩展」App 里能开关。
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SNAPSHOT, contentOf, findByAttr, mount, openPanel, settle } from './helpers/bundle.js'

const ext = (pomodoro, fishing) => [
  { key: 'pomodoro', label: '番茄钟', emoji: '🍅', description: '专注', on: pomodoro, apps: ['pomodoro'], dexSections: [], shopKinds: [] },
  { key: 'fishing', label: '钓鱼', emoji: '🎣', description: '钓鱼', on: fishing, apps: ['fishing'], dexSections: ['fish'], shopKinds: ['bait'] },
]

test('主菜单有「扩展」App；全部打开时番茄钟、钓鱼都在', async () => {
  const { dom } = await mount({ status: { ...SNAPSHOT, extensions: ext(true, true) } })
  openPanel(dom)
  for (const key of ['extensions', 'pomodoro', 'fishing']) assert.ok(findByAttr(contentOf(dom), 'data-app', key), key)
})

test('关掉钓鱼：主菜单没有钓鱼，图鉴没有鱼分区；番茄钟还在', async () => {
  const { dom } = await mount({ status: { ...SNAPSHOT, extensions: ext(true, false) } })
  openPanel(dom)
  assert.equal(findByAttr(contentOf(dom), 'data-app', 'fishing'), undefined)
  assert.ok(findByAttr(contentOf(dom), 'data-app', 'pomodoro'))
  findByAttr(contentOf(dom), 'data-app', 'dex').fire('click')
  assert.equal(findByAttr(contentOf(dom), 'data-dex-section', 'fish'), undefined)
  assert.ok(findByAttr(contentOf(dom), 'data-dex-section', 'items'))
})

test('关掉番茄钟：主菜单没有番茄钟，专注中的角标也不显示', async () => {
  const active = { active: true, minutes: 25, secondsLeft: 600, todayDone: 1, rewardedToday: 1, cap: 8, reward: { coins: 8, happiness: 6 }, options: [15, 25, 45] }
  const { dom } = await mount({ status: { ...SNAPSHOT, pomodoro: active, extensions: ext(false, true) } })
  openPanel(dom)
  assert.equal(findByAttr(contentOf(dom), 'data-app', 'pomodoro'), undefined)
  const pill = findByAttr(dom.body, 'data-pomo-pill', 'true')
  assert.equal(pill.hidden, true)
})

test('「扩展」App：每个扩展一张卡，点开关发 setExtension', async () => {
  const { dom, calls } = await mount({ status: { ...SNAPSHOT, extensions: ext(true, true) } })
  openPanel(dom, 'extensions')
  assert.ok(findByAttr(contentOf(dom), 'data-extension', 'pomodoro'))
  findByAttr(contentOf(dom), 'data-extension-toggle', 'fishing').fire('click')
  await settle()
  const post = calls.find(call => call.method === 'POST')
  assert.deepEqual(JSON.parse(post.body), { action: 'setExtension', key: 'fishing', on: false })
})

test('老宿主不发扩展列表：当作全部打开', async () => {
  const { dom } = await mount({ status: { ...SNAPSHOT } })
  openPanel(dom)
  assert.ok(findByAttr(contentOf(dom), 'data-app', 'fishing'))
  assert.ok(findByAttr(contentOf(dom), 'data-app', 'pomodoro'))
})

test('正开着钓鱼页时钓鱼被关掉：退回主菜单', async () => {
  const { enabledTabs } = await import('../src/client/extensions.js')
  const ctx = { tab: 'fishing', view: { extensions: ext(true, false) } }
  const tabs = enabledTabs(ctx, [{ key: 'status' }, { key: 'fishing' }, { key: 'pomodoro' }])
  assert.equal(ctx.tab, 'home')
  assert.deepEqual(tabs.map(t => t.key), ['status', 'pomodoro'])
})
