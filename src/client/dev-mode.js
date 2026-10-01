// @ts-check
/**
 * 调试模式（C1）：主屏版本号 3 秒内连点 7 次解锁，**只在内存里记住**。
 *
 * 以前是 Ctrl+Shift+D + localStorage 永久记住，用户反馈「怎么关都关不掉」——
 * 现在刷新/重启就回到关闭状态，控制台也只留一个 `dshPigDev.off()` 救急。
 * @module dsh-piggy/client/dev-mode
 */

import { DEV_KEY, DEV_TAPS_TO_UNLOCK, DEV_TAP_HINT_FROM, DEV_TAP_HINT_MS, DEV_TAP_WINDOW_MS } from './constants.js'
import { writeStore } from './storage.js'

/**
 * @param {(on: boolean) => void} applyOn - 外壳负责画：data-dev、图标栏、气泡、切页签
 * @param {(text: string, ms: number) => void} say - 猪的气泡
 */
export function createDevMode(applyOn, say) {
  var on = false
  var taps = 0
  var startedAt = 0

  function set(next) {
    var value = next === true
    if (value === on) return
    on = value
    taps = 0
    applyOn(on)
  }

  /** 版本号被点了一下。 */
  function tap() {
    var at = Date.now()
    if (taps === 0 || at - startedAt > DEV_TAP_WINDOW_MS) {
      taps = 0
      startedAt = at
    }
    taps += 1
    if (taps >= DEV_TAPS_TO_UNLOCK) {
      set(true)
      return
    }
    // 前三次纯属手滑，不打扰；从第四次开始说还差几下。
    if (taps >= DEV_TAP_HINT_FROM) say('再点 ' + (DEV_TAPS_TO_UNLOCK - taps) + ' 次', DEV_TAP_HINT_MS)
  }

  /**
   * 启动时调一次：把老版本存下的「已开」写掉，并挂上控制台的 off。
   * 只保留 off —— 能直接开的话，这把锁就是摆设。
   */
  function install() {
    writeStore(DEV_KEY, '0')
    try {
      /** @type {any} */ (window).dshPigDev = { off: function () { set(false) } }
    } catch (error) { /* frozen window */ }
  }

  /** 外壳 dispose 时调：控制台句柄不能比猪活得久。 */
  function dispose() {
    try { delete (/** @type {any} */ (window)).dshPigDev } catch (error) { /* frozen window */ }
  }

  return { isOn: function () { return on }, set: set, tap: tap, install: install, dispose: dispose }
}
