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

test('换肤 App 有「怎么做皮肤」页：十张图的文件名、必须/可选，和完整教程、示例包的链接', async () => {
  const { dom } = await mount()
  openPanel(dom)
  findByAttr(contentOf(dom), 'data-app', 'skins').fire('click')
  findByAttr(contentOf(dom), 'data-skin-guide', 'true').fire('click')
  const text = contentOf(dom).allText()
  for (const file of ['idle.svg', 'eat.svg', 'bathe.svg', 'play.svg', 'pet.svg', 'relaxed.svg', 'work.svg', 'study.svg', 'trip.svg', 'fish.svg']) assert.ok(text.includes(file), file)
  assert.ok(text.includes('viewBox="0 0 64 64"'))
  assert.ok(findByAttr(contentOf(dom), 'data-skin-guide-open', 'true'))
  assert.ok(findByAttr(contentOf(dom), 'data-skin-example', 'true'))
})
