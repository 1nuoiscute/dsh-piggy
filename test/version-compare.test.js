import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareVersions } from '../src/client/update-notice.js'
import { compareVersions as shellCompare } from '../apps/desktop/lib/versions.js'

test('预览版排在正式版前面：在用 0.27.3-rc.2 时 0.27.2 不算新，0.27.3 正式版算新', () => {
  for (const compare of [compareVersions, shellCompare]) {
    assert.ok(compare('0.27.3-rc.2', '0.27.2') > 0)
    assert.ok(compare('0.27.3', '0.27.3-rc.2') > 0)
    assert.ok(compare('0.27.3-rc.2', '0.27.3-rc.1') > 0)
    assert.ok(compare('0.27.3-rc.10', '0.27.3-rc.9') > 0)
    assert.equal(compare('v0.27.3', '0.27.3'), 0)
    assert.ok(compare('0.2.3', '0.1.2') > 0)
  }
})
