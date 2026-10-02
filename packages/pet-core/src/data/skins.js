// @ts-check

export const SKIN_SCENES = Object.freeze(['idle', 'eat', 'bathe', 'play', 'pet', 'relaxed', 'work', 'study', 'trip', 'fish'])
export const REQUIRED_SKIN_SCENES = Object.freeze(SKIN_SCENES.slice(0, 5))

export const SKINS = Object.freeze([
  Object.freeze({
    key: 'mint', label: '薄荷小猪', emoji: '🌿', art: 'skin-mint',
    author: 'dsh-piggy', description: '像一口薄荷汽水，清清凉凉。',
    scenes: Object.freeze(['idle', 'eat', 'bathe', 'play', 'pet']), custom: false,
  }),
])

export function skinByKey(key) {
  return SKINS.find(skin => skin.key === key) ?? null
}
