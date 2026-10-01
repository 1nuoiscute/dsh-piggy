// @ts-check
/**
 * 面板自己的小存储：展开状态、位置与开发者模式开关。
 *
 * 隐私模式下 localStorage 会抛异常，所以读写都要兜住。
 * @module dsh-piggy/client/storage
 */
export function readStore(key) {
  try {
    var value = window.localStorage.getItem(key)
    // Keys were 'dsh-pig:*' before the rename; read those once so nothing resets.
    return value !== null ? value : window.localStorage.getItem(key.replace(/^dsh-piggy:/, 'dsh-pig:'))
  } catch (error) { return null }
}


export function writeStore(key, value) {
  try { window.localStorage.setItem(key, value) } catch (error) { /* private mode */ }
}
