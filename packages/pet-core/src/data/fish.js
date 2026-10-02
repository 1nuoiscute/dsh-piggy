// @ts-check
/** C5 fish catalogue. Times are local clock periods: early/noon/evening/night. */
export const FISH = Object.freeze([
  { key: 'fish_crucian', label: '鲫鱼', emoji: '🐟', rarity: 'common', times: ['early', 'noon', 'evening'], behavior: 'smooth', difficulty: 12, minCm: 12, maxCm: 32, price: 8 },
  { key: 'fish_carp', label: '鲤鱼', emoji: '🐟', rarity: 'common', times: ['noon', 'evening'], behavior: 'smooth', difficulty: 18, minCm: 20, maxCm: 55, price: 12 },
  { key: 'fish_sardine', label: '沙丁鱼', emoji: '🐟', rarity: 'common', times: ['early', 'noon'], behavior: 'dash', difficulty: 22, minCm: 10, maxCm: 26, price: 14 },
  { key: 'fish_anchovy', label: '鳀鱼', emoji: '🐟', rarity: 'common', times: ['early', 'evening'], behavior: 'dash', difficulty: 25, minCm: 8, maxCm: 22, price: 16 },
  { key: 'fish_perch', label: '河鲈', emoji: '🐠', rarity: 'common', times: ['noon', 'evening'], behavior: 'sink', difficulty: 28, minCm: 16, maxCm: 38, price: 18 },
  { key: 'fish_bream', label: '鳊鱼', emoji: '🐟', rarity: 'common', times: ['early', 'noon'], behavior: 'rise', difficulty: 30, minCm: 18, maxCm: 42, price: 20 },
  { key: 'fish_catfish', label: '鲶鱼', emoji: '🐡', rarity: 'common', times: ['evening', 'night'], behavior: 'sink', difficulty: 34, minCm: 24, maxCm: 68, price: 24 },
  { key: 'fish_mackerel', label: '青花鱼', emoji: '🐟', rarity: 'common', times: ['noon', 'evening'], behavior: 'mixed', difficulty: 38, minCm: 22, maxCm: 48, price: 28 },
  { key: 'fish_salmon', label: '鲑鱼', emoji: '🐟', rarity: 'uncommon', times: ['early', 'evening'], behavior: 'dash', difficulty: 48, minCm: 38, maxCm: 92, price: 48 },
  { key: 'fish_puffer', label: '河豚', emoji: '🐡', rarity: 'uncommon', times: ['noon'], behavior: 'mixed', difficulty: 55, minCm: 18, maxCm: 40, price: 62 },
  { key: 'fish_eel', label: '鳗鱼', emoji: '🐍', rarity: 'uncommon', times: ['evening', 'night'], behavior: 'rise', difficulty: 61, minCm: 42, maxCm: 110, price: 78 },
  { key: 'fish_tuna', label: '金枪鱼', emoji: '🐟', rarity: 'uncommon', times: ['early', 'noon'], behavior: 'dash', difficulty: 66, minCm: 70, maxCm: 180, price: 96 },
  { key: 'fish_sturgeon', label: '鲟鱼', emoji: '🐟', rarity: 'rare', times: ['night'], behavior: 'sink', difficulty: 78, minCm: 85, maxCm: 220, price: 160 },
  { key: 'fish_koi', label: '黄金锦鲤', emoji: '🎏', rarity: 'rare', times: ['early', 'evening'], behavior: 'mixed', difficulty: 86, minCm: 30, maxCm: 88, price: 220 },
  { key: 'fish_moon', label: '月影鱼', emoji: '🌙', rarity: 'legend', times: ['night'], behavior: 'mixed', difficulty: 100, minCm: 60, maxCm: 160, price: 300 },
])

export const fishByKey = key => FISH.find(fish => fish.key === key) ?? null
