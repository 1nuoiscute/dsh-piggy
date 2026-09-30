/**
 * dsh-pig · data — the static game tables.
 *
 * Numbers and names only, no behaviour. The illness chains, thresholds, the
 * nine school subjects, the job/trip idea and the item categories are lifted
 * from QQ 宠物 (怀旧服 v1.2.4) as documented by xuemian168/qqpet_automation's
 * reverse engineering and the original asset tree:
 *
 *   img_res/study/  xx-* (小学) · dx-* (大学) · yjs-* (研究生)
 *                   art 美术 · chinese 语文 · labouring 劳动 · manner 礼仪 ·
 *                   mathematics 数学 · music 音乐 · pe 体育 · politics 政治 ·
 *                   wushu 武术
 *   img_res/work/   the job set
 *   img_res/food/   food art, one entry per dish
 *   img_res/commodity/  the sundries — bath things and toys
 *   models.py       ActiveOption { work, study, trip, ill, die }
 *                   PetInfo { growth, hunger, clean, health, mood, yb,
 *                             intel 智力, charm 魅力, strong 武力 }
 *                   StoreInventory { food, commodity, medicine, background }
 *
 * The last one is the reason care costs an item: the original keeps **food**,
 * **commodity** and **medicine** as separate inventory categories, and its own
 * heal path is "find the matching medicine in the bag → use it → recover".
 * Feeding, bathing and playing work the same way here.
 *
 * Attribute scale: QQ Pet counts in the thousands and its hunger ceiling grows
 * with level (3000 + 100 × min(level, 30)); this pig draws 0-100 bars instead,
 * with the QQ Pet thresholds rescaled:
 *   hunger 720/3100 ≈ 23%  → satiety < 25
 *   clean  1080/3100 ≈ 35% → cleanliness < 35
 *   mood   100/1000 = 10%  → happiness < 35 (a little kinder)
 *   health 5 → 5, unchanged — 0 is still death.
 *
 * @module dsh-pig/data
 */

/** Attribute ceilings. `health` keeps QQ Pet's 5-point scale. */
export const MAX = Object.freeze({ satiety: 100, happiness: 100, cleanliness: 100, health: 5 })

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

/** Extra pay per trait point, as a fraction. 15 points doubles the wage. */
export const TRAIT_PAY_PER_POINT = 1 / 15
/** ...but a pig that studied everything still only triples the wage, or the
 *  late game has no shape left. */
export const TRAIT_PAY_CAP = 3

/** Shorter shift per trait point, capped so a job never vanishes. */
export const TRAIT_SPEED_PER_POINT = 0.04
export const TRAIT_SPEED_CAP = 0.5

/** What one trait point buys on a given job. */
export function traitBonus(traitKey, points) {
  const n = Number.isFinite(points) ? Math.max(0, points) : 0
  return {
    pay: Math.min(TRAIT_PAY_CAP, 1 + n * TRAIT_PAY_PER_POINT),
    minutes: Math.max(1 - TRAIT_SPEED_CAP, 1 - n * TRAIT_SPEED_PER_POINT),
  }
}

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

/** One "pig month" — what the stage table below counts in. */
export const DAYS_PER_MONTH = 30

export const LIFE_STAGES = Object.freeze([
  Object.freeze({
    key: 'box', label: '纸盒', emoji: '📦', size: 58, from: 0, box: true,
    line: '一个纸盒，侧面戳了几个透气孔',
  }),
  Object.freeze({
    key: 'piglet', label: '小猪', emoji: '🐖', art: 'piglet', size: 54, from: 0,
    line: '刚从纸盒里蹦出来，圆头圆脑',
  }),
  Object.freeze({
    key: 'young', label: '青年猪', emoji: '🐖', size: 60, from: 1 * DAYS_PER_MONTH,
    line: '长开了，走路带风',
  }),
  Object.freeze({
    key: 'middle', label: '成年猪', emoji: '🐖', size: 68, from: 3 * DAYS_PER_MONTH,
    line: '很有分量，会一屁股坐住你的椅子',
  }),
  Object.freeze({
    key: 'elder', label: '老年猪', emoji: '🐖', art: 'elder', size: 62, from: 6 * DAYS_PER_MONTH,
    line: '鬃毛白了，獠牙还在',
  }),
])

/**
 * How long a full life lasts, in days. Eight months: 1 as a piglet, 2 young,
 * 3 grown, 2 elderly.
 */
export const LIFESPAN_DAYS = 8 * DAYS_PER_MONTH

/**
 * Time multiplier. 1 = the ages above are real months. Raise it to see a whole
 * life without waiting one.
 *
 * | 倍率 | 一生 | 小猪→青年 |
 * |---|---|---|
 * | 1 | 8 个月 | 1 个月 |
 * | 12 | 20 天 | 2.5 天 |
 * | 30 | 8 天 | 1 天 |
 */
export const DEFAULT_TIME_SCALE = 1

/** Presets offered in the panel, so the number is never typed. */
export const TIME_SCALES = Object.freeze([1, 12, 30, 60])

