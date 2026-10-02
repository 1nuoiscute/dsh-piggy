// @ts-check
import { arr, obj, str } from './values.js'

export function normalizeSkins(raw) {
  const source = obj(raw)
  return {
    current: str(source.current, 'default'),
    entries: arr(source.entries).map(function (value) {
      const entry = obj(value)
      return {
        key: str(entry.key, ''), label: str(entry.label, '皮肤'), emoji: str(entry.emoji, '🎨'), art: str(entry.art, ''),
        author: str(entry.author, ''), description: str(entry.description, ''), custom: entry.custom === true,
        current: entry.current === true, unlocked: entry.unlocked !== false,
        unlockJob: str(entry.unlockJob, ''), scenes: arr(entry.scenes).filter(scene => typeof scene === 'string'),
      }
    }).filter(entry => entry.key !== ''),
  }
}
