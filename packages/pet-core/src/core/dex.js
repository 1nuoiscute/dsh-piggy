// @ts-check
/** 图鉴的持久记录与面板视图。新增字段按需补齐，不升级存档版本。 */

import { ALL_SOUVENIRS, FORMS, SHOP } from '../data.js'

export const DEX_SECTIONS = Object.freeze(['forms', 'skins', 'fish', 'items', 'souvenirs'])

export function emptyDex() {
  return { forms: {}, skins: {}, fish: {}, items: {}, souvenirs: {} }
}

function cleanRecord(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const firstAt = Number.isFinite(value.firstAt) ? value.firstAt : null
  const count = Number.isFinite(value.count) ? Math.max(1, Math.floor(value.count)) : 0
  return firstAt === null || count === 0 ? null : { firstAt, count }
}

/** Fill/sanitize the collection in place and seed things an old save already owns. */
export function ensureDex(state, nowMs = 0) {
  const source = typeof state.dex === 'object' && state.dex !== null ? state.dex : {}
  const dex = emptyDex()
  for (const section of DEX_SECTIONS) {
    const records = typeof source[section] === 'object' && source[section] !== null ? source[section] : {}
    for (const [key, value] of Object.entries(records)) {
      const record = cleanRecord(value)
      if (record !== null) dex[section][key] = record
    }
  }
  state.dex = dex

  if (typeof state.form === 'string' && state.form !== '' && dex.forms[state.form] === undefined) {
    dex.forms[state.form] = { firstAt: nowMs, count: 1 }
  }
  for (const [key, count] of Object.entries(state.inventory ?? {})) {
    if (Number.isFinite(count) && count > 0 && dex.items[key] === undefined) {
      dex.items[key] = { firstAt: nowMs, count: Math.floor(count) }
    }
  }
  for (const key of state.dress ?? []) {
    if (dex.items[key] === undefined) dex.items[key] = { firstAt: nowMs, count: 1 }
  }
  const ownedSouvenirs = new Map()
  for (const entry of state.souvenirs ?? []) {
    if (typeof entry !== 'object' || entry === null || typeof entry.key !== 'string') continue
    const found = ownedSouvenirs.get(entry.key) ?? { firstAt: nowMs, count: 0 }
    if (Number.isFinite(entry.gotAt)) found.firstAt = Math.min(found.firstAt, entry.gotAt)
    found.count += 1
    ownedSouvenirs.set(entry.key, found)
  }
  for (const [key, record] of ownedSouvenirs) {
    if (dex.souvenirs[key] === undefined) dex.souvenirs[key] = record
  }
  return dex
}

/** Record one acquisition while retaining the first timestamp. */
export function recordDex(state, section, key, nowMs, count = 1) {
  if (!DEX_SECTIONS.includes(section) || typeof key !== 'string' || key === '' || count <= 0) return null
  const dex = ensureDex(state, nowMs)
  const before = dex[section][key]
  const record = before === undefined
    ? { firstAt: nowMs, count: Math.floor(count) }
    : { firstAt: before.firstAt, count: before.count + Math.floor(count) }
  dex[section][key] = record
  return record
}

const found = (dex, section, key) => dex[section][key] ?? null

const ITEM_KIND_LABEL = Object.freeze({
  food: '食物', bath: '洗浴', toy: '玩具', medicine: '药品', revive: '复活', promotion: '晋升', dress: '装扮',
})

/** Build the complete locked/unlocked catalogue sent to the client. */
export function dexView(state, formView, nowMs = 0) {
  const dex = ensureDex(state, nowMs)
  return {
    forms: FORMS.map(form => {
      const record = found(dex, 'forms', form.key)
      const progress = formView?.forms?.find(entry => entry.key === form.key)
      const item = SHOP.find(entry => entry.key === form.item)
      return {
        key: form.key, label: form.label, emoji: form.emoji, art: form.art,
        acquired: record !== null, firstAt: record?.firstAt ?? null, count: record?.count ?? 0,
        description: form.line,
        hint: form.hint,
        condition: `使用${item?.label ?? '晋升道具'}完成${item?.useLabel ?? '变身'}`,
        requirements: progress?.requirements ?? [],
      }
    }),
    skins: [],
    fish: [],
    items: SHOP.map(item => {
      const record = found(dex, 'items', item.key)
      const gate = item.kind === 'dress' && (item.level ?? 1) > 1 ? ` · Lv.${item.level}` : ''
      return {
        key: item.key, label: item.label, emoji: item.emoji,
        kind: item.kind, kindLabel: ITEM_KIND_LABEL[item.kind] ?? '其他',
        acquired: record !== null, firstAt: record?.firstAt ?? null, count: record?.count ?? 0,
        description: item.blurb ?? '一件陪伴日常生活的小东西。',
        hint: '有些相遇藏在货架、礼物，或一次意外收获里。',
        condition: `商店购买 · ${item.price} 金币${gate}`,
      }
    }),
    souvenirs: ALL_SOUVENIRS.map(item => {
      const record = found(dex, 'souvenirs', item.key)
      return {
        key: item.key, label: item.label, emoji: item.emoji,
        acquired: record !== null, firstAt: record?.firstAt ?? null, count: record?.count ?? 0,
        description: item.story ?? '从远方带回来的记忆。',
        hint: '离开熟悉的屋檐走远一些，风会把答案带回来。',
        condition: `旅行到${item.fromLabel}获得`,
      }
    }),
  }
}