/** The tombstone and the soul that settles on an unclaimed one. */
export const GRAVE = Object.freeze({ key: 'grave', label: '墓碑', emoji: '🪦', size: 56, line: '这里躺着一只猪' })
export const SOUL = Object.freeze({ emoji: '👻', label: '灵魂' })
/** How long a grave is left alone before the soul turns up. */
export const SOUL_AFTER_DAYS = 1

// ---------------------------------------------------------------------------
// Level — the other axis
//
// Age is the body: it grows, then it goes. Level is the history: it never
// resets, not even when the pig dies, so adopting a new one is a continuation
// rather than a wipe. Unbounded on purpose — there is no "maxed out".
// ---------------------------------------------------------------------------

/** XP needed to *reach* a level. Quadratic, so each level costs a bit more. */
export const xpForLevel = level => (level <= 1 ? 0 : 20 * level * (level - 1))

/** Titles, earned by level. The last one that applies wins. */
export const LEVEL_TITLES = Object.freeze([
  Object.freeze({ level: 1, label: '新来的', emoji: '🌱' }),
  Object.freeze({ level: 5, label: '熟面孔', emoji: '🙂' }),
  Object.freeze({ level: 10, label: '老伙计', emoji: '🤝' }),
  Object.freeze({ level: 20, label: '镇宅之猪', emoji: '🏠' }),
  Object.freeze({ level: 35, label: '十里八乡有名', emoji: '📣' }),
  Object.freeze({ level: 50, label: '传说', emoji: '🌟' }),
  Object.freeze({ level: 80, label: '神话', emoji: '👑' }),
])

export const lifeStageByKey = key => LIFE_STAGES.find(stage => stage.key === key) ?? null

// ---------------------------------------------------------------------------
// Time — QQ Pet hands out timers measured in hours, not seconds. The desktop
// pet sits in a corner for a working day; the pig should too.
// ---------------------------------------------------------------------------

export const MINUTES = Object.freeze({
  quarter: 15,
  half: 30,
  hour: 60,
  ninety: 90,
  twoHours: 120,
  threeHours: 180,
  fourHours: 240,
  sixHours: 360,
  eightHours: 480,
  halfDay: 720,
  day: 1440,
})

// ---------------------------------------------------------------------------
// Illness — three chains of four stages, straight from the reverse engineering.
// ---------------------------------------------------------------------------

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

/**
 * Ten jobs, each behind a three-axis threshold.
 *
 * Before 0.17.0 there were three jobs and **no gate at all** — a pig with 智力 0
 * and a pig with 智力 40 could do exactly the same work, which made the whole
 * 学习 page pointless. `requires` is the fix: `intel` / `charm` / `strong` are
 * the minimum points the pig must already have. `trait` stays the *primary*
 * trait — the one that scales pay and shortens the shift — so a job can need
 * two axes while still paying off one.
 *
 * The ladder is ordered: odd jobs are ungated, then the physical line, then the
 * charm line, then the desk line that only schooling can open.
 */
export const JOBS = Object.freeze([
  // --- anyone can start here ----------------------------------------------
  Object.freeze({ key: 'odd', label: '打零工', emoji: '🧹', trait: 'charm', minutes: MINUTES.quarter, coins: 30, xp: 40, satiety: -6, cleanliness: -4, requires: Object.freeze({ intel: 0, charm: 0, strong: 0 }) }),
  // --- body line: 武力 -----------------------------------------------------
  Object.freeze({ key: 'dish', label: '端盘子', emoji: '🍽', trait: 'charm', minutes: MINUTES.half, coins: 70, xp: 90, satiety: -10, cleanliness: -7, requires: Object.freeze({ intel: 0, charm: 2, strong: 2 }) }),
  Object.freeze({ key: 'courier', label: '送快递', emoji: '🚚', trait: 'strong', minutes: MINUTES.hour, coins: 150, xp: 190, satiety: -15, cleanliness: -12, requires: Object.freeze({ intel: 0, charm: 0, strong: 4 }) }),
  Object.freeze({ key: 'site', label: '搬砖', emoji: '🧱', trait: 'strong', minutes: MINUTES.ninety, coins: 260, xp: 300, satiety: -20, cleanliness: -18, requires: Object.freeze({ intel: 0, charm: 0, strong: 8 }) }),
  Object.freeze({ key: 'foreman', label: '工地领班', emoji: '🏗', trait: 'strong', minutes: MINUTES.threeHours, coins: 700, xp: 800, satiety: -32, cleanliness: -24, requires: Object.freeze({ intel: 0, charm: 4, strong: 16 }) }),
  // --- charm line: 魅力 ----------------------------------------------------
  Object.freeze({ key: 'street', label: '街头卖艺', emoji: '🎤', trait: 'charm', minutes: MINUTES.hour, coins: 200, xp: 240, satiety: -12, cleanliness: -8, requires: Object.freeze({ intel: 0, charm: 8, strong: 0 }) }),
  // --- desk line: 智力（只有上学能开）-------------------------------------
  Object.freeze({ key: 'tutor', label: '家教', emoji: '📚', trait: 'intel', minutes: MINUTES.twoHours, coins: 480, xp: 560, satiety: -18, cleanliness: -10, requires: Object.freeze({ intel: 10, charm: 0, strong: 0 }) }),
  Object.freeze({ key: 'office', label: '上班', emoji: '💼', trait: 'intel', minutes: MINUTES.fourHours, coins: 900, xp: 900, satiety: -34, cleanliness: -26, requires: Object.freeze({ intel: 14, charm: 6, strong: 0 }) }),
  Object.freeze({ key: 'manager', label: '部门主管', emoji: '🏢', trait: 'intel', minutes: MINUTES.sixHours, coins: 2200, xp: 2100, satiety: -46, cleanliness: -34, requires: Object.freeze({ intel: 22, charm: 10, strong: 0 }) }),
  Object.freeze({ key: 'researcher', label: '研究员', emoji: '🔬', trait: 'intel', minutes: MINUTES.eightHours, coins: 4000, xp: 4200, satiety: -60, cleanliness: -40, requires: Object.freeze({ intel: 32, charm: 0, strong: 0 }) }),
])

