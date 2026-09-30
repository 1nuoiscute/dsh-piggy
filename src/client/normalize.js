// @ts-check
/**
 * 把宿主快照（当前版 / 旧版 / 被截断）映射成面板画的那份形状。
 *
 * 缺字段补默认值，永不为 `undefined` —— 这是"满屏 undefined"那个 bug 的修法。
 * @module dsh-pig/client/normalize
 */
import { MODES } from './constants.js'
import { arr, isObj, num, obj, str } from './values.js'

/**
 * Map any host payload — current, older, or truncated — onto the exact
 * shape the panel draws. Missing fields become defaults, never `undefined`.
 * @returns {object} a fully populated view model.
 */
export function normalize(raw) {
  var d = obj(raw)
  var pig = isObj(d.pig) ? d.pig : null
  var legacy = pig !== null && !('coins' in pig) && !('health' in pig)

  return {
    legacy: legacy,
    // Host build version, shown in the debug tab so a stale bundle is
    // visible instead of being guessed at.
    version: str(d.version, ''),
    // Trust the flag when the host sends one. Older hosts did not, and for
    // those "a pig exists" is still the right answer.
    hatched: d.hatched === true || (d.hatched === undefined && pig !== null),
    dead: d.dead === true || (pig !== null && num(pig.health, 5) <= 0),
    pig: pig === null ? null : {
      name: str(pig.name, '猪猪'),
      finalForm: pig.finalForm === 'king' ? 'king' : null,
      coronation: {
        visible: obj(pig.coronation).visible === true,
        ready: obj(pig.coronation).ready === true,
        requirements: arr(obj(pig.coronation).requirements).map(entry => ({
          label: str(obj(entry).label, ''), have: num(obj(entry).have, 0), need: num(obj(entry).need, 0),
        })),
      },
      // The pig is measured in days now; `stage` carries how big it is and
      // what it looks like.
      stage: {
        key: str(obj(pig.stage).key, 'piglet'),
        label: str(obj(pig.stage).label, '小猪'),
        emoji: str(obj(pig.stage).emoji, '🐖'),
        size: num(obj(pig.stage).size, 56),
        line: str(obj(pig.stage).line, ''),
        art: typeof obj(pig.stage).art === 'string' && obj(pig.stage).art !== '' ? obj(pig.stage).art : null,
        faded: obj(pig.stage).faded === true,
      },
      // Older hosts send no sex; the HUD then simply shows none.
      sex: isObj(pig.sex) ? { key: str(pig.sex.key, ''), label: str(pig.sex.label, ''), symbol: str(pig.sex.symbol, '') } : null,
      ageLabel: str(pig.ageLabel, ''),
      ageForced: pig.ageForced === true,
      daysToNextStage: typeof pig.daysToNextStage === 'number' ? pig.daysToNextStage : null,
      soul: pig.soul === true,
      mood: str(pig.mood, 'fine'),
      moodEmoji: str(pig.moodEmoji, '😊'),
      moodLabel: str(pig.moodLabel, '还不错'),
      satiety: Math.round(num(pig.satiety, 0)),
      happiness: Math.round(num(pig.happiness, 0)),
      cleanliness: Math.round(num(pig.cleanliness, 0)),
      health: num(pig.health, 5),
      healthPercent: num(pig.healthPercent, 100),
      coins: num(pig.coins, 0),
      weight: str(pig.weight, '—'),
      xp: num(pig.xp, 0),
      // Level is driven by growth and decides the body (B2).
      level: (function (info) {
        var i = obj(info)
        var t = obj(i.title)
        return {
          level: num(i.level, 1),
          percent: num(i.percent, 0),
          toNext: num(i.toNext, 0),
          maxed: i.maxed === true,
          titleLabel: str(t.label, '新来的'),
          titleEmoji: str(t.emoji, '🌱'),
        }
      })(pig.levelInfo),
      stageLine: str(pig.stageLine, ''),
      illness: isObj(pig.illness) ? {
        name: str(pig.illness.name, '生病'),
        cure: str(pig.illness.cure, '药'),
        cureEmoji: str(pig.illness.cureEmoji, '💊'),
        stage: num(pig.illness.stage, 1),
        doctorFee: typeof pig.illness.doctorFee === 'number' ? pig.illness.doctorFee : null,
      } : null,
      traits: {
        intel: num(obj(pig.traits).intel, 0),
        charm: num(obj(pig.traits).charm, 0),
        strong: num(obj(pig.traits).strong, 0),
      },
      courses: obj(pig.courses),
      // Souvenirs are objects now (rarity + story). An old host sent bare
      // strings, and those must still list rather than turn into [object
      // Object] or vanish.
      souvenirs: arr(pig.souvenirs).map(entry => {
        if (typeof entry === 'string') {
          return { key: entry, emoji: '🎁', label: entry, rarityLabel: '普通', rarityEmoji: '⚪', price: 0, story: '', fromLabel: '' }
        }
        return {
          key: str(obj(entry).key, ''),
          emoji: str(obj(entry).emoji, '🎁'),
          label: str(obj(entry).label, '纪念品'),
          rarityLabel: str(obj(entry).rarityLabel, '普通'),
          rarityEmoji: str(obj(entry).rarityEmoji, '⚪'),
          price: num(obj(entry).price, 0),
          story: str(obj(entry).story, ''),
          fromLabel: str(obj(entry).fromLabel, ''),
        }
      }).filter(entry => entry.key !== ''),
      memories: arr(pig.memories).filter(m => typeof m === 'string'),
    },
    actions: normalizeActions(d.actions),
    jobs: arr(d.jobs).map(job => ({
      key: str(obj(job).key, ''),
      label: str(obj(job).label, '工作'),
      emoji: str(obj(job).emoji, '💼'),
      minutes: num(obj(job).minutes, 0),
      coins: num(obj(job).coins, 0),
      available: obj(job).available === true,
      // What schooling has bought this job.
      traitLabel: str(obj(job).traitLabel, ''),
      traitEmoji: str(obj(job).traitEmoji, ''),
      traitPoints: num(obj(job).traitPoints, 0),
      baseMinutes: num(obj(job).baseMinutes, 0),
      baseCoins: num(obj(job).baseCoins, 0),
      payPercent: num(obj(job).payPercent, 0),
      speedPercent: num(obj(job).speedPercent, 0),
      // An old host has no gate at all, so a missing flag must read as
      // "qualified" — the opposite default would lock every job on upgrade.
      qualified: obj(job).qualified !== false,
      lockText: str(obj(job).lockText, ''),
      level: num(obj(job).level, 1),
    })).filter(job => job.key !== ''),
    // B4: nine subjects, each with its own lesson count and stage.
    subjects: arr(d.subjects).map(sub => ({
      key: str(obj(sub).key, ''),
      label: str(obj(sub).label, '课'),
      emoji: str(obj(sub).emoji, '📘'),
      traitLabel: str(obj(sub).traitLabel, ''),
      traitEmoji: str(obj(sub).traitEmoji, ''),
      lessons: num(obj(sub).lessons, num(obj(sub).level, 0)),
      stageKey: str(obj(obj(sub).stage).key, ''),
      stageLabel: str(obj(obj(sub).stage).label, ''),
      graduatedLabel: isObj(obj(sub).graduated) ? str(obj(sub).graduated.label, '') : '',
      nextGraduation: typeof obj(sub).nextGraduation === 'number' ? obj(sub).nextGraduation : null,
      minutes: num(obj(sub).minutes, 0),
      tuition: num(obj(sub).tuition, 0),
      gain: num(obj(sub).gain, 0),
      secondaryGain: num(obj(sub).secondaryGain, 0),
      available: obj(sub).available === true,
      affordable: obj(sub).affordable !== false,
    })).filter(sub => sub.key !== ''),
    // 兴趣课：学习页里随时能学的一栏，学完加的是既有的三条属性。
    interests: arr(d.interests).map(entry => ({
      key: str(obj(entry).key, ''),
      label: str(obj(entry).label, '兴趣'),
      emoji: str(obj(entry).emoji, '🎯'),
      traitLabel: str(obj(entry).traitLabel, ''),
      traitEmoji: str(obj(entry).traitEmoji, ''),
      minutes: num(obj(entry).minutes, 0),
      cost: num(obj(entry).cost, 0),
      gain: num(obj(entry).gain, 0),
      blurb: str(obj(entry).blurb, ''),
      times: num(obj(entry).times, 0),
      certificate: str(obj(entry).certificate, ''),
      certificateAfter: num(obj(entry).certificateAfter, 0),
      certified: obj(entry).certified === true,
      available: obj(entry).available === true,
      affordable: obj(entry).affordable === true,
    })).filter(entry => entry.key !== ''),
    stages: arr(d.stages).map(stage => ({
      key: str(obj(stage).key, ''),
      label: str(obj(stage).label, '学段'),
      emoji: str(obj(stage).emoji, '📚'),
      minutes: num(obj(stage).minutes, 0),
      tuition: num(obj(stage).tuition, 0),
      gain: num(obj(stage).gain, 0),
      // B4: the lesson numbers this stage covers (upTo null = no end).
      from: num(obj(stage).from, 0),
      upTo: typeof obj(stage).upTo === 'number' ? obj(stage).upTo : null,
      // Which courses this stage teaches — empty on an old host, in which
      // case the panel shows every subject rather than none.
      subjects: arr(obj(stage).subjects).filter(key => typeof key === 'string'),
      // The school ladder: a stage with `unlocked === false` is gated behind
      // finishing the previous one, and says by how much.
      unlocked: obj(stage).unlocked !== false,
      progress: isObj(obj(stage).progress) ? {
        done: num(obj(stage).progress.done, 0),
        need: num(obj(stage).progress.need, 0),
        label: str(obj(stage).progress.label, ''),
      } : null,
    })).filter(stage => stage.key !== ''),
    trips: arr(d.trips).map(trip => ({
      key: str(obj(trip).key, ''),
      label: str(obj(trip).label, '目的地'),
      emoji: str(obj(trip).emoji, '🧳'),
      minutes: num(obj(trip).minutes, 0),
      cost: num(obj(trip).cost, 0),
      happiness: num(obj(trip).happiness, 0),
      // What the destination can bring back — the far trips advertise it.
      souvenirCount: num(obj(trip).souvenirCount, 0),
      bestRarity: str(obj(trip).bestRarity, ''),
      bestRarityEmoji: str(obj(trip).bestRarityEmoji, ''),
      affordable: obj(trip).affordable === true,
      available: obj(trip).available === true,
    })).filter(trip => trip.key !== ''),
    // 家当: owned and worn, never counted. An old host sends none.
    dress: arr(d.dress).map(entry => ({
      key: str(obj(entry).key, ''),
      label: str(obj(entry).label, '装扮'),
      emoji: str(obj(entry).emoji, '👕'),
      price: num(obj(entry).price, 0),
      level: num(obj(entry).level, 1),
      slot: str(obj(entry).slot, ''),
      slotLabel: str(obj(entry).slotLabel, ''),
      blurb: str(obj(entry).blurb, ''),
      owned: obj(entry).owned === true,
      worn: obj(entry).worn === true,
      unlocked: obj(entry).unlocked !== false,
    })).filter(entry => entry.key !== ''),
    shop: arr(d.shop).map(item => ({
      key: str(obj(item).key, ''),
      label: str(obj(item).label, '物品'),
      emoji: str(obj(item).emoji, '📦'),
      price: num(obj(item).price, 0),
      kind: str(obj(item).kind, 'food'),
      tier: typeof obj(item).tier === 'number' ? obj(item).tier : null,
      // 家当 fields: a dress item is owned (not counted) or waits for a level.
      level: typeof obj(item).level === 'number' ? obj(item).level : null,
      owned: obj(item).owned === true,
      worn: obj(item).worn === true,
      unlocked: obj(item).unlocked !== false,
      blurb: str(obj(item).blurb, ''),
      affordable: obj(item).affordable === true,
      needed: obj(item).needed === true,
    })).filter(item => item.key !== ''),
    inventory: obj(d.inventory),
    // Which items each care action could spend right now.
    care: (() => {
      const out = {}
      const source = obj(d.care)
      for (const action of ['feed', 'bathe', 'play']) {
        out[action] = arr(source[action]).map(entry => ({
          key: str(obj(entry).key, ''),
          label: str(obj(entry).label, '物品'),
          emoji: str(obj(entry).emoji, '📦'),
          default: obj(entry).default === true,
          count: typeof obj(entry).count === 'number' ? obj(entry).count : null,
          satiety: num(obj(entry).satiety, 0),
          happiness: num(obj(entry).happiness, 0),
          cleanliness: num(obj(entry).cleanliness, 0),
        })).filter(entry => entry.key !== '')
      }
      return out
    })(),
    activity: isObj(d.activity) ? {
      kind: str(d.activity.kind, 'work'),
      key: str(d.activity.key, ''),
      label: str(d.activity.label, '外面'),
      emoji: str(d.activity.emoji, '💼'),
      secondsLeft: num(d.activity.secondsLeft, 0),
      progress: num(d.activity.progress, 0),
    } : null,
    canGoOut: d.canGoOut === true,
    timeScale: num(d.timeScale, 1),
    boxStage: isObj(d.boxStage) ? {
      key: str(d.boxStage.key, 'box'),
      label: str(d.boxStage.label, '纸盒'),
      emoji: str(d.boxStage.emoji, '📦'),
      size: num(d.boxStage.size, 58),
    } : { key: 'box', label: '纸盒', emoji: '📦', size: 58 },
    awayBlocked: typeof d.awayBlocked === 'string' ? d.awayBlocked : null,
    pending: arr(d.pending).filter(e => isObj(e) && typeof e.at === 'number').map(e => ({
      id: num(e.id, 0),
      kind: str(e.kind, ''),
      text: str(e.text, ''),
      at: e.at,
      replies: arr(e.replies).filter(label => typeof label === 'string'),
    })),
    maxHealth: num(d.maxHealth, 5),
  }
}

export function normalizeActions(raw) {
  var source = obj(raw)
  var out = {}
  for (var i = 0; i < MODES.length; i += 1) {
    var key = MODES[i]
    var entry = obj(source[key])
    out[key] = {
      ready: entry.ready !== false,
      waitSeconds: num(entry.waitSeconds, 0),
      blocked: typeof entry.blocked === 'string' ? entry.blocked : null,
    }
  }
  return out
}
