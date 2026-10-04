// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { contentOf, findByAttr, findByClass, mount, openPanel } from './helpers/bundle.js'

test('设置里没有「主菜单图标」选项；以前存过手绘图标的设备也显示 emoji', async () => {
  const { dom, store } = await mount()
  store.set('dsh-piggy:icon-style', 'built-in')
  openPanel(dom)
  assert.equal(findByAttr(contentOf(dom), 'data-app', 'shop').allText().includes('🛒'), true)
  assert.equal(findByClass(findByAttr(contentOf(dom), 'data-app', 'shop'), 'dp-tile-svg'), undefined)
  findByAttr(contentOf(dom), 'data-app', 'settings').fire('click')
  assert.equal(findByAttr(contentOf(dom), 'data-icon-style', 'system'), undefined)
  assert.equal(findByAttr(contentOf(dom), 'data-icon-style', 'built-in'), undefined)
})

test('every App icon in the bundle has a real SVG asset', () => {
  for (const key of ['status', 'card', 'dex', 'skins', 'study', 'work', 'shop', 'travel', 'bag', 'pomodoro', 'fishing', 'settings', 'update', 'quit', 'dev']) {
    const svg = readFileSync(new URL(`../assets/ui-${key}.svg`, import.meta.url), 'utf8')
    assert.match(svg, /<svg\b/)
    assert.match(svg, /viewBox="0 0 32 32"/)
  }
})