/**
 * Compare a job's three-axis threshold against the pig's current traits.
 *
 * Returns every axis the pig is short on, not just the first: a locked job must
 * be able to say *why*, and "需要 🧠 智力 10、💪 武力 4" is the difference
 * between a gate and a shrug.
 *
 * @param {{requires?: {intel?: number, charm?: number, strong?: number}}|null} job
 * @param {Record<string, number>|null|undefined} traits
 * @returns {{ok: boolean, missing: ReadonlyArray<{key: string, label: string, emoji: string, need: number, have: number}>}|null}
 */
export function jobRequirement(job, traits) {
  if (job === null || job === undefined) return null
  const need = job.requires ?? {}
  const missing = []
  for (const key of TRAIT_ORDER) {
    const required = need[key] ?? 0
    const have = traits?.[key] ?? 0
    if (required > 0 && have < required) {
      missing.push({ key, label: TRAITS[key].label, emoji: TRAITS[key].emoji, need: required, have })
    }
  }
  return { ok: missing.length === 0, missing }
}

/** Whether the pig already meets every axis a job asks for. */
export const jobUnlocked = (job, traits) => jobRequirement(job, traits)?.ok === true

/**
 * 兴趣 — 学习页里「随时可以学」的一类课，不是第四条属性轴。
 *
 * 学一次直接把点数加进已有的 🧠 智力 / ✨ 魅力 / 💪 武力，重复学重复加。
 * 特意不做独立的技能等级、百分比或上限：那只是把三条属性又抄了一遍。
 */
export const INTERESTS = Object.freeze([
  Object.freeze({ key: 'photography', label: '摄影', emoji: '📷', trait: 'charm', minutes: MINUTES.half, cost: 40, gain: 2, xp: 60, blurb: '会拍照的猪，走到哪都上相' }),
  Object.freeze({ key: 'coding', label: '编程', emoji: '💻', trait: 'intel', minutes: MINUTES.hour, cost: 80, gain: 2, xp: 120, blurb: '学会让别的猪干活' }),
  Object.freeze({ key: 'dancing', label: '跳舞', emoji: '💃', trait: 'charm', minutes: MINUTES.half, cost: 45, gain: 2, xp: 70, blurb: '会跳舞的猪不怯场' }),
  Object.freeze({ key: 'fitness', label: '健身', emoji: '🏋', trait: 'strong', minutes: MINUTES.half, cost: 35, gain: 2, xp: 60, blurb: '举得动更重的东西' }),
])

export const interestByKey = key => INTERESTS.find(entry => entry.key === key) ?? null

// ---------------------------------------------------------------------------
// Study — the nine QQ Pet subjects, each tied to one of the three traits.
//
// The stages are a ladder, not a menu: QQ Pet starts every pet at 小学 and the
// higher stages sit behind it. `requires` is that gate — you must finish every
// subject once at the previous stage before the next one opens.
// ---------------------------------------------------------------------------

/** The three traits QQ Pet tracks alongside growth. */
export const TRAITS = Object.freeze({
  intel: Object.freeze({ key: 'intel', label: '智力', emoji: '🧠' }),
  charm: Object.freeze({ key: 'charm', label: '魅力', emoji: '✨' }),
  strong: Object.freeze({ key: 'strong', label: '武力', emoji: '💪' }),
})

export const TRAIT_ORDER = Object.freeze(['intel', 'charm', 'strong'])

