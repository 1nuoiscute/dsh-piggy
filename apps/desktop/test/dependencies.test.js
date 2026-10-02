import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('desktop updater uses the patched builder-util-runtime in every install path', () => {
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
  const installs = Object.entries(lock.packages).filter(([path]) => path.endsWith('node_modules/builder-util-runtime'))
  assert.ok(installs.length > 0, 'the updater runtime must be present in the lockfile')
  for (const [path, pkg] of installs) {
    const [major, minor] = pkg.version.split('.').map(Number)
    assert.ok(major > 9 || (major === 9 && minor >= 7), `${path}@${pkg.version} lacks the credential redirect fix`)
  }
})
