// @ts-check
/**
 * 桌面版热更新：列版本（能不能装、为什么不能）、下载校验、解包、切换、回退。
 * GitHub 用假的 fetch 代替；游戏包用 release-game 真生成。
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

import { compareVersions, createVersions } from '../lib/versions.js'
import { releaseGame } from '../scripts/release-game.mjs'

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))

/** A fake GitHub: a releases list plus the files it links to. */
function fakeGithub(files, releases) {
  const calls = []
  const fetch = async url => {
    calls.push(url)
    if (url === 'releases') return new Response(JSON.stringify(releases))
    if (!(url in files)) return new Response('nope', { status: 404 })
    return new Response(files[url])
  }
  return { fetch: /** @type {any} */ (fetch), calls }
}

const release = (version, extra = {}) => ({
  tag_name: 'v' + version, name: 'v' + version, published_at: '2026-10-01T00:00:00Z', body: '改了点东西', html_url: 'page',
  assets: [
    { name: `game-${version}.manifest.json`, browser_download_url: `m-${version}` },
    { name: `game-${version}.json.gz`, browser_download_url: `p-${version}` },
  ],
  ...extra,
})

function setup(save = { version: 12 }) {
  const dir = mkdtempSync(join(tmpdir(), 'piggy-versions-'))
  const bundled = join(dir, 'bundled')
  mkdirSync(bundled)
  writeFileSync(join(bundled, 'package.json'), JSON.stringify({ version: '0.24.0' }))
  const statePath = join(dir, 'state.json')
  writeFileSync(statePath, JSON.stringify(save))
  return { dir, bundled, statePath }
}

test('versions compare like numbers, not strings', () => {
  assert.ok(compareVersions('0.10.0', '0.9.9') > 0)
  assert.equal(compareVersions('v1.2', '1.2.0'), 0)
  assert.ok(compareVersions('0.1.0', '0.2.0') < 0)
})

test('the list says which versions can be installed, and why not', async () => {
  const { dir, bundled, statePath } = setup({ version: 12 })
  try {
    const files = {
      'm-0.26.0': JSON.stringify({ version: '0.26.0', stateVersion: 13, minShell: '0.2.0', sha256: 'x', size: 1 }),
      'm-0.25.0': JSON.stringify({ version: '0.25.0', stateVersion: 12, minShell: '0.1.0', sha256: 'x', size: 1 }),
      'm-0.20.0': JSON.stringify({ version: '0.20.0', stateVersion: 10, minShell: '0.1.0', sha256: 'x', size: 1 }),
    }
    const gh = fakeGithub(files, [release('0.20.0'), release('0.26.0'), release('0.25.0'), { tag_name: 'v0.0.1', assets: [] }])
    const versions = createVersions({ userData: dir, bundledDir: bundled, shellVersion: '0.1.0', statePath, fetch: gh.fetch, releasesUrl: 'releases' })
    const list = await versions.list()
    assert.deepEqual(list.map(r => [r.version, r.blocked]), [['0.26.0', 'shell'], ['0.25.0', null], ['0.20.0', 'save']])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('installing checks the download, switches to it, and rollback goes back', async () => {
  const { dir, bundled, statePath } = setup()
  try {
    const out = join(dir, 'rel')
    const manifest = await releaseGame(ROOT, out, '0.1.0')
    const pack = readFileSync(join(out, `game-${manifest.version}.json.gz`))
    const files = { [`m-${manifest.version}`]: JSON.stringify(manifest), [`p-${manifest.version}`]: pack }
    const gh = fakeGithub(files, [release(manifest.version)])
    const versions = createVersions({ userData: dir, bundledDir: bundled, shellVersion: '0.1.0', statePath, fetch: gh.fetch, releasesUrl: 'releases' })
    const [target] = await versions.list()
    const seen = []
    assert.deepEqual(await versions.install(target, f => seen.push(f)), { ok: true, version: manifest.version })
    assert.equal(seen.at(-1), 1)
    assert.equal(versions.activeDir(), join(dir, 'versions', manifest.version))
    assert.equal(readFileSync(join(versions.activeDir(), 'client.js'), 'utf8'), readFileSync(join(ROOT, 'client.js'), 'utf8'))
    assert.equal(versions.current().previous, '0.24.0')
    assert.equal(versions.current().previousIsBundled, true)

    assert.deepEqual(versions.rollback(), { ok: true, version: '0.24.0' })
    assert.equal(versions.activeDir(), bundled)
    // And forward again: the downloaded one is still there.
    assert.equal(versions.rollback().ok, true)
    assert.equal(versions.activeDir(), join(dir, 'versions', manifest.version))

    // A new installer (different shell version) goes back to its own game.
    const after = createVersions({ userData: dir, bundledDir: bundled, shellVersion: '0.2.0', statePath, fetch: gh.fetch, releasesUrl: 'releases' })
    assert.equal(after.activeDir(), bundled)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a download that fails its checksum, or climbs out of its folder, changes nothing', async () => {
  const { dir, bundled, statePath } = setup()
  try {
    const evil = gzipSync(Buffer.from(JSON.stringify({ files: { 'package.json': 'e30=', '../../escape.txt': 'aGk=' } })))
    const sha = createHash('sha256').update(evil).digest('hex')
    const gh = fakeGithub({ 'p-9.9.9': evil }, [])
    const versions = createVersions({ userData: dir, bundledDir: bundled, shellVersion: '0.1.0', statePath, fetch: gh.fetch, releasesUrl: 'releases' })
    await assert.rejects(versions.install({ version: '9.9.9', packUrl: 'p-9.9.9', manifest: { sha256: 'wrong', size: evil.length } }), /校验不对/)
    await assert.rejects(versions.install({ version: '9.9.9', packUrl: 'p-9.9.9', manifest: { sha256: sha, size: evil.length } }), /可疑路径/)
    assert.equal(versions.activeDir(), bundled)
    assert.equal(versions.rollback().ok, false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
