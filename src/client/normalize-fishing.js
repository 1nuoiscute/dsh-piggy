// @ts-check
import { arr, isObj, num, obj, str } from './values.js'

function fish(value) {
  const entry = obj(value)
  return {
    id: str(entry.id, ''), key: str(entry.key, ''), label: str(entry.label, '鱼'), emoji: str(entry.emoji, '🐟'),
    rarity: str(entry.rarity, 'common'), behavior: str(entry.behavior, 'smooth'), difficulty: num(entry.difficulty, 1),
    sizeCm: num(entry.sizeCm, 0), price: num(entry.price, 0), phase: str(entry.phase, ''),
    castPower: num(entry.castPower, 0), bitesAt: num(entry.bitesAt, 0), hookUntil: num(entry.hookUntil, 0), expiresAt: num(entry.expiresAt, 0),
  }
}

export function normalizeFishing(raw) {
  const source = obj(raw)
  return {
    pending: isObj(source.pending) ? fish(source.pending) : null,
    bag: arr(source.bag).map(fish).filter(entry => entry.id !== ''),
    period: str(source.period, ''), autoTrips: num(source.autoTrips, 0), autoLeft: num(source.autoLeft, 2),
  }
}
