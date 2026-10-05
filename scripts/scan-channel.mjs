// @ts-check
/**
 * 打完 Gitee 渠道的包后扫一遍：游戏和外壳里不许出现 GitHub 的更新/下载/扩展地址。
 * 用法：node scripts/scan-channel.mjs gitee <文件或目录>...
 *   - 普通文本文件（.js .cjs .mjs .json .yml .html）直接扫；
 *   - 游戏包 game-*.json.gz 解开后逐个文件扫；
 *   - 外壳 app.asar 解开后扫（第三方库 node_modules 跳过：electron-updater 自带 GitHub 支持代码，Gitee 版用不到）。
 * 发现就打印出处并以 1 退出。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { gunzipSync } from 'node:zlib'

const [channel, ...targets] = process.argv.slice(2)
if (channel !== 'gitee' || targets.length === 0) {
  console.error('usage: node scripts/scan-channel.mjs gitee <path>...')
  process.exit(2)
}
const BAD = /api\.github\.com|raw\.githubusercontent\.com|github\.com\/CLICGGER-TYPES/
const TEXT = /\.(js|cjs|mjs|json|ya?ml|html)$/
const hits = []
let scanned = 0

/** @param {string} where @param {string} text */
function scanText(where, text) {
  scanned += 1
  const m = text.match(BAD)
  if (m) hits.push(`${where}: ${m[0]}`)
}

/** @param {string} file */
function scanAsar(file) {
  const require = createRequire(join(process.cwd(), 'apps/desktop/package.json'))
  const name = '@electron/asar' // 桌面目录的依赖；CI 打完桌面包时才有
  const asar = require(name)
  for (const entry of asar.listPackage(file)) {
    const rel = entry.replace(/^[\\/]/, '')
    if (rel.split(/[\\/]/).includes('node_modules') || !TEXT.test(rel)) continue
    let content
    try { content = asar.extractFile(file, rel) } catch { continue }
    scanText(`${file}!${rel}`, content.toString('utf8'))
  }
}

/** @param {string} path */
function walk(path) {
  const stat = statSync(path)
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (name === 'node_modules' || name === '.git') continue
      walk(join(path, name))
    }
    return
  }
  if (path.endsWith('.json.gz')) {
    const pack = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'))
    for (const [rel, b64] of Object.entries(pack.files ?? {})) if (TEXT.test(rel)) scanText(`${path}!${rel}`, Buffer.from(String(b64), 'base64').toString('utf8'))
  } else if (path.endsWith('.asar')) {
    scanAsar(path)
  } else if (TEXT.test(path)) {
    scanText(relative(process.cwd(), path), readFileSync(path, 'utf8'))
  }
}

for (const target of targets) {
  if (!existsSync(target)) { console.error('没有这个路径：' + target); process.exit(2) }
  walk(target)
}
if (hits.length > 0) {
  console.error('Gitee 渠道的包里还有 GitHub 地址：\n' + hits.join('\n'))
  process.exit(1)
}
console.log(`scan-channel: 扫了 ${scanned} 个文件，没有 GitHub 地址`)
