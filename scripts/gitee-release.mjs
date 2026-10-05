// @ts-check
/**
 * Gitee 发行版小工具（CI 和手动发扩展用），令牌从环境变量 GITEE_TOKEN 读，不落盘。
 *   node scripts/gitee-release.mjs ensure <tag> [说明.md]   有就复用、没有就建，打印发行版 id
 *   node scripts/gitee-release.mjs upload <id> <文件>...     上传附件（同名的先删，再传）
 *   node scripts/gitee-release.mjs prune <保留的tag>          删掉其它 v* 发行版里的安装包附件（游戏包留着，回退用）
 * 仓库默认 clicgger/dsh-piggy，可用 GITEE_REPO 改。Gitee 附件单个 ≤100MB、单仓库总量 ≤1GB。
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const TOKEN = process.env.GITEE_TOKEN
const REPO = process.env.GITEE_REPO || 'clicgger/dsh-piggy'
const API = `https://gitee.com/api/v5/repos/${REPO}`
if (!TOKEN) { console.error('缺少环境变量 GITEE_TOKEN'); process.exit(2) }

/** @param {string} path @param {RequestInit} [init] */
async function call(path, init = {}) {
  const url = new URL(API + path)
  if (!(init.body instanceof FormData)) url.searchParams.set('access_token', TOKEN ?? '')
  const res = await fetch(url, init)
  const text = await res.text()
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

async function releases() {
  const all = []
  for (let page = 1; page < 20; page += 1) {
    const batch = await call(`/releases?per_page=100&page=${page}&direction=desc`)
    if (!Array.isArray(batch) || batch.length === 0) break
    all.push(...batch)
  }
  return all
}

/** @param {number|string} id */
const attachments = async id => (await call(`/releases/${id}/attach_files?per_page=100`)) ?? []

const [cmd, ...args] = process.argv.slice(2)
if (cmd === 'ensure') {
  const [tag, notesFile] = args
  const found = (await releases()).find(r => r.tag_name === tag)
  if (found) { console.log(found.id); process.exit(0) }
  const created = await call('/releases', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ access_token: TOKEN, tag_name: tag, name: tag, body: notesFile ? readFileSync(notesFile, 'utf8') : tag, prerelease: tag.includes('-'), target_commitish: 'main' }),
  })
  console.log(created.id)
} else if (cmd === 'upload') {
  const [id, ...files] = args
  const existing = await attachments(id)
  for (const file of files) {
    const name = basename(file)
    for (const old of existing.filter(a => a.name === name)) await call(`/releases/${id}/attach_files/${old.id}`, { method: 'DELETE' })
    const form = new FormData()
    form.set('access_token', TOKEN)
    form.set('file', new Blob([readFileSync(file)]), name)
    const res = await call(`/releases/${id}/attach_files`, { method: 'POST', body: form })
    console.log('uploaded', name, res?.size ?? '')
  }
} else if (cmd === 'prune') {
  const [keep] = args
  const INSTALLER = /\.(exe|dmg|AppImage|blockmap|zip)$|^latest.*\.yml$/
  let freed = 0
  for (const release of await releases()) {
    if (release.tag_name === keep || !/^v\d/.test(release.tag_name)) continue
    for (const file of await attachments(release.id)) {
      if (!INSTALLER.test(file.name)) continue
      await call(`/releases/${release.id}/attach_files/${file.id}`, { method: 'DELETE' })
      freed += Number(file.size) || 0
      console.log('removed', release.tag_name, file.name)
    }
  }
  console.log(`prune: 释放约 ${(freed / 1048576).toFixed(1)}MB`)
} else {
  console.error('usage: gitee-release.mjs ensure|upload|prune ...')
  process.exit(2)
}