/** Nine subjects, mirroring the img_res/study artwork. */
export const SUBJECTS = Object.freeze([
  // 🧸 幼儿园
  Object.freeze({ key: 'sing', label: '唱歌', emoji: '🎵', trait: 'charm' }),
  Object.freeze({ key: 'doodle', label: '涂鸦', emoji: '🖍', trait: 'charm' }),
  Object.freeze({ key: 'literacy', label: '认字', emoji: '🔤', trait: 'intel' }),
  // 🎨 课外（这四门同时是 0.19.0 的兴趣技能来源）
  Object.freeze({ key: 'football', label: '足球', emoji: '⚽', trait: 'strong' }),
  Object.freeze({ key: 'piano', label: '钢琴', emoji: '🎹', trait: 'charm' }),
  Object.freeze({ key: 'painting', label: '画画', emoji: '🎨', trait: 'charm' }),
  Object.freeze({ key: 'go', label: '围棋', emoji: '♟', trait: 'intel' }),
  // 📚 小学
  Object.freeze({ key: 'chinese', label: '语文', emoji: '📖', trait: 'intel' }),
  Object.freeze({ key: 'mathematics', label: '数学', emoji: '🔢', trait: 'intel' }),
  Object.freeze({ key: 'english', label: '英语', emoji: '🔤', trait: 'intel' }),
  Object.freeze({ key: 'science', label: '科学', emoji: '🔬', trait: 'intel' }),
  Object.freeze({ key: 'pe', label: '体育', emoji: '🏃', trait: 'strong' }),
  Object.freeze({ key: 'art', label: '美术', emoji: '🖌', trait: 'charm' }),
  // 🏫 中学
  Object.freeze({ key: 'history', label: '历史', emoji: '🏛', trait: 'intel' }),
  Object.freeze({ key: 'geography', label: '地理', emoji: '🌍', trait: 'intel' }),
  Object.freeze({ key: 'physics', label: '物理', emoji: '🧲', trait: 'intel' }),
  Object.freeze({ key: 'chemistry', label: '化学', emoji: '⚗️', trait: 'intel' }),
  // 🎓 高中
  Object.freeze({ key: 'biology', label: '生物', emoji: '🧬', trait: 'intel' }),
  Object.freeze({ key: 'politics', label: '政治', emoji: '⚖️', trait: 'charm' }),
  Object.freeze({ key: 'it', label: '信息技术', emoji: '💻', trait: 'intel' }),
  // 🏛 大学（研究生是同一批课的「深造」）
  Object.freeze({ key: 'philosophy', label: '哲学', emoji: '📜', trait: 'intel' }),
  Object.freeze({ key: 'economics', label: '经济', emoji: '💹', trait: 'intel' }),
  Object.freeze({ key: 'engineering', label: '工程', emoji: '⚙️', trait: 'strong' }),
])

/**
 * Seven school stages,幼儿园 → 研究生.
 *
 * Two things make this a ladder rather than a menu:
 *   1. `subjects` is the **complete** course list of that stage — the next
 *      stage opens only once every key in it has been studied at least once
 *      *at that stage* (`coursesByStage`).
 *   2. Higher stages re-teach lower subjects with a bigger `gain`, so the same
 *      语文 is worth 1 point in 小学 and 4 in 大学. That is what turns the
 *      ladder into real numbers instead of 46 one-off lessons.
 *
 * The 科目 counts follow the agreed table (3/4/6/7/8/9/9 = 46 lessons to the
 * top); higher stages keep the named new subjects and drop the ones that are no
 * longer taught, so the count always matches the list.
 */
export const SCHOOL_STAGES = Object.freeze([
  Object.freeze({
    key: 'preschool', label: '幼儿园', emoji: '🧸',
    subjects: Object.freeze(['sing', 'doodle', 'literacy']),
    minutes: MINUTES.quarter, tuition: 20, gain: 1, xp: 30, satiety: -4, happiness: -1,
    requires: null,
  }),
  Object.freeze({
    key: 'extracurricular', label: '课外', emoji: '🎨',
    subjects: Object.freeze(['football', 'piano', 'painting', 'go']),
    minutes: MINUTES.quarter + 5, tuition: 30, gain: 1, xp: 40, satiety: -5, happiness: -1,
    requires: Object.freeze({ stage: 'preschool', subjects: 3, label: '幼儿园 3 门课各上一次' }),
  }),
  Object.freeze({
    key: 'primary', label: '小学', emoji: '📚',
    subjects: Object.freeze(['chinese', 'mathematics', 'english', 'science', 'pe', 'art']),
    minutes: 40, tuition: 60, gain: 1, xp: 80, satiety: -8, happiness: -2,
    requires: Object.freeze({ stage: 'extracurricular', subjects: 4, label: '课外 4 门课各上一次' }),
  }),
  Object.freeze({
    key: 'middle', label: '中学', emoji: '🏫',
    subjects: Object.freeze(['chinese', 'mathematics', 'english', 'history', 'geography', 'physics', 'chemistry']),
    minutes: MINUTES.hour, tuition: 140, gain: 2, xp: 160, satiety: -12, happiness: -3,
    requires: Object.freeze({ stage: 'primary', subjects: 6, label: '小学 6 门课各上一次' }),
  }),
  Object.freeze({
    key: 'high', label: '高中', emoji: '🎓',
    subjects: Object.freeze(['chinese', 'mathematics', 'english', 'physics', 'chemistry', 'biology', 'politics', 'it']),
    minutes: MINUTES.twoHours, tuition: 300, gain: 3, xp: 320, satiety: -20, happiness: -5,
    requires: Object.freeze({ stage: 'middle', subjects: 7, label: '中学 7 门课各上一次' }),
  }),
  Object.freeze({
    key: 'college', label: '大学', emoji: '🏛',
    subjects: Object.freeze(['english', 'mathematics', 'physics', 'chemistry', 'biology', 'politics', 'philosophy', 'economics', 'engineering']),
    minutes: MINUTES.fourHours, tuition: 700, gain: 4, xp: 700, satiety: -34, happiness: -8,
    requires: Object.freeze({ stage: 'high', subjects: 8, label: '高中 8 门课各上一次' }),
  }),
  Object.freeze({
    key: 'graduate', label: '研究生', emoji: '🔬',
    // 深造：和大学同一批九门，重复上给更多属性。
    subjects: Object.freeze(['english', 'mathematics', 'physics', 'chemistry', 'biology', 'politics', 'philosophy', 'economics', 'engineering']),
    minutes: MINUTES.eightHours, tuition: 1600, gain: 6, xp: 1500, satiety: -50, happiness: -12,
    requires: Object.freeze({ stage: 'college', subjects: 9, label: '大学 9 门课各上一次' }),
  }),
])

