// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { contentOf, findByAttr, findByClass, mount, openPanel } from './helpers/bundle.js'

test('settings switches and persists system Emoji or bundled app icons', async () => {
  const { dom, store } = await mount()
  openPanel(dom)
  assert.ok(findByAttr(contentOf(dom), 'data-app', 'settings'))
  assert.equal(findByAttr(contentOf(dom), 'data-app', 'shop').allText().includes('🛒'), true)
  findByAttr(contentOf(dom), 'data-app', 'settings').fire('click')
  assert.ok(findByAttr(contentOf(dom), 'data-icon-style', 'system'))
  findByAttr(contentOf(dom), 'data-icon-style', 'built-in').fire('click')
  assert.equal(store.get('dsh-piggy:icon-style'), 'built-in')
  findByAttr(contentOf(dom), 'data-home', 'true').fire('click')
  const shop = findByAttr(contentOf(dom), 'data-app', 'shop')
  const icon = findByClass(shop, 'dp-tile-svg')
  assert.equal(icon.tagName, 'img')
  assert.match(icon.src, /ui-shop\.svg$/)
  findByAttr(contentOf(dom), 'data-app', 'settings').fire('click')
  findByAttr(contentOf(dom), 'data-icon-style', 'system').fire('click')
  assert.equal(store.get('dsh-piggy:icon-style'), 'system')
  findByAttr(contentOf(dom), 'data-home', 'true').fire('click')
  assert.equal(findByAttr(contentOf(dom), 'data-app', 'shop').allText().includes('🛒'), true)
})

test('every App icon in the bundle has a real SVG asset', () => {
  for (const key of ['status', 'card', 'dex', 'skins', 'study', 'work', 'shop', 'travel', 'bag', 'pomodoro', 'fishing', 'settings', 'update', 'quit', 'dev']) {
    const svg = readFileSync(new URL(`../assets/ui-${key}.svg`, import.meta.url), 'utf8')
    assert.match(svg, /<svg\b/)
    assert.match(svg, /viewBox="0 0 32 32"/)
  }
})
