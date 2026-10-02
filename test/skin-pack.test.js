import test from 'node:test'
import assert from 'node:assert/strict'

import { validateSkinFiles } from '../store/skin-pack.js'

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#abc" d="M1 1h8v8Z"/></svg>'
const files = extra => new Map([
  ['skin.json', Buffer.from(JSON.stringify({ key: 'berry', label: '莓果猪', author: '玩家', description: '甜甜的', emoji: '🫐' }))],
  ...['idle', 'eat', 'bathe', 'play', 'pet'].map(scene => [`${scene}.svg`, Buffer.from(svg)]),
  ...(extra ?? []),
])

test('C6 accepts the documented five-scene skin pack', () => {
  const result = validateSkinFiles(files())
  assert.equal(result.ok, true)
  assert.equal(result.metadata.art, 'custom-berry')
  assert.deepEqual(result.metadata.scenes, ['idle', 'eat', 'bathe', 'play', 'pet'])
})

test('C6 rejects missing scenes and unsafe SVG features', () => {
  const missing = files()
  missing.delete('pet.svg')
  assert.equal(validateSkinFiles(missing).ok, false)
  const unsafe = files([['work.svg', Buffer.from('<svg viewBox="0 0 64 64"><image href="https://example.test/x.png"/></svg>')]])
  assert.equal(validateSkinFiles(unsafe).ok, false)
})

test('C6 custom keys cannot shadow the default or a built-in skin', () => {
  const builtIn = files()
  builtIn.set('skin.json', Buffer.from(JSON.stringify({ key: 'mint', label: '冒牌薄荷' })))
  assert.equal(validateSkinFiles(builtIn).ok, false)
  const defaultSkin = files()
  defaultSkin.set('skin.json', Buffer.from(JSON.stringify({ key: 'default', label: '冒牌默认' })))
  assert.equal(validateSkinFiles(defaultSkin).ok, false)
})
