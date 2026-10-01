// @ts-check
/**
 * The pig's save: open it, keep the pig's whole state in memory, and write it
 * back on a throttle.
 *
 * Only IO and lifetime live here — the method table is in store/api.js and the
 * actual game rules are in core/ (see docs/CONVENTIONS.md).
 *
 * @module dsh-piggy/store
 */
import { createApi } from './store/api.js'
import { defaultStatePath, dshHome, moveLegacySaveDir, readStateFile, writeStateFile } from './store/state-file.js'

export { defaultStatePath, dshHome, moveLegacySaveDir }

const SAVE_THROTTLE_MS = 1500

/**
 * Open (or lazily create on first hatch) the save file.
 * @param {string} [filePath] - where the save lives.
 * @param {object} [options] - test seams.
 * @param {() => number} [options.now] - injectable clock.
 * @param {Function} [options.setTimer] - injectable scheduler.
 * @param {Function} [options.clearTimer] - injectable canceller.
 */
export function createStore(filePath = defaultStatePath(), options = {}) {
  const now = options.now ?? (() => Date.now())
  const setTimer = options.setTimer ?? setTimeout
  const clearTimer = options.clearTimer ?? clearTimeout

  let dirty = false
  let timer = null
  let state = null

  function scheduleSave() {
    dirty = true
    if (timer !== null) return
    timer = setTimer(() => {
      timer = null
      try {
        writeNow()
      } catch (error) {
        // A failed write must not break the harness, but it must not be silent
        // either: the player would keep playing against a save that is not there.
        console.warn(`[dsh-piggy] save failed: path="${filePath}" reason="${error instanceof Error ? error.message : String(error)}"`)
      }
    }, SAVE_THROTTLE_MS)
    if (typeof timer?.unref === 'function') timer.unref()
  }

  function writeNow() {
    if (!dirty || state === null) return
    writeStateFile(filePath, state)
    dirty = false
  }

  /** Run a core mutator, saving when it reports success. */
  function mutate(fn) {
    if (state === null) return { ok: false, reason: 'absent' }
    // A core call that throws halfway used to leave the half-applied state in
    // memory — and the next save wrote it out. Snapshot first, restore on throw.
    const before = structuredClone(state)
    try {
      const result = fn(state)
      scheduleSave()
      return result
    } catch (error) {
      state = before
      return { ok: false, reason: 'error', message: error instanceof Error ? error.message : String(error) }
    }
  }

  const opened = readStateFile(filePath, now())
  state = opened.state
  dirty = opened.needsSave

  return createApi({
    filePath,
    now,
    getState: () => state,
    setState: next => { state = next },
    scheduleSave,
    mutate,
    dispose() {
      if (timer !== null) {
        clearTimer(timer)
        timer = null
      }
      try {
        writeNow()
      } catch (error) {
        console.warn(`[dsh-piggy] final save failed: path="${filePath}" reason="${error instanceof Error ? error.message : String(error)}"`)
      }
    },
  })
}
