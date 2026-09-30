import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { syncPigArt } from '../src/client/art.js'

test('care reactions temporarily replace activity sprites and restore afterward', () => {
  const attrs = { 'data-art': 'pig-king', 'data-activity': 'work' }
  const pig = { getAttribute: key => attrs[key] ?? null }
  const image = { src: '' }
  for (const [reaction, art] of [['feed', 'eat'], ['bathe', 'bathe'], ['play', 'play'], ['pet', 'pet'], ['levelup', 'relaxed']]) {
    attrs['data-react'] = reaction
    syncPigArt(pig, image)
    assert.ok(image.src.endsWith('pig-king-' + art + '.svg'))
    assert.ok(existsSync(new URL('../assets/pig-king-' + art + '.svg', import.meta.url)))
    syncPigArt(pig, image)
    assert.ok(image.src.endsWith('pig-king-' + art + '.svg'), 'polling preserves reaction')
    delete attrs['data-react']
    syncPigArt(pig, image)
    assert.ok(image.src.endsWith('pig-king-work.svg'))
  }
  attrs['data-activity'] = ''
  syncPigArt(pig, image)
  assert.ok(image.src.endsWith('pig-king.svg'))
  attrs['data-art'] = 'piglet'
  attrs['data-react'] = 'pet'
  syncPigArt(pig, image)
  assert.ok(image.src.endsWith('piglet.svg'), 'ordinary pigs keep their original sprite')
})
