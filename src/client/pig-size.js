// @ts-check
/** Device-local display scale. It never changes the pig save or its stage. */
import { readStore, writeStore } from './storage.js'

export const PIG_SIZE_KEY = 'dsh-piggy:pig-size'
export const PIG_SIZES = Object.freeze([48, 56, 72, 96])

export function pigSize() {
  const saved = Number(readStore(PIG_SIZE_KEY))
  return PIG_SIZES.includes(saved) ? saved : 56
}

export function setPigSize(value) {
  const size = Number(value)
  writeStore(PIG_SIZE_KEY, String(PIG_SIZES.includes(size) ? size : 56))
}
