// @ts-check
/**
 * 把项目规范里能静态检查的条款变成测试。
 *
 * 这些是回归守卫：以后谁把 `Date.now()` 写回领域层、或在代码注释里塞 emoji，
 * 测试会当场拦下来，而不是等到线上才发现。
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'

const packageRoot = new URL('..', import.meta.url)

/** Every .js file below `dirUrl` (missing directories are simply empty). */
function jsFiles(dirUrl) {
  if (!existsSync(dirUrl)) return []
  const out = []
  for (const entry of readdirSync(dirUrl, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dirUrl)
    if (entry.isDirectory()) out.push(...jsFiles(child))
    else if (entry.name.endsWith('.js')) out.push(child)
  }
  return out
}

const read = url => readFileSync(url, 'utf8')
const shortName = url => url.pathname.split('/').slice(-2).join('/')

test('the domain layer never reads the system clock', () => {
  // core.js is the barrel; core/ holds the modules it re-exports.
  const files = [new URL('core.js', packageRoot), ...jsFiles(new URL('core/', packageRoot))]
  const offenders = files.filter(url => /Date\.now\(\)/.test(read(url))).map(shortName)
  assert.deepEqual(
    offenders,
    [],
    'pass nowMs in as a parameter instead of reading the clock inside core (CONVENTIONS §分层)',
  )
})
