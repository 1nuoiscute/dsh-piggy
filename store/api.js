// @ts-check
/**
 * store 的方法表：每个方法都转发给 core，并在成功后安排一次保存。
 *
 * 方法表单独成文件，是为了让 store.js 只剩"打开存档 + 节流写盘"这一件事
 * （见 docs/CONVENTIONS.md 的单一职责与函数长度条款）。
 *
 * @module dsh-piggy/store/api
 */
import {
  act as coreAct,
  adopt as coreAdopt,
  ageFromNow as coreAgeFromNow,
  applyDevPatch as coreDevPatch,
  buy as coreBuy,
  callOffActivity as coreCallOff,
  decay,
  drainPending,
  feed as coreFeed,
  grantAll as coreGrantAll,
  hatch as coreHatch,
  hatchEgg,
  chat as coreChat,
  rename as coreRename,
  replyToLine as coreReplyToLine,
  openGift as coreOpenGift,
  writeDiaryIfNewDay as coreWriteDiary,
  recordOnline as coreRecordOnline,
  signIn as coreSignIn,
  reset as coreReset,
  seeDoctor as coreSeeDoctor,
  setCatchphrase as coreSetCatchphrase,
  setMotto as coreSetMotto,
  crown as coreCrown,
  setOwnerName as coreSetOwnerName,
  setQuiet as coreSetQuiet,
  sellSouvenir as coreSellSouvenir,
  setTimeScale as coreSetTimeScale,
  startInterest as coreStartInterest,
  startStudy as coreStartStudy,
  startTrip as coreStartTrip,
  startWork as coreStartWork,
  takeOff as coreTakeOff,
  useItem as coreUseItem,
  wearItem as coreWearItem,
} from '../core.js'

/**
 * @typedef {object} StoreControl
 * @property {string} filePath - where this pig is saved
 * @property {() => number} now - injectable clock
 * @property {() => object|null} getState - live state (null until an egg is laid)
 * @property {(next: object|null) => void} setState - replace the live state
 * @property {() => void} scheduleSave - request a throttled write
 * @property {(fn: (state: object) => object) => object} mutate - run a core mutator, saving on success
 * @property {() => void} dispose - flush and stop the timer
 */

/**
 * Build the store's public methods.
 * @param {StoreControl} control
 * @returns {object} the store API
 */
