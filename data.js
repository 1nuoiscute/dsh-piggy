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
  Object.freeze({ key: 'chinese', label: '语文', emoji: '📖', trait: 'intel' }),
  Object.freeze({ key: 'mathematics', label: '数学', emoji: '🔢', trait: 'intel' }),
  Object.freeze({ key: 'politics', label: '政治', emoji: '⚖️', trait: 'intel' }),
  Object.freeze({ key: 'art', label: '美术', emoji: '🎨', trait: 'charm' }),
  Object.freeze({ key: 'music', label: '音乐', emoji: '🎵', trait: 'charm' }),
  Object.freeze({ key: 'manner', label: '礼仪', emoji: '🎩', trait: 'charm' }),
  Object.freeze({ key: 'pe', label: '体育', emoji: '🏃', trait: 'strong' }),
  Object.freeze({ key: 'wushu', label: '武术', emoji: '🥋', trait: 'strong' }),
  Object.freeze({ key: 'labouring', label: '劳动', emoji: '🧺', trait: 'strong' }),
])

/** School stages, mirroring the xx- / dx- / yjs- asset prefixes. */
export const SCHOOL_STAGES = Object.freeze([
  Object.freeze({
    key: 'primary', label: '小学', minutes: MINUTES.half,
    tuition: 40, gain: 1, xp: 60, satiety: -8, happiness: -2, requires: null,
  }),
  Object.freeze({
    key: 'college', label: '大学', minutes: MINUTES.twoHours,
    tuition: 220, gain: 2, xp: 320, satiety: -20, happiness: -5,
    requires: Object.freeze({ stage: 'primary', lessons: 9, label: '小学九门课各上一次' }),
  }),
  Object.freeze({
    key: 'graduate', label: '研究生', minutes: MINUTES.sixHours,
    tuition: 900, gain: 4, xp: 1100, satiety: -45, happiness: -11,
    requires: Object.freeze({ stage: 'college', lessons: 9, label: '大学九门课各上一次' }),
  }),
])

// ---------------------------------------------------------------------------
// Travel — QQ Pet's `trip` option. The pig goes away and comes back with a
// souvenir for the collection.
// ---------------------------------------------------------------------------

export const TRIPS = Object.freeze([
  Object.freeze({ key: 'suburb', label: '郊游', emoji: '🏞', minutes: MINUTES.hour, cost: 60, happiness: 10, xp: 80, satiety: -8, souvenirs: Object.freeze(['四叶草', '松果', '野花']) }),
  Object.freeze({ key: 'mountain', label: '名山大川', emoji: '🏔', minutes: MINUTES.threeHours, cost: 200, happiness: 16, xp: 260, satiety: -20, souvenirs: Object.freeze(['云海照片', '山石', '竹杖']) }),
  Object.freeze({ key: 'sea', label: '看海', emoji: '🌊', minutes: MINUTES.eightHours, cost: 620, happiness: 24, xp: 700, satiety: -42, souvenirs: Object.freeze(['贝壳', '海盐', '漂流瓶']) }),
  Object.freeze({ key: 'abroad', label: '出国', emoji: '🌍', minutes: MINUTES.day, cost: 2000, happiness: 38, xp: 2000, satiety: -80, souvenirs: Object.freeze(['外国硬币', '异国邮票', '手写明信片']) }),
])

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
  // --- bath ---------------------------------------------------------------
  Object.freeze({ key: 'soap', label: '香皂', emoji: '🧼', price: 6, kind: 'bath', cleanliness: 35, happiness: 2 }),
  Object.freeze({ key: 'shower', label: '冲个澡', emoji: '🚿', price: 10, kind: 'bath', cleanliness: 50, happiness: 3 }),
  Object.freeze({ key: 'shampoo', label: '沐浴露', emoji: '🧴', price: 14, kind: 'bath', cleanliness: 65, happiness: 6 }),
  Object.freeze({ key: 'bubble', label: '泡泡浴', emoji: '🛁', price: 28, kind: 'bath', cleanliness: 100, happiness: 14 }),
  Object.freeze({ key: 'sauna', label: '泡温泉', emoji: '🧖', price: 58, kind: 'bath', cleanliness: 100, happiness: 24, satiety: -8 }),
  // --- toys ---------------------------------------------------------------
  Object.freeze({ key: 'yoyo', label: '悠悠球', emoji: '🪀', price: 30, kind: 'toy', happiness: 22, satiety: -4 }),
  Object.freeze({ key: 'blocks', label: '积木', emoji: '🎲', price: 45, kind: 'toy', happiness: 30, satiety: -5 }),
  Object.freeze({ key: 'plush', label: '布偶', emoji: '🧸', price: 75, kind: 'toy', happiness: 42, satiety: -7 }),
  Object.freeze({ key: 'scooter', label: '滑板车', emoji: '🛴', price: 120, kind: 'toy', happiness: 58, satiety: -10, cleanliness: -6 }),
  Object.freeze({ key: 'carousel', label: '旋转木马', emoji: '🎠', price: 260, kind: 'toy', happiness: 80, satiety: -12, cleanliness: -8 }),
  // --- medicine -----------------------------------------------------------
  Object.freeze({ key: 'med1', label: '普通药', emoji: '💊', price: 12, kind: 'medicine', tier: 1 }),
  Object.freeze({ key: 'med2', label: '特效药', emoji: '💊', price: 26, kind: 'medicine', tier: 2 }),
  Object.freeze({ key: 'med3', label: '进口药', emoji: '💉', price: 52, kind: 'medicine', tier: 3 }),
  Object.freeze({ key: 'med4', label: '秘方药', emoji: '🧪', price: 95, kind: 'medicine', tier: 4 }),
  // --- revive -------------------------------------------------------------
  REVIVE_ITEM,
])

/** Shop shelves, in the order the panel shows them. */
export const KIND_ORDER = Object.freeze(['food', 'bath', 'toy', 'medicine', 'revive'])

export const KIND_LABEL = Object.freeze({
  food: '食物',
  bath: '洗浴',
  toy: '玩具',
  medicine: '药品',
  revive: '复活',
})

/** Which care action spends which shelf. */
export const CARE_KIND = Object.freeze({ feed: 'food', bathe: 'bath', play: 'toy' })

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

/**
 * Whether `stage` is open yet, given how many lessons have been finished at
 * each earlier stage.
 * @param {{key: string, requires: {stage: string, lessons: number, label: string}|null}} stage
 * @param {Record<string, number>} lessonsByStage
 */
export function stageUnlocked(stage, lessonsByStage) {
  if (stage === null || stage === undefined) return false
  const need = stage.requires
  if (!need) return true
  return (lessonsByStage?.[need.stage] ?? 0) >= need.lessons
}

/** How far along the gate is, for the panel's progress hint. */
export function stageProgress(stage, lessonsByStage) {
  const need = stage.requires
  if (!need) return null
  const done = lessonsByStage?.[need.stage] ?? 0
  return { done, need: need.lessons, label: need.label, stage: need.stage }
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
