import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const root = new URL('../../../', import.meta.url).pathname

function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) sources(file, out)
    else if (name.endsWith('.js')) out.push(file)
  }
  return out
}

test('源码里每个彩色 emoji 都在桌面版内置字体的 unicode-range 里（加了新 emoji 要重跑 tools/build-emoji-font.py）', () => {
  const html = readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8')
  const range = new Set(html.match(/unicode-range:([^}]*)}/)[1].split(',').map(code => Number.parseInt(code.trim().slice(2), 16)))
  assert.ok(existsSync(new URL('../renderer/piggy-emoji.ttf', import.meta.url)))
  assert.ok(existsSync(new URL('../renderer/piggy-emoji-LICENSE.txt', import.meta.url)))
  const missing = new Set()
  for (const file of [...sources(join(root, 'src/client')), ...sources(join(root, 'packages/pet-core/src'))]) {
    for (const [char] of readFileSync(file, 'utf8').matchAll(/\p{Emoji_Presentation}/gu)) {
      const code = char.codePointAt(0)
      if (code > 0xff && !range.has(code)) missing.add(char)
    }
  }
  assert.deepEqual([...missing], [])
})

test('名牌里的 ♀ ♂ 不交给 emoji 字体', () => {
  const html = readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /U\+2640|U\+2642/)
})