export function createApi(control) {
  const { filePath, now, getState, setState, scheduleSave, mutate, dispose } = control

  /** 上一次「面板轮询」的时刻，用来算在线时长；0 = 还没见过第一次。 */
  let lastPollMs = 0

  return {
    /** The live state (null until an egg is laid). Exposed for rendering. */
    get state() { return getState() },

    /** Where this pig is saved. */
    get filePath() { return filePath },

    /** Digest one observed harness event; silently ignored before hatching. */
    feed(event) {
      const state = getState()
      if (state === null) return []
      try {
        const crossed = coreFeed(state, event, now())
        scheduleSave()
        return crossed
      } catch (error) {
        console.warn(`[dsh-piggy] feed failed: event="${event}" reason="${error instanceof Error ? error.message : String(error)}"`)
        return []
      }
    },

    /** Fold wall-clock decay in (and resolve work/illness) then hand back state. */
    freshen() {
      const state = getState()
      if (state === null) return null
      try {
        const nowMs = now()
        // 在线时长按真实时间累计（与调试页的时间倍率无关）；每次读状态就是
        // 一次「面板还在轮询」的证据。
        coreRecordOnline(state, lastPollMs, nowMs)
        lastPollMs = nowMs
        // 跨过 06:00 之后第一次读状态，就把前一天写成一篇日记。
        coreWriteDiary(state, nowMs)
        decay(state, nowMs)
        scheduleSave()
      } catch (error) {
        // Keep the stale-but-valid state, but say why it is stale.
        console.warn(`[dsh-piggy] decay failed: reason="${error instanceof Error ? error.message : String(error)}"`)
      }
      return getState()
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

    /** 看医生: pay to be cured without buying the medicine. */
    seeDoctor: () => mutate(live => coreSeeDoctor(live, now())),
    sellSouvenir: souvenirKey => mutate(live => coreSellSouvenir(live, souvenirKey, now())),

    /** The pig speaks up on its own: 'enter' after a while away, or 'idle'. */
    chat: reason => mutate(live => coreChat(live, reason === 'enter' ? 'enter' : 'idle', now())),

    /** 免打扰 on or off. */
    setQuiet: on => mutate(live => coreSetQuiet(live, on)),

    /** The pig's catchphrase (居民卡). */
    setCatchphrase: text => mutate(live => coreSetCatchphrase(live, text)),

    /** The line on the pig's card (居民卡). */
    setMotto: text => mutate(live => coreSetMotto(live, text)),

    /** 加冕: the owner picks a form the pig qualifies for. */
    crown: formKey => mutate(live => coreCrown(live, now(), formKey || undefined)),

    /** What the pig calls its owner. */
    setOwnerName: name => mutate(live => coreSetOwnerName(live, name)),

    /** The owner answers the pig's latest line. */
    reply: (lineId, replyIndex) => mutate(live => coreReplyToLine(live, lineId, replyIndex)),

    /** 领今天的签到礼包。 */
    signIn: () => mutate(live => coreSignIn(live, now())),

    /** 开一个攒着的在线礼包。 */
    openGift: () => mutate(live => coreOpenGift(live, now())),
    wear: (itemKey, on) => mutate(live => (on ? coreWearItem(live, itemKey, now()) : coreTakeOff(live, itemKey, now()))),

    /** Open the box. Only works when there is no living pig yet. */
    hatch() {
      const state = getState()
      // A save that exists but is not hatched is a box — reset and adopt both
      // produce one. Refusing because `state !== null` left the box unopenable.
      if (state !== null && state.hatched === true) return false
      setState(state === null ? hatchEgg(now()) : coreHatch(state, now()))
      scheduleSave()
      return true
    },

    /** Change how fast the pig ages. */
    setTimeScale(scale) {
      const state = getState()
      if (state === null) return false
      setState(coreSetTimeScale(state, scale, now()))
      scheduleSave()
      return true
    },

    /** Put the age back on the real clock. */
    ageFromNow() {
      const state = getState()
      if (state === null) return false
      setState(coreAgeFromNow(state, now()))
      scheduleSave()
      return true
    },

    /** Developer mode: force the pig into any state. */
    dev(patch) {
      // Through mutate(): a patch that blows up halfway must not be written.
      return mutate(live => { coreDevPatch(live, patch, now()); return true }) === true
    },

    /** Start from a brand new box, living pig or not. */
    reset() {
      setState(coreReset(now()))
      scheduleSave()
      return true
    },

    /**
     * Start over with a fresh box, keeping the old pig's memories. Only offered
     * once a pig has died — you cannot throw a living one away.
     */
    adopt() {
      const state = getState()
      if (state === null) return false
      if (state.dead !== true) return false
      setState(coreAdopt(state, now()))
      scheduleSave()
      return true
    },

    /** Rename the pig; null when the name is unusable or the pig is absent. */
    rename(rawName) {
      const state = getState()
      if (state === null) return null
      try {
        const cleaned = coreRename(state, rawName, now())
        if (cleaned !== null) scheduleSave()
        return cleaned
      } catch (error) {
        console.warn(`[dsh-piggy] rename failed: reason="${error instanceof Error ? error.message : String(error)}"`)
        return null
      }
    },

    /** Take the queued announcements (work done, got sick, got better…). */
    drainPending() {
      const state = getState()
      if (state === null) return []
      try {
        const events = drainPending(state)
        if (events.length > 0) scheduleSave()
        return events
      } catch (error) {
        console.warn(`[dsh-piggy] drainPending failed: reason="${error instanceof Error ? error.message : String(error)}"`)
        return []
      }
    },

    /** Flush any pending write and stop the timer. Called on plugin unload. */
    dispose,
  }
}
