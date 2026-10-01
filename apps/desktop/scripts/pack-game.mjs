// @ts-check
/**
 * 把插件里桌面版要用的那部分复制成 apps/desktop/game/：宿主（存档、结算、路由）、
 * 共享库、打好的 client.js 和立绘。安装包里带的就是这一份；热更新下载的游戏包也是
 * 同样的结构（见 scripts/release-game.mjs）。
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Everything the desktop host imports, plus what the page loads. */
export const GAME_FILES = [
  'package.json', 'core.js', 'data.js', 'store.js', 'store', 'routes.js', 'snapshot.js',
  'packages/pet-core/package.json', 'packages/pet-core/src', 'client.js', 'assets',
]

/** Copy the game files from the repo root into `out`. */
export function packGame(root, out) {
  rmSync(out, { recursive: true, force: true })
  for (const entry of GAME_FILES) {
    const from = join(root, entry)
    if (!existsSync(from)) throw new Error(`missing ${entry}`)
    mkdirSync(dirname(join(out, entry)), { recursive: true })
    cpSync(from, join(out, entry), { recursive: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url))
  const root = join(here, '..', '..', '..')
  packGame(root, join(here, '..', 'game'))
  console.log('game packed')
}
