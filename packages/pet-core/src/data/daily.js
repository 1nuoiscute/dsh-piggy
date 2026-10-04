// @ts-check
/**
 * 日常玩法：签到 7 天、在线礼包、宠物日记的数值与文案。
 *
 * 数值以 docs/tasks/numbers/B5-daily.md（用户 2026-10-01 确认）为准 —— 不要随手改，
 * 觉得不合理就写进任务卡等人拍板。零逻辑、零 IO（见 docs/CONVENTIONS.md）。
 *
 * @module dsh-piggy/data/daily
 */

/**
 * 一签的奖励：金币和/或物品。物品按 `key` 进背包，key 对不上货架也照发
 * （B3 的药可能还没上架）。
 * @typedef {object} DailyReward
 * @property {number} coins
 * @property {ReadonlyArray<{ key: string, count: number }>} items
 */

/** @param {number} coins @param {Array<[string, number]>} [items] @returns {DailyReward} */
const reward = (coins, items = []) => Object.freeze({ coins, items: Object.freeze(items.map(([key, count]) => Object.freeze({ key, count }))) })
/**
 * 7 天签到礼包（G1，用户 2026-10-05 确认，见 docs/tasks/numbers/G1-signin-7.md），价值由低到高，
 * 第 7 天大礼含还魂丹。领完第 7 天回到第 1 天；断签不清零。
 * @type {ReadonlyArray<DailyReward>}
 */
export const SIGN_IN_REWARDS = Object.freeze([
  reward(0, [['apple', 3], ['soap', 2]]),
  reward(100),
  reward(0, [['rice', 2], ['plush', 1]]),
  reward(0, [['banlangen', 1], ['xiaoshipian', 1], ['pipa-syrup', 1], ['bubble', 2]]),
  reward(200, [['skewer', 2]]),
  reward(0, [['baicaodan', 1]]),
  reward(0, [['soul', 1], ['feast', 2]]),
])

export const SIGN_IN_CYCLE = SIGN_IN_REWARDS.length

/**
 * 在线礼包：只算真实时间，不受调试页的时间倍率影响。
 * 「在线」= 面板在轮询，两次轮询间隔不超过 `pollGapMaxMs`。
 */
export const ONLINE_GIFT = Object.freeze({
  /** 每在线满这么久给一个。 */
  perGiftMs: 60 * 60 * 1000,
  /** 每天最多几个（06:00 刷新）。 */
  perDay: 8,
  /** 没领的最多攒几个，攒满就不再给。 */
  unclaimedMax: 3,
  /** 两次轮询间隔超过这个值，中间那段不算在线。 */
  pollGapMaxMs: 30 * 1000,
})

/**
 * 礼包内容概率表：每个礼包从下表抽一项。
 * `kind` + `maxPrice` 从货架上现取（B3/B4 上架新物品后自动进池子），
 * `keys` 是点名要的固定几样。
 * @type {ReadonlyArray<{ chance: number, kind?: string, kinds?: ReadonlyArray<string>, maxPrice?: number,
 *   coins?: ReadonlyArray<number>, keys?: ReadonlyArray<string> }>}
 */
export const GIFT_TABLE = Object.freeze([
  Object.freeze({ chance: 0.40, kind: 'food', maxPrice: 40 }),
  Object.freeze({ chance: 0.25, kinds: Object.freeze(['bath', 'toy']), maxPrice: 60 }),
  Object.freeze({ chance: 0.20, coins: Object.freeze([30, 80]) }),
  Object.freeze({ chance: 0.10, kind: 'medicine', maxPrice: 30 }),
  Object.freeze({ chance: 0.04, keys: Object.freeze(['feast', 'carousel', 'bubbles']) }),
  Object.freeze({ chance: 0.01, keys: Object.freeze(['baicaodan']) }),
])

/** 日记最多留几篇，更早的删掉。 */
export const DIARY_MAX = 60

/** 一天里最多数几句话（模板拼出来的日记不会比它长）。 */
export const DIARY_MAX_SENTENCES = 5

/**
 * 日记模板：按当天记下的东西挑句子拼，最多 `DIARY_MAX_SENTENCES` 句。
 *
 * `[主人]` 会换成主人称呼（和 data/lines.js 用同一个占位符）。顺序就是优先级：
 * 先说吃，最后说陪主人干活。句子里的数字来自当天的计数（见 DIARY_COUNT_LABELS）。
 * @type {ReadonlyArray<{ key: string, said: (counts: Record<string, number>) => string }>}
 */
export const DIARY_LINES = Object.freeze([
  Object.freeze({ key: 'feed', said: c => `今天吃了 ${c.feed} 顿，[主人]喂的，好饱。` }),
  Object.freeze({ key: 'bathe', said: c => `洗了 ${c.bathe} 次澡，身上香香的。` }),
  Object.freeze({ key: 'pet', said: c => `[主人]摸了我 ${c.pet} 次，我呼噜呼噜了一下午。` }),
  Object.freeze({ key: 'work', said: c => `出门打工 ${c.work} 趟${c.coinsEarned > 0 ? `，赚了 ${c.coinsEarned} 金币！` : '，累是累了点。'}` }),
  Object.freeze({ key: 'study', said: c => `上了 ${c.study} 节课，脑袋里又装进去一点东西。` }),
  Object.freeze({ key: 'graduate', said: c => `今天毕业啦，一共念完 ${c.graduate} 个学段！` }),
  Object.freeze({ key: 'trip', said: c => `出去旅行 ${c.trip} 次，带回来 ${c.souvenirs ?? 0} 件纪念品。` }),
  Object.freeze({ key: 'illness', said: () => '生病了，难受得不想动……' }),
  Object.freeze({ key: 'cure', said: c => `吃了 ${c.cure} 次药，终于好了。` }),
  Object.freeze({ key: 'wrongMedicine', said: () => '吃错药了，肚子更难受了。' }),
  Object.freeze({ key: 'levelUp', said: c => `升级 ${c.levelUp} 次，[主人]看见了吗？` }),
  Object.freeze({ key: 'stage', said: () => '今天长大了，样子变了一点点。' }),
  Object.freeze({ key: 'turn', said: c => `[主人]今天敲了 ${c.turn} 轮代码，我在旁边看着。` }),
  Object.freeze({ key: 'tool', said: c => `${c.tool} 个工具跑完了，我也跟着长了点。` }),
])

/** 什么都没发生的那一天。 */
export const DIARY_EMPTY_LINE = '今天[主人]没来，我睡了一整天。'
