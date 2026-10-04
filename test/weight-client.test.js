// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderDevTab } from '../src/client/tabs/dev.js'
import {
  PIG, SNAPSHOT, contentOf, fakeDom, findByAttr, mount, openPanel,
} from './helpers/bundle.js'

const BODY = {
  class: 'fat', label: '胖胖', visible: true,
  idealG: 39690, roundAtG: 51597, fatAtG: 63504,
  ideal: '39.7 kg', roundAt: '51.6 kg', fatAt: '63.5 kg', playsLeft: 7,
}

test('C7 status shows body class, ideal weight and the useful next action', async () => {
  const status = { ...SNAPSHOT, pig: { ...PIG, weight: '64.0 kg', bodyWeight: BODY } }
  const { dom } = await mount({ status })
  openPanel(dom, 'status')
  const text = contentOf(dom).allText()
  // G 批次：体重、体型、理想体重合成一行，下面一条刻度条。
  assert.match(text, /体重 64\.0 kg · 胖胖/)
  assert.match(text, /理想 39\.7 kg/)
  assert.match(text, /玩耍减重 7 次/)
})

test('C7 debug page has normal, round and fat weight entries that send symbolic patches', () => {
  const { document } = fakeDom()
  globalThis.document = document
  const content = document.createElement('div')
  const sent = []
  renderDevTab({
    content,
    view: {
      ...SNAPSHOT,
      pig: { ...PIG, bodyWeight: BODY },
    },
    send(action, payload) { sent.push({ action, payload }) },
    devOff() {},
    setOpen() {},
    host: { getAttribute: () => 'false' },
  })
  for (const bodyClass of ['normal', 'round', 'fat']) {
    const entry = findByAttr(content, 'data-dev', 'weight:' + bodyClass)
    assert.notEqual(entry, undefined, bodyClass)
    entry.fire('click')
    assert.equal(sent.at(-1).action, 'dev')
    assert.equal(sent.at(-1).payload.patch.weightClass, bodyClass)
  }
})
