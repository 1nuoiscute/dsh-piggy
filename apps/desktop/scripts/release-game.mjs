// @ts-check
/**
 * 生成一个版本的游戏包，挂到 GitHub Release 上给桌面版热更新用：
 *   game-<版本>.json.gz        gzip 过的 { files: { 相对路径: base64 } }（内容同 pack-game）
 *   game-<版本>.manifest.json  { version, stateVersion, minShell, sha256, size }
 * 版本号取仓库根的 package.json；minShell 取本目录 package.json 的 piggy.minShell，
 * 也就是「这个游戏包至少要多新的安装包才能跑」。
 *
 * 用法：node scripts/release-game.mjs [输出目录，默认 dist-game]
 */
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

import { packGame } from './pack-game.mjs'

/** Every file under `dir`, as forward-slash paths relative to it. */
function walk(dir, base = dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full, base) : [relative(base, full).split(sep).join('/')]
  })
}

/** Build the package and its manifest for the repo at `root`, into `out`. */
export async function releaseGame(root, out, minShell) {
  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
  const { STATE_VERSION } = await import(pathToFileURL(join(root, 'packages/pet-core/src/core/constants.js')).href)
  const staging = mkdtempSync(join(tmpdir(), 'piggy-game-'))
  try {
    packGame(root, staging)
    const files = {}
    for (const rel of walk(staging)) files[rel] = readFileSync(join(staging, rel)).toString('base64')
    const pack = gzipSync(Buffer.from(JSON.stringify({ files })), { level: 9 })
    const manifest = {
      version, stateVersion: STATE_VERSION, minShell,
      sha256: createHash('sha256').update(pack).digest('hex'), size: pack.length,
    }
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, `game-${version}.json.gz`), pack)
    writeFileSync(join(out, `game-${version}.manifest.json`), JSON.stringify(manifest, null, 2))
    return manifest
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url))
  const desktop = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))
  const out = process.argv[2] ?? join(here, '..', 'dist-game')
  const manifest = await releaseGame(join(here, '..', '..', '..'), out, desktop.piggy.minShell)
  console.log(JSON.stringify(manifest))
}
