/**
 * dsh-pig · store — the save file and the feeding valve.
 *
 * One pig per harness home, saved at `$DSH_HOME/dsh-pig/state.json`. Writes go
 * to a sibling temp file, get fsynced, then atomically rename over the old
 * save, so a crash mid-write can never leave a torn pig. Feeds are throttled to
 * one disk write per interval so a busy agent doesn't turn every tool call into
 * IO — and every write is wrapped, because a pet must never break the harness.
 *
 * Every mutator funnels through `decay()` inside core, which is also where a
 * finished work shift, an illness flare-up or a death is resolved. Nothing here
 * owns a timer: the pig is driven entirely by wall-clock timestamps, so it
 * survives restarts exactly as it was left.
 *
 * @module dsh-pig/store
 */

import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, writeSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  act as coreAct,
  buy as coreBuy,
  callOffActivity as coreCallOff,
  decay,
  drainPending,
  feed as coreFeed,
  grantAll as coreGrantAll,
  adopt as coreAdopt,
  ageFromNow as coreAgeFromNow,
  setTimeScale as coreSetTimeScale,
  hatch as coreHatch,
  applyDevPatch as coreDevPatch,
  reset as coreReset,
  hatchEgg,
  migrate,
  rename as coreRename,
  sellSouvenir as coreSellSouvenir,
  startStudy as coreStartStudy,
  startInterest as coreStartInterest,
  startTrip as coreStartTrip,
  startWork as coreStartWork,
  useItem as coreUseItem,
  wearItem as coreWearItem,
  takeOff as coreTakeOff,
} from './core.js'

/** The harness home, matching the launcher's own resolution. */
export function dshHome() {
  const configured = process.env.DSH_HOME
  return configured !== undefined && configured.trim() !== ''
    ? resolve(configured.trim())
    : join(homedir(), '.dsh')
}

/** Default save location. */
export function defaultStatePath() {
  return join(dshHome(), 'dsh-pig', 'state.json')
}

const SAVE_THROTTLE_MS = 1500

/**
 * Open (or lazily create on first hatch) the save file.
 * @param filePath - where the save lives.
 * @param options.now - injectable clock for tests.
 * @param options.setTimer / options.clearTimer - injectable scheduler for tests.
 */
