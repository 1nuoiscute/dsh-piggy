// @ts-check
/**
 * 疾病链与药 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 * @module dsh-pig/data/illness
 */

export const THRESHOLDS = Object.freeze({
  hungry: 25,
  dirty: 35,
  lonely: 35,
  sickSatiety: 25,
  sickCleanliness: 30,
})

export const SICK_RISK_MINUTES = 12

// ---------------------------------------------------------------------------
// Illness is measured in DAYS, not in minutes.
//
// Twenty-five minutes a stage meant a cold killed the pig inside two hours
// unless you were watching the whole time. A stage is now a day, so an
// untreated illness runs its four stages over four days — slow enough to notice,
// react and go shopping, fast enough to matter.
// ---------------------------------------------------------------------------

/**
 * How long each stage lasts, in hours, indexed by stage - 1.
 *
 * A cold comes on fast; pneumonia takes days to develop. Making every stage the
 * same length is what killed the pig in 100 minutes: four stages of 25 minutes.
 * Untreated, this ladder runs 1 + 1.5 + 2 + 3 days.
 */
export const ILLNESS_STAGE_HOURS = Object.freeze([24, 36, 48, 72])

export const ILLNESS_STAGE_MINUTES = ILLNESS_STAGE_HOURS[0] * 60

/** Milliseconds one stage lasts. */
export const illnessStageMs = stage => (ILLNESS_STAGE_HOURS[stage - 1] ?? 24) * 3_600_000

/**
 * Chance an untreated illness shakes itself off when a stage would otherwise
 * pass, by stage (index 0 = the first stage). A cold really can just go away;
 * the last stage never does — by then it needs medicine or it is fatal.
 */
export const SELF_HEAL_CHANCE = Object.freeze([0.25, 0.12, 0.05, 0])

/**
 * ---------------------------------------------------------------------------
 * Study feeds work.
 *
 * Each job leans on one trait, and every lesson the pig sits through raises
 * that trait by one point. So 体育/武术/劳动 make 搬砖 pay better and go
 * faster, 语文/数学/政治 do the same for 上班, and 美术/音乐/礼仪 for 打零工.
 * Going to school is no longer a side activity — it is how the pig gets a
 * better job.
 * ---------------------------------------------------------------------------
 */

/** A sick pig works at half speed, so being ill has a cost without being a wall. */
export const SICK_PAY_MULTIPLIER = 0.5

/**
 * Being out and about while ill runs the clock faster: a day of work counts as
 * two days of illness. Resting at home is the cheap option.
 */
export const SICK_AWAY_MULTIPLIER = 2

export const SLEEPY_AFTER_MINUTES = 30

/** Away from home the pig burns through its bars faster. */
export const AWAY_MULTIPLIER = 1.8

// ---------------------------------------------------------------------------
// Life — the pig is measured in days, not in points.
//
// QQ Pet's pets hatch, grow up and eventually die; there is no "level 40" to
// grind toward. This ladder is that idea with the numbers the pig can actually
// be observed at: a box arrives, something small falls out of it, and then it
// simply gets older. XP still accumulates from your real work, but it feeds the
// pig's *weight* — a fatter pig, not a higher one.
//
// Age is wall-clock time since `bornAt`, so a pig left alone still grows up.
// ---------------------------------------------------------------------------

/** Where the stages change over, in days since birth. */
/**
 * ---------------------------------------------------------------------------
 * A pig's life, in real time
 *
 * 1 month as a piglet, 2 as a young pig, 3 fully grown, 2 elderly, then gone —
 * eight months end to end, if nothing kills it first. `TIME_SCALE` below can
 * compress that, because eight months is a long time to wait for the ending.
 * ---------------------------------------------------------------------------
 */

const CHAIN = (name, stages) => Object.freeze({ name, stages: Object.freeze(stages) })

export const ILLNESS_CHAINS = Object.freeze([
  CHAIN('感冒', [
    { name: '感冒', cure: '板蓝根' },
    { name: '发烧', cure: '退烧药' },
    { name: '重感冒', cure: '银翘丸' },
    { name: '肺炎', cure: '金色消炎药水' },
  ]),
  CHAIN('咳嗽', [
    { name: '咳嗽', cure: '枇杷糖浆' },
    { name: '支气管炎', cure: '甘草剂' },
    { name: '哮喘', cure: '定喘丸' },
    { name: '肺结核', cure: '通风散' },
  ]),
  CHAIN('肚子胀', [
    { name: '肚子胀', cure: '消食片' },
    { name: '胃炎', cure: '蓝色消炎药水' },
    { name: '胃溃疡', cure: '龙胆草' },
    { name: '胃癌', cure: '仙人汤' },
  ]),
])

/** Health left at each illness stage index (0-based): 4, 3, 2, 1. */
export const STAGE_HEALTH = Object.freeze([4, 3, 2, 1])

export const REVIVE_ITEM = Object.freeze({ key: 'soul', label: '还魂丹', emoji: '✨', price: 150, kind: 'revive' })

// ---------------------------------------------------------------------------
// Work — the pig leaves the desk and earns coins. A shift is a real shift.
// ---------------------------------------------------------------------------

export function illnessAt(chainIndex, stage) {
  const chain = ILLNESS_CHAINS[chainIndex]
  if (chain === undefined) return null
  const entry = chain.stages[stage - 1]
  if (entry === undefined) return null
  return { chain: chain.name, stage, name: entry.name, cure: entry.cure, health: STAGE_HEALTH[stage - 1] }
}

export const nextIllness = (chainIndex, stage) => illnessAt(chainIndex, stage + 1)
