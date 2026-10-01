// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { SNAPSHOT, contentOf, findByAttr, findByClass, mount, openPanel } from './helpers/bundle.js'

const DEX = {
  forms: [
    {
      key: 'king', label: '猪猪王', emoji: '👑', art: 'pig-king', acquired: false, firstAt: null, count: 0,
      condition: '使用王冠完成加冕',
      hint: '当阅历足以服众，三种本事不再偏科，金色会选择它的主人。',
      description: '阅历与本事都攒够了，戴上自己的王冠。',
      requirements: [
        { key: 'level', label: '等级', have: 40, need: 40, met: true },
        { key: 'charm', label: '魅力', have: 12, need: 20, met: false },
      ],
    },
    {
      key: 'devil', label: '恶魔猪', emoji: '😈', art: 'pig-devil', acquired: true, firstAt: 1_800_000_000_000, count: 2,
      condition: '使用恶魔契约完成签约', hint: '嬉闹声足够多时，一纸约定会来敲门。',
      description: '玩出了本事，也玩出了自己的小脾气。', requirements: [],
    },
  ],
  skins: [],
  fish: [],
  items: [
    { key: 'apple', label: '苹果', emoji: '🍎', acquired: true, firstAt: 1_800_000_000_000, count: 3, condition: '商店购买' },
    { key: 'crown', label: '王冠', emoji: '👑', acquired: false, firstAt: null, count: 0, condition: '商店购买 · 3000 金币' },
  ],
  souvenirs: [
    { key: 'shell', label: '一枚海螺', emoji: '🐚', acquired: false, firstAt: null, count: 0, condition: '旅行到看海获得' },
  ],
}

test('C4 the 图鉴 replaces 加冕 in the same home slot and exposes five sections', async () => {
  const { dom } = await mount({ status: { ...SNAPSHOT, dex: DEX } })
  openPanel(dom)
  const content = contentOf(dom)
  assert.equal(findByAttr(content, 'data-app', 'crown'), undefined)
  const app = findByAttr(content, 'data-app', 'dex')
  assert.notEqual(app, undefined)
  assert.match(app.allText(), /图鉴/)
  app.fire('click')
  for (const key of ['forms', 'skins', 'fish', 'items', 'souvenirs']) {
    assert.notEqual(findByAttr(contentOf(dom), 'data-dex-section', key), undefined, key)
  }
})

test('C4 form shelf uses SVG flash cards and keeps exact requirements secret', async () => {
  const { dom } = await mount({ status: { ...SNAPSHOT, dex: DEX } })
  openPanel(dom, 'dex')
  findByAttr(contentOf(dom), 'data-dex-section', 'forms').fire('click')
  const king = findByAttr(contentOf(dom), 'data-dex-entry', 'king')
  const devil = findByAttr(contentOf(dom), 'data-dex-entry', 'devil')
  assert.match(king.className, /dp-dex-card-locked/)
  assert.equal(findByClass(king, 'dp-dex-art').src, '/dsh-piggy/art/pig-king.svg')
  assert.match(king.allText(), /🔒/)
  assert.doesNotMatch(king.allText(), /猪猪王|等级|魅力|40\/40|12\/20/)
  assert.equal(findByClass(devil, 'dp-dex-art').src, '/dsh-piggy/art/pig-devil.svg')
  assert.match(devil.allText(), /恶魔猪/)
})

test('C4 opening a locked card reveals a riddle, while an unlocked card reveals its story', async () => {
  const { dom } = await mount({ status: { ...SNAPSHOT, dex: DEX } })
  openPanel(dom, 'dex')
  findByAttr(contentOf(dom), 'data-dex-section', 'forms').fire('click')

  findByAttr(contentOf(dom), 'data-dex-entry', 'king').fire('click')
  const locked = findByAttr(contentOf(dom), 'data-dex-detail', 'king')
  assert.match(locked.allText(), /解锁谜面/)
  assert.match(locked.allText(), /金色会选择它的主人/)
  assert.doesNotMatch(locked.allText(), /使用王冠|等级 40\/40|魅力 12\/20/)

  findByAttr(contentOf(dom), 'data-dex-entry', 'devil').fire('click')
  const unlocked = findByAttr(contentOf(dom), 'data-dex-detail', 'devil')
  assert.match(unlocked.allText(), /玩出了本事，也玩出了自己的小脾气/)
  assert.match(unlocked.allText(), /获得 2 次/)
})

test('C4 a host without dex data degrades to empty sections', async () => {
  const { dom } = await mount({ status: { ...SNAPSHOT, dex: undefined } })
  openPanel(dom, 'dex')
  assert.match(contentOf(dom).allText(), /形态/)
  findByAttr(contentOf(dom), 'data-dex-section', 'fish').fire('click')
  assert.match(contentOf(dom).allText(), /还没有/)
})