// ---------------------------------------------------------------------------
// Travel — QQ Pet's `trip` option. The pig goes away and comes back with a
// souvenir for the collection.
// ---------------------------------------------------------------------------

/**
 * Rarity tiers for souvenirs: bragging rights, and a price tag.
 *
 * Deterministic — a souvenir's tier is a property of the souvenir, not a dice
 * roll, so the whole collection stays testable and "the far trips are worth
 * more" is a fact about the tables rather than a probability.
 */
export const SOUVENIR_RARITY = Object.freeze({
  common: Object.freeze({ key: 'common', label: '普通', emoji: '⚪', price: 60 }),
  rare: Object.freeze({ key: 'rare', label: '稀有', emoji: '🔵', price: 320 }),
  legend: Object.freeze({ key: 'legend', label: '传说', emoji: '🟡', price: 1600 }),
})

export const rarityByKey = key => SOUVENIR_RARITY[key] ?? SOUVENIR_RARITY.common

const souvenir = (key, emoji, label, rarity, story) => Object.freeze({ key, emoji, label, rarity, story })

export const TRIPS = Object.freeze([
  Object.freeze({ key: 'suburb', label: '郊游', emoji: '🏞', minutes: MINUTES.hour, cost: 60, happiness: 10, xp: 80, satiety: -8, souvenirs: Object.freeze([
    souvenir('clover', '🍀', '四叶草', 'common', '在草堆里翻到一片四叶草，据说会带来好运。'),
    souvenir('pinecone', '🌰', '松果', 'common', '捡了一颗松果，捏起来有点扎手。'),
    souvenir('wildflower', '🌼', '野花', 'rare', '摘了一朵小野花，一路上都小心护着。'),
  ]) }),
  Object.freeze({ key: 'mountain', label: '名山大川', emoji: '🏔', minutes: MINUTES.threeHours, cost: 200, happiness: 16, xp: 260, satiety: -20, souvenirs: Object.freeze([
    souvenir('cloudsea', '☁️', '云海照片', 'common', '爬到半山腰回头看，云在脚底下走。'),
    souvenir('stone', '🪨', '山石', 'common', '从山涧里捡了块石头，摸起来凉凉的。'),
    souvenir('bamboo', '🎍', '竹杖', 'rare', '在竹林里挑了根直溜的竹子当拐杖，拄着它上了山顶。'),
    souvenir('echo', '🏔', '山谷回声', 'legend', '在山顶冲着对面喊了一嗓子，山谷把你的名字还了回来。'),
  ]) }),
  Object.freeze({ key: 'hotspring', label: '泡温泉', emoji: '♨️', minutes: MINUTES.sixHours, cost: 380, happiness: 20, xp: 420, satiety: -28, souvenirs: Object.freeze([
    souvenir('towelmint', '🧺', '温泉毛巾', 'common', '印着当地小图案的毛巾，闻起来有硫磺味。'),
    souvenir('springegg', '🥚', '温泉蛋', 'common', '在池边煮的蛋，蛋黄是半凝固的。'),
    souvenir('omamori', '🧿', '平安符', 'rare', '泡完汤求了个平安符，据说能防着点倒霉事。'),
  ]) }),
  Object.freeze({ key: 'sea', label: '看海', emoji: '🌊', minutes: MINUTES.eightHours, cost: 620, happiness: 24, xp: 700, satiety: -42, souvenirs: Object.freeze([
    souvenir('seasalt', '🧂', '海盐', 'common', '在礁石坑里刮了点海盐，咸得发苦。'),
    souvenir('starfish', '⭐', '海星', 'common', '退潮时捡到一只海星，看完就放回水里了。'),
    souvenir('shell', '🐚', '一枚海螺', 'rare', '在海边捡到一枚海螺，贴在耳朵上能听见浪声。'),
    souvenir('driftbottle', '🍾', '漂流瓶', 'legend', '瓶子里有张潮湿的纸条，写着「你好，陌生人」。'),
  ]) }),
  Object.freeze({ key: 'oldtown', label: '古镇', emoji: '🏮', minutes: MINUTES.halfDay, cost: 1100, happiness: 30, xp: 1200, satiety: -50, souvenirs: Object.freeze([
    souvenir('woodcut', '🪵', '木刻', 'common', '巷口老师傅刻的小木牌，背面还有刀痕。'),
    souvenir('lantern', '🏮', '小灯笼', 'rare', '买了一盏纸灯笼，晚上提着一路走回客栈。'),
    souvenir('teapot', '🫖', '紫砂壶', 'legend', '在旧货摊上淘到的紫砂壶，壶底刻着一个看不清的年份。'),
  ]) }),
  Object.freeze({ key: 'abroad', label: '出国', emoji: '🌍', minutes: MINUTES.day, cost: 2000, happiness: 38, xp: 2000, satiety: -80, souvenirs: Object.freeze([
    souvenir('foreigncoin', '🪙', '外国硬币', 'common', '找零收到一枚硬币，上面的字一个都不认识。'),
    souvenir('stamp', '📮', '异国邮票', 'rare', '在旧书摊上买了张盖过戳的邮票。'),
    souvenir('postcard', '💌', '手写明信片', 'rare', '给自己寄了一张明信片，上面写着「我很好，就是有点想你」。'),
    souvenir('snowglobe', '🔮', '水晶球', 'legend', '晃一晃，陌生的城市就会下雪。'),
  ]) }),
  Object.freeze({ key: 'aurora', label: '看极光', emoji: '🌌', minutes: MINUTES.day, cost: 3600, happiness: 44, xp: 3000, satiety: -90, souvenirs: Object.freeze([
    souvenir('polestone', '⛰', '极地石', 'common', '从冻土上抠下来一块石头，冰得刺手。'),
    souvenir('compass', '🧭', '老罗盘', 'rare', '指针一直抖，最后还是能指回住的地方。'),
    souvenir('icecrystal', '❄️', '冰晶', 'rare', '接住了一片雪花，在掌心化成一小滴水。'),
    souvenir('auroraphoto', '🌌', '极光照片', 'legend', '守了三个晚上才等到的那一片绿光，快门按下去的时候手在抖。'),
  ]) }),
])

