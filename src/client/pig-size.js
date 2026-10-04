// @ts-check
/** Device-local display scale. It never changes the pig save or its stage. */
import { readStore, writeStore } from './storage.js'

export const PIG_SIZE_KEY = 'dsh-piggy:pig-size'
export const PIG_SIZES = Object.freeze(['small', 'standard', 'large', 'extra'])
const SCALE = Object.freeze({ small: .85, standard: 1, large: 1.3, extra: 1.7 })
const OLD_SIZE_TIER = Object.freeze({ 48: 'small', 56: 'standard', 72: 'large', 96: 'extra' })

export function pigSize() {
  const saved = readStore(PIG_SIZE_KEY)
  if (PIG_SIZES.includes(saved)) return saved
  const tier = OLD_SIZE_TIER[saved] ?? 'standard'
  if (saved !== null) writeStore(PIG_SIZE_KEY, tier)
  return tier
}

export function setPigSize(value) {
  writeStore(PIG_SIZE_KEY, PIG_SIZES.includes(value) ? value : 'standard')
}

/** Keep the life-stage size intact at the standard setting. */
export function displayedPigSize(stageSize) {
  return stageSize * SCALE[pigSize()]
}
