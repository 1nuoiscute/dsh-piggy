// 生成在线扩展目录（extensions/registry.json）里的一条：读扩展的 manifest，算每个文件的 sha256，
// 地址指向本仓库的 GitHub Release「ext-<key>-<版本>」。
// 用法：node scripts/extension-entry.mjs blindbox   → 打印这一条（JSON）
// 发布步骤见 docs/design/extension-download.md 第 3 节。
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const key = process.argv[2]
if (!key) { console.error('usage: extension-entry.mjs <key>'); process.exit(1) }
const dir = new URL(`../extensions/${key}/`, import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'))
const tag = `ext-${key}-${manifest.version}`
const files = {}
for (const name of ['manifest.json', 'server.js', 'client.js']) {
  const buffer = readFileSync(new URL(name, dir))
  files[name] = {
    url: `https://github.com/CLICGGER-TYPES/dsh-piggy/releases/download/${tag}/${name}`,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  }
}
const { app, ...rest } = manifest
console.log(JSON.stringify({ ...rest, files }, null, 2))
