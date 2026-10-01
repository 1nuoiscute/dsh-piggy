// 从 CHANGELOG.md 抽出某个版本的全部小节，当 GitHub Release 的说明。
// 用法：node scripts/release-notes.mjs 0.25.1 > notes.md
// 同一版本可能有多个小节（「## [0.25.0] — 日期 · 主题」），全部按原顺序收进来。
import { readFileSync } from 'node:fs'

const version = (process.argv[2] ?? '').replace(/^v/, '')
if (!version) { console.error('usage: release-notes.mjs <version>'); process.exit(1) }
const lines = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split('\n')
const out = []
let keep = false
for (const line of lines) {
  if (line.startsWith('## ')) {
    keep = line.startsWith(`## [${version}]`)
    // 小节标题降一级，并去掉重复的版本号前缀，Release 页面上读起来更顺
    if (keep) out.push('### ' + line.replace(/^## \[[^\]]+\]\s*—?\s*/, '').replace(/^[\d-]+\s*·\s*—?\s*/, '').trim())
    continue
  }
  if (keep) out.push(line.replace(/^### /, '#### '))
}
const body = out.join('\n').trim()
if (!body) { console.error(`CHANGELOG 里没有 ${version} 的小节`); process.exit(1) }
console.log(body)