export function createStore(filePath = defaultStatePath(), options = {}) {
  const now = options.now ?? (() => Date.now())
  const setTimer = options.setTimer ?? setTimeout
  const clearTimer = options.clearTimer ?? clearTimeout

  let dirty = false
  let timer = null
  let state = load()

  /**
   * Read the save, keeping the evidence when it cannot be used.
   *
   * A bare `catch { return null }` used to turn a corrupt or unreadable save
   * into "no pig" — the pig silently vanished and the next write would have
   * buried the old file. Now every unusable save is logged and copied aside
   * first; the original file is left untouched.
   */
  function load() {
    let raw
    try {
      raw = readFileSync(filePath, 'utf8')
    } catch (error) {
      // A missing save is the normal first run; anything else is worth saying.
      if (error?.code !== 'ENOENT') {
        console.warn(`[dsh-pig] could not read save: path="${filePath}" reason="${error instanceof Error ? error.message : String(error)}"`)
      }
      return null
    }

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      preserveUnusableSave(raw, `invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }

    const upgraded = migrate(parsed, now())
    if (upgraded === null) {
      preserveUnusableSave(raw, 'migrate() rejected the shape')
      return null
    }
    if (parsed?.version !== upgraded.version) dirty = true
    return upgraded
  }

  /** Copy an unusable save next to the original, then complain loudly. */
  function preserveUnusableSave(raw, reason) {
    const backup = `${filePath}.corrupt-${new Date(now()).toISOString().replace(/[:.]/g, '-')}`
    try {
      writeFileSync(backup, raw)
    } catch (error) {
      console.warn(`[dsh-pig] save unusable (${reason}) and the backup failed: path="${filePath}" reason="${error instanceof Error ? error.message : String(error)}"`)
      return
    }
    console.warn(`[dsh-pig] save unusable (${reason}); kept a copy at "${backup}" and left the original untouched`)
  }

  function writeNow() {
    if (!dirty || state === null) return
    mkdirSync(dirname(filePath), { recursive: true })
    const tmp = `${filePath}.tmp`
    const fd = openSync(tmp, 'w')
    try {
      writeSync(fd, JSON.stringify(state, null, 2))
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    renameSync(tmp, filePath)
    dirty = false
  }

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
        console.warn(`[dsh-pig] save failed: path="${filePath}" reason="${error instanceof Error ? error.message : String(error)}"`)
      }
    }, SAVE_THROTTLE_MS)
    if (typeof timer?.unref === 'function') timer.unref()
  }

  /** Run a core mutator, saving when it reports success. */
  function mutate(fn) {
    if (state === null) return { ok: false, reason: 'absent' }
    try {
      const result = fn(state)
      scheduleSave()
      return result
    } catch (error) {
      return { ok: false, reason: 'error', message: error instanceof Error ? error.message : String(error) }
    }
  }

  return {
    /** The live state (null until an egg is laid). Exposed for rendering. */
    get state() { return state },

    /** Where this pig is saved. */
    get filePath() { return filePath },

    /** Digest one observed harness event; silently ignored before hatching. */
    feed(event) {
      if (state === null) return []
      try {
        const crossed = coreFeed(state, event, now())
        scheduleSave()
        return crossed
      } catch {
        return []
      }
    },

    /** Fold wall-clock decay in (and resolve work/illness) then hand back state. */
    freshen() {
      if (state === null) return null
      try {
        decay(state, now())
        scheduleSave()
      } catch { /* keep the stale-but-valid state */ }
      return state
    },

    /** Apply one care action with its cooldown, spending `itemKey` when given. */
    act: (action, itemKey) => mutate(live => coreAct(live, action, now(), itemKey)),

    /** Send the pig out to work. */
    startWork: jobKey => mutate(live => coreStartWork(live, jobKey, now())),

    /** Send the pig to class. */
    startStudy: (subjectKey, stageKey) => mutate(live => coreStartStudy(live, subjectKey, stageKey, now())),

    /** Send the pig to an 兴趣课. */
    startInterest: interestKey => mutate(live => coreStartInterest(live, interestKey, now())),

    /** Debug: one of everything (consumables, 装扮, coins). */
    grantAll: () => mutate(live => coreGrantAll(live, now())),

    /** Send the pig travelling. */
    startTrip: tripKey => mutate(live => coreStartTrip(live, tripKey, now())),

    /** Bring the pig home early (work forfeits pay; study/trips are refunded). */
    callOffActivity: () => mutate(live => coreCallOff(live, now())),

    /** Back-compat alias. */
    callOffWork: () => mutate(live => coreCallOff(live, now())),

    /** Buy one item into the backpack. */
    buy: itemKey => mutate(live => coreBuy(live, itemKey, now())),

    /** Use one item from the backpack. */
    useItem: itemKey => mutate(live => coreUseItem(live, itemKey, now())),
    sellSouvenir: souvenirKey => mutate(live => coreSellSouvenir(live, souvenirKey, now())),
    wear: (itemKey, on) => mutate(live => (on ? coreWearItem(live, itemKey, now()) : coreTakeOff(live, itemKey, now()))),

    /** Open the box. Only works when there is no pig at all. */
    hatch() {
      // A save that exists but is not hatched is a box — reset and adopt both
      // produce one. Refusing because `state !== null` left the box unopenable.
      if (state !== null && state.hatched === true) return false
      state = state === null ? hatchEgg(now()) : coreHatch(state, now())
      scheduleSave()
      return true
    },

    /** Change how fast the pig ages. */
    setTimeScale(scale) {
      if (state === null) return false
      state = coreSetTimeScale(state, scale, now())
      scheduleSave()
      return true
    },

    /** Put the age back on the real clock. */
    ageFromNow() {
      if (state === null) return false
      state = coreAgeFromNow(state, now())
      scheduleSave()
      return true
    },

    /** Developer mode: force the pig into any state. */
    dev(patch) {
      if (state === null) return false
      state = coreDevPatch(state, patch, now())
      scheduleSave()
      return true
    },

    /** Start from a brand new box, living pig or not. */
    reset() {
      state = coreReset(now())
      scheduleSave()
      return true
    },

    /**
     * Start over with a fresh box, keeping the old pig's memories. Only offered
     * once a pig has died — you cannot throw a living one away.
     */
    adopt() {
      if (state === null) return false
      if (state.dead !== true) return false
      state = coreAdopt(state, now())
      scheduleSave()
      return true
    },

    /** Rename the pig; null when the name is unusable or the pig is absent. */
    rename(rawName) {
      if (state === null) return null
      try {
        const cleaned = coreRename(state, rawName, now())
        if (cleaned !== null) scheduleSave()
        return cleaned
      } catch {
        return null
      }
    },

    /** Take the queued announcements (work done, got sick, got better…). */
    drainPending() {
      if (state === null) return []
      try {
        const events = drainPending(state)
        if (events.length > 0) scheduleSave()
        return events
      } catch {
        return []
      }
    },

    /** Flush any pending write and stop the timer. Called on plugin unload. */
    dispose() {
      if (timer !== null) {
        clearTimer(timer)
        timer = null
      }
      try { writeNow() } catch { /* best effort on the way out */ }
    },
  }
}