/** Every souvenir on the map, flattened — the collection is global. */
export const ALL_SOUVENIRS = Object.freeze(TRIPS.flatMap(trip => trip.souvenirs.map(entry => Object.freeze({ ...entry, from: trip.key, fromLabel: trip.label }))))

export const souvenirByKey = key => ALL_SOUVENIRS.find(entry => entry.key === key) ?? null

// ---------------------------------------------------------------------------
// Items — one shop, four shelves.
//
//   food      feeds the pig
//   bath      washes it
//   toy       plays with it
//   medicine  cures it (four tiers, one per illness stage)
//   revive    brings it back
//
// Buying is not the only way in: every pig owns one scruffy default toy for
// free, so `玩耍` always works even with an empty bag. That mirrors QQ Pet,
// where the pet can amuse itself without a bought plaything.
// ---------------------------------------------------------------------------

export const DEFAULT_TOY = Object.freeze({
  key: 'ball', label: '小皮球', emoji: '🎾', price: 0, kind: 'toy',
  happiness: 12, satiety: -3, default: true,
})

export const SHOP = Object.freeze([
  // --- food ---------------------------------------------------------------
  Object.freeze({ key: 'apple', label: '苹果', emoji: '🍎', price: 6, kind: 'food', satiety: 22, happiness: 3 }),
  Object.freeze({ key: 'bread', label: '面包', emoji: '🍞', price: 10, kind: 'food', satiety: 32, happiness: 4 }),
  Object.freeze({ key: 'bone', label: '肉骨头', emoji: '🍖', price: 15, kind: 'food', satiety: 45, happiness: 8, cleanliness: -4 }),
  Object.freeze({ key: 'rice', label: '蛋炒饭', emoji: '🍚', price: 24, kind: 'food', satiety: 58, happiness: 10 }),
  Object.freeze({ key: 'cake', label: '奶油蛋糕', emoji: '🎂', price: 40, kind: 'food', satiety: 80, happiness: 18, cleanliness: -8 }),
  Object.freeze({ key: 'noodle', label: '大碗拉面', emoji: '🍜', price: 66, kind: 'food', satiety: 100, happiness: 26, cleanliness: -6 }),
  Object.freeze({ key: 'fish', label: '小鱼干', emoji: '🐟', price: 12, kind: 'food', satiety: 30, happiness: 7 }),
  Object.freeze({ key: 'pumpkin', label: '南瓜粥', emoji: '🎃', price: 34, kind: 'food', satiety: 62, happiness: 13 }),
  Object.freeze({ key: 'skewer', label: '烤肉串', emoji: '🍢', price: 58, kind: 'food', satiety: 76, happiness: 21, cleanliness: -7 }),
  Object.freeze({ key: 'feast', label: '豪华大餐', emoji: '🍱', price: 130, kind: 'food', satiety: 100, happiness: 34, cleanliness: -10 }),
  // --- bath ---------------------------------------------------------------
  Object.freeze({ key: 'soap', label: '香皂', emoji: '🧼', price: 6, kind: 'bath', cleanliness: 35, happiness: 2 }),
  Object.freeze({ key: 'shower', label: '冲个澡', emoji: '🚿', price: 10, kind: 'bath', cleanliness: 50, happiness: 3 }),
  Object.freeze({ key: 'shampoo', label: '沐浴露', emoji: '🧴', price: 14, kind: 'bath', cleanliness: 65, happiness: 6 }),
  Object.freeze({ key: 'bubble', label: '泡泡浴', emoji: '🛁', price: 28, kind: 'bath', cleanliness: 100, happiness: 14 }),
  Object.freeze({ key: 'sauna', label: '泡温泉', emoji: '🧖', price: 58, kind: 'bath', cleanliness: 100, happiness: 24, satiety: -8 }),
  Object.freeze({ key: 'candle', label: '香薰', emoji: '🕯', price: 22, kind: 'bath', cleanliness: 58, happiness: 13 }),
  Object.freeze({ key: 'milkbath', label: '牛奶浴', emoji: '🥛', price: 44, kind: 'bath', cleanliness: 85, happiness: 19 }),
  Object.freeze({ key: 'deadsea', label: '死海泥', emoji: '🫧', price: 78, kind: 'bath', cleanliness: 100, happiness: 27, satiety: -6 }),
  // --- toys ---------------------------------------------------------------
  Object.freeze({ key: 'yoyo', label: '悠悠球', emoji: '🪀', price: 30, kind: 'toy', happiness: 22, satiety: -4 }),
  Object.freeze({ key: 'blocks', label: '积木', emoji: '🎲', price: 45, kind: 'toy', happiness: 30, satiety: -5 }),
  Object.freeze({ key: 'plush', label: '布偶', emoji: '🧸', price: 75, kind: 'toy', happiness: 42, satiety: -7 }),
  Object.freeze({ key: 'scooter', label: '滑板车', emoji: '🛴', price: 120, kind: 'toy', happiness: 58, satiety: -10, cleanliness: -6 }),
  Object.freeze({ key: 'carousel', label: '旋转木马', emoji: '🎠', price: 260, kind: 'toy', happiness: 80, satiety: -12, cleanliness: -8 }),
  Object.freeze({ key: 'balloon', label: '气球', emoji: '🎈', price: 22, kind: 'toy', happiness: 24, satiety: -3 }),
  Object.freeze({ key: 'puzzle', label: '拼图', emoji: '🧩', price: 60, kind: 'toy', happiness: 34, satiety: -5 }),
  Object.freeze({ key: 'kite', label: '风筝', emoji: '🪁', price: 95, kind: 'toy', happiness: 48, satiety: -7 }),
  Object.freeze({ key: 'rccar', label: '遥控车', emoji: '🏎', price: 180, kind: 'toy', happiness: 62, satiety: -9, cleanliness: -6 }),
  Object.freeze({ key: 'bubbles', label: '泡泡机', emoji: '🫧', price: 220, kind: 'toy', happiness: 74, satiety: -10, cleanliness: -8 }),
  // --- dress (家当) --------------------------------------------------------
  // Not consumables: buy once, own forever, wear them. Each one needs a level,
  // which is what ties 装扮 to the level axis instead of to the wallet.
  // `slot` is a fixed anchor on the pig (see DRESS_SLOTS); one item per slot,
  // so the artwork can be swapped in later without touching the logic.
  Object.freeze({ key: 'scarf', label: '红围巾', emoji: '🧣', price: 80, kind: 'dress', level: 1, slot: 'neck', blurb: '脖子上暖乎乎的' }),
  Object.freeze({ key: 'strawhat', label: '草帽', emoji: '👒', price: 150, kind: 'dress', level: 2, slot: 'head', blurb: '遮阳，也遮心虚' }),
  Object.freeze({ key: 'sunglasses', label: '墨镜', emoji: '🕶', price: 260, kind: 'dress', level: 3, slot: 'face', blurb: '谁也不知道它在想什么' }),
  Object.freeze({ key: 'overalls', label: '背带裤', emoji: '👖', price: 420, kind: 'dress', level: 4, slot: 'body', blurb: '干体力活穿的' }),
  Object.freeze({ key: 'bowtie', label: '领结', emoji: '🎀', price: 600, kind: 'dress', level: 5, slot: 'neck', blurb: '上班用' }),
  Object.freeze({ key: 'rainboots', label: '雨靴', emoji: '🥾', price: 900, kind: 'dress', level: 6, slot: 'feet', blurb: '踩水坑专用' }),
  Object.freeze({ key: 'cape', label: '披风', emoji: '🦸', price: 1300, kind: 'dress', level: 7, slot: 'back', blurb: '风一吹就飘起来' }),
  Object.freeze({ key: 'flowercrown', label: '花环', emoji: '💐', price: 1800, kind: 'dress', level: 8, slot: 'head', blurb: '春天做的' }),
  Object.freeze({ key: 'tophat', label: '礼帽', emoji: '🎩', price: 2600, kind: 'dress', level: 9, slot: 'head', blurb: '正式场合' }),
  Object.freeze({ key: 'necklace', label: '项链', emoji: '📿', price: 3600, kind: 'dress', level: 11, slot: 'neck', blurb: '据说是祖传的' }),
  Object.freeze({ key: 'crown', label: '王冠', emoji: '👑', price: 5200, kind: 'dress', level: 13, slot: 'head', blurb: '自己给自己加冕' }),
  Object.freeze({ key: 'wings', label: '翅膀', emoji: '🪽', price: 8000, kind: 'dress', level: 16, slot: 'back', blurb: '能不能飞，谁也没见它飞过' }),
  // --- medicine -----------------------------------------------------------
  Object.freeze({ key: 'med1', label: '普通药', emoji: '💊', price: 12, kind: 'medicine', tier: 1 }),
  Object.freeze({ key: 'med2', label: '特效药', emoji: '💊', price: 26, kind: 'medicine', tier: 2 }),
  Object.freeze({ key: 'med3', label: '进口药', emoji: '💉', price: 52, kind: 'medicine', tier: 3 }),
  Object.freeze({ key: 'med4', label: '秘方药', emoji: '🧪', price: 95, kind: 'medicine', tier: 4 }),
  // --- revive -------------------------------------------------------------
  REVIVE_ITEM,
])

