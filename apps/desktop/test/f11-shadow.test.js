import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('F11 desktop shell contains shadows inside the clickable window shape', () => {
  const html = readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8')
  assert.match(html, /\[data-dsh-pig\]\[data-open="false"\] \.dp-pig\s*\{filter:none!important\}/)
  assert.match(html, /\[data-dsh-pig\] \.dp-pig-img,\[data-dsh-pig\] \.dp-pig-emoji\s*\{filter:none!important\}/)
  assert.match(html, /\[data-dsh-pig\] \.dp-card\s*\{box-shadow:inset/)
})
