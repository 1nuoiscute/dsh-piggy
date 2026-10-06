import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))

function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) sources(file, out)
    else if (name.endsWith('.js')) out.push(file)
  }
  return out
}

test('源码里每个彩色 emoji 都在桌面版内置字体的 unicode-range 里', () => {
  const html = readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8')
  const range = html.match(/unicode-range:([^}]*)}/)[1].split(',')
  const rangeHas = code => range.some(part => {
    const [a, b] = part.trim().slice(2).split('-').map(hex => Number.parseInt(hex, 16))
    return code >= a && code <= (b ?? a)
  })
  assert.ok(existsSync(new URL('../renderer/piggy-emoji.ttf', import.meta.url)))
  assert.ok(existsSync(new URL('../renderer/piggy-emoji-LICENSE.txt', import.meta.url)))
  const missing = new Set()
  for (const file of [...sources(join(root, 'src/client')), ...sources(join(root, 'packages/pet-core/src'))]) {
    for (const [char] of readFileSync(file, 'utf8').matchAll(/\p{Emoji_Presentation}/gu)) {
      const code = char.codePointAt(0)
      const covered = [...range].length > 0 && rangeHas(code)
      if (code > 0xff && !covered) missing.add(char)
    }
  }
  assert.deepEqual([...missing], [])
})

test('整套 emoji 都内置（以后加新 emoji 不用重做）；♀ ♂ ♥ 当文字用，不交给 emoji 字体', () => {
  const html = readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8')
  const range = html.match(/unicode-range:([^}]*)}/)[1].split(',')
  let count = 0
  const has = code => range.some(part => {
    const [a, b] = part.trim().slice(2).split('-').map(hex => Number.parseInt(hex, 16))
    return code >= a && code <= (b ?? a)
  })
  for (const part of range) {
    const [a, b] = part.trim().slice(2).split('-').map(hex => Number.parseInt(hex, 16))
    count += (b ?? a) - a + 1
  }
  assert.ok(count > 1000, `整套字体覆盖的字符要全写进去，现在只有 ${count} 个`)
  for (const code of [0x2640, 0x2642, 0x2665]) assert.equal(has(code), false, String.fromCodePoint(code) + ' 要保持文字样子')
  assert.equal(has(0x1FA99), true, '金币 🪙')
})

test('设置里切到「系统自带」时字体栈去掉内置 emoji', () => {
  const html = readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8')
  assert.match(html, /\[data-emoji="system"\]\{--ac-font:Nunito/)
})