/** Shop shelves, in the order the panel shows them. */
export const KIND_ORDER = Object.freeze(['food', 'bath', 'toy', 'dress', 'medicine', 'revive'])

export const KIND_LABEL = Object.freeze({
  food: '食物',
  bath: '洗浴',
  toy: '玩具',
  dress: '装扮',
  medicine: '药品',
  revive: '复活',
})

/** Which care action spends which shelf. */
export const CARE_KIND = Object.freeze({ feed: 'food', bathe: 'bath', play: 'toy' })

/**
 * 装扮点位 —— 猪身上固定的几个锚点。
 *
 * 每个点位同时只挂一件；以后换成真正的立绘时，只需要改 client.js 里
 * `.dp-slot[data-slot="…"]` 的偏移，逻辑和存档都不用动。
 */
export const DRESS_SLOTS = Object.freeze([
  Object.freeze({ key: 'head', label: '头' }),
  Object.freeze({ key: 'face', label: '脸' }),
  Object.freeze({ key: 'neck', label: '脖子' }),
  Object.freeze({ key: 'body', label: '身子' }),
  Object.freeze({ key: 'back', label: '背后' }),
  Object.freeze({ key: 'feet', label: '脚' }),
])

export const dressSlotByKey = key => DRESS_SLOTS.find(entry => entry.key === key) ?? null

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const jobByKey = key => JOBS.find(job => job.key === key) ?? null
export const itemByKey = key => SHOP.find(item => item.key === key) ?? null
export const subjectByKey = key => SUBJECTS.find(subject => subject.key === key) ?? null
export const schoolStageByKey = key => SCHOOL_STAGES.find(stage => stage.key === key) ?? null
export const tripByKey = key => TRIPS.find(trip => trip.key === key) ?? null

