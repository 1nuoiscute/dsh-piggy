import test from 'node:test'
import assert from 'node:assert/strict'

import { SNAPSHOT, contentOf, findByAttr, mount, openPanel, settle } from './helpers/bundle.js'

const skins = {
  current: 'default',
  entries: [
    { key: 'default', label: '默认小猪', emoji: '🐷', art: 'piglet', current: true, custom: false, author: 'dsh-piggy', description: '熟悉的小猪。', scenes: ['idle'] },
    { key: 'mint', label: '薄荷小猪', emoji: '🌿', art: 'skin-mint', current: false, custom: false, author: 'dsh-piggy', description: '清凉的薄荷色。', scenes: ['idle', 'eat', 'bathe', 'play', 'pet'] },
  ],
}

test('C6 main menu has a skin app with switching and ZIP import', async () => {
  const { dom, calls } = await mount({ status: { ...SNAPSHOT, skins } })
  openPanel(dom)
  const app = findByAttr(contentOf(dom), 'data-app', 'skins')
  assert.notEqual(app, undefined)
  app.fire('click')
  const mint = findByAttr(contentOf(dom), 'data-skin', 'mint')
  assert.notEqual(mint, undefined)
  mint.fire('click')
  await settle()
  assert.deepEqual(JSON.parse(calls.at(-1).body), { action: 'skin', skin: 'mint' })
  const input = findByAttr(contentOf(dom), 'data-skin-import', 'zip')
  assert.notEqual(input, undefined)
  assert.match(input.getAttribute('accept'), /zip/)
})
