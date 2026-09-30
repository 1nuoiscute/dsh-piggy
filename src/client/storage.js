// @ts-check
/**
 * 面板自己的小存储：展开状态、位置与开发者模式开关。
 *
 * 隐私模式下 localStorage 会抛异常，所以读写都要兜住。
 * @module dsh-pig/client/storage
 */
export function readStore(key) {
  try { return window.localStorage.getItem(key) } catch (error) { return null }
}


export function writeStore(key, value) {
  try { window.localStorage.setItem(key, value) } catch (error) { /* private mode */ }
}