export const itemsOfKind = kind => SHOP.filter(item => item.kind === kind)

/** Every item a care action will accept: the shelf, plus the free default toy. */
export function careItems(kind) {
  const bought = itemsOfKind(kind)
  return kind === 'toy' ? [DEFAULT_TOY, ...bought] : bought
}

export const medicineForStage = stage => SHOP.find(item => item.kind === 'medicine' && item.tier === stage) ?? null

/** The stage a fresh pig may enrol in: the first one with no gate. */
export const FIRST_STAGE = SCHOOL_STAGES[0].key

/** The subject keys a stage teaches, in the order the panel lists them. */
export const stageSubjectKeys = stage => (stage?.subjects ?? [])

/** The subject records a stage teaches. */
export const stageSubjectList = stage =>
  stageSubjectKeys(stage).map(key => SUBJECTS.find(subject => subject.key === key)).filter(Boolean)

/**
 * Which subjects of `stage` the pig has already sat through at least once.
 * @param {{subjects?: readonly string[]}|null|undefined} stage
 * @param {Record<string, Record<string, number>>|null|undefined} coursesByStage
 */
const stageSubjectsDone = (stage, coursesByStage) =>
  stageSubjectKeys(stage).filter(key => (coursesByStage?.[stage.key]?.[key] ?? 0) >= 1).length

/**
 * Whether `stage` is open yet: every subject of the stage below it must have
 * been studied **at that stage**. A count is no longer enough — with seven
 * stages and shared subject names, "9 lessons somewhere" says nothing about
 * whether the pig actually attended 小学's six courses.
 *
 * @param {{key: string, requires: {stage: string, subjects: number, label: string}|null}} stage
 * @param {Record<string, Record<string, number>>} coursesByStage
 */
export function stageUnlocked(stage, coursesByStage) {
  if (stage === null || stage === undefined) return false
  if (!stage.requires) return true
  const previous = schoolStageByKey(stage.requires.stage)
  return previous !== null && stageSubjectsDone(previous, coursesByStage) >= stage.requires.subjects
}

/** How far along the gate is, for the panel's progress hint. */
export function stageProgress(stage, coursesByStage) {
  const need = stage?.requires
  if (!need) return null
  const previous = schoolStageByKey(need.stage)
  const done = previous === null ? 0 : stageSubjectsDone(previous, coursesByStage)
  return { done, need: need.subjects, label: need.label, stage: need.stage }
}

export function illnessAt(chainIndex, stage) {
  const chain = ILLNESS_CHAINS[chainIndex]
  if (chain === undefined) return null
  const entry = chain.stages[stage - 1]
  if (entry === undefined) return null
  return { chain: chain.name, stage, name: entry.name, cure: entry.cure, health: STAGE_HEALTH[stage - 1] }
}

export const nextIllness = (chainIndex, stage) => illnessAt(chainIndex, stage + 1)

/** Every course key a fresh pig has not studied yet. */
export const SUBJECT_KEYS = SUBJECTS.map(subject => subject.key)
