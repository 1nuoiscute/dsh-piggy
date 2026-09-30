// @ts-check
/**
 * 旅行与纪念品 —— 静态数值表（零逻辑、零 IO，见 docs/CONVENTIONS.md）。
 * @module dsh-pig/data/travel
 */

import { MINUTES } from './minutes.js'

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
  Object.freeze({ key: 'suburb', label: '郊游', emoji: '🧺', minutes: MINUTES.hour, cost: 60, happiness: 10, satiety: -8, souvenirs: Object.freeze([
    souvenir('clover', '🍀', '四叶草', 'common', '在草堆里翻到一片四叶草，据说会带来好运。'),
    souvenir('pinecone', '🌰', '松果', 'common', '捡了一颗松果，捏起来有点扎手。'),
    souvenir('wildflower', '🌼', '野花', 'rare', '摘了一朵小野花，一路上都小心护着。'),
  ]) }),
  Object.freeze({ key: 'mountain', label: '名山大川', emoji: '🏔', minutes: MINUTES.threeHours, cost: 200, happiness: 16, satiety: -20, souvenirs: Object.freeze([
    souvenir('cloudsea', '☁️', '云海照片', 'common', '爬到半山腰回头看，云在脚底下走。'),
    souvenir('stone', '🪨', '山石', 'common', '从山涧里捡了块石头，摸起来凉凉的。'),
    souvenir('bamboo', '🎍', '竹杖', 'rare', '在竹林里挑了根直溜的竹子当拐杖，拄着它上了山顶。'),
    souvenir('echo', '🏔', '山谷回声', 'legend', '在山顶冲着对面喊了一嗓子，山谷把你的名字还了回来。'),
  ]) }),
  Object.freeze({ key: 'hotspring', label: '泡温泉', emoji: '♨️', minutes: MINUTES.sixHours, cost: 380, happiness: 20, satiety: -28, souvenirs: Object.freeze([
    souvenir('towelmint', '🧺', '温泉毛巾', 'common', '印着当地小图案的毛巾，闻起来有硫磺味。'),
    souvenir('springegg', '🥚', '温泉蛋', 'common', '在池边煮的蛋，蛋黄是半凝固的。'),
    souvenir('omamori', '🧿', '平安符', 'rare', '泡完汤求了个平安符，据说能防着点倒霉事。'),
  ]) }),
  Object.freeze({ key: 'sea', label: '看海', emoji: '🌊', minutes: MINUTES.eightHours, cost: 620, happiness: 24, satiety: -42, souvenirs: Object.freeze([
    souvenir('seasalt', '🧂', '海盐', 'common', '在礁石坑里刮了点海盐，咸得发苦。'),
    souvenir('starfish', '⭐', '海星', 'common', '退潮时捡到一只海星，看完就放回水里了。'),
    souvenir('shell', '🐚', '一枚海螺', 'rare', '在海边捡到一枚海螺，贴在耳朵上能听见浪声。'),
    souvenir('driftbottle', '🍾', '漂流瓶', 'legend', '瓶子里有张潮湿的纸条，写着「你好，陌生人」。'),
  ]) }),
  Object.freeze({ key: 'oldtown', label: '古镇', emoji: '🏮', minutes: MINUTES.halfDay, cost: 1100, happiness: 30, satiety: -50, souvenirs: Object.freeze([
    souvenir('woodcut', '🪵', '木刻', 'common', '巷口老师傅刻的小木牌，背面还有刀痕。'),
    souvenir('lantern', '🏮', '小灯笼', 'rare', '买了一盏纸灯笼，晚上提着一路走回客栈。'),
    souvenir('teapot', '🫖', '紫砂壶', 'legend', '在旧货摊上淘到的紫砂壶，壶底刻着一个看不清的年份。'),
  ]) }),
  Object.freeze({ key: 'abroad', label: '出国', emoji: '🌍', minutes: MINUTES.day, cost: 2000, happiness: 38, satiety: -80, souvenirs: Object.freeze([
    souvenir('foreigncoin', '🪙', '外国硬币', 'common', '找零收到一枚硬币，上面的字一个都不认识。'),
    souvenir('stamp', '📮', '异国邮票', 'rare', '在旧书摊上买了张盖过戳的邮票。'),
    souvenir('postcard', '💌', '手写明信片', 'rare', '给自己寄了一张明信片，上面写着「我很好，就是有点想你」。'),
    souvenir('snowglobe', '🔮', '水晶球', 'legend', '晃一晃，陌生的城市就会下雪。'),
  ]) }),
  Object.freeze({ key: 'aurora', label: '看极光', emoji: '🌌', minutes: MINUTES.day, cost: 3600, happiness: 44, satiety: -90, souvenirs: Object.freeze([
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

export const tripByKey = key => TRIPS.find(trip => trip.key === key) ?? null
