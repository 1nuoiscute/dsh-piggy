// @ts-check
/**
 * 客户端小格式化：天数、分钟数、物品类别名。
 *
 * 纯函数，输入输出都是字符串（见 docs/CONVENTIONS.md）。
 * @module dsh-piggy/client/format
 */

export function formatDays(days) {
  if (days >= 1) return Math.round(days) + ' 天'
  const hours = days * 24
  return hours >= 1 ? Math.round(hours) + ' 小时' : Math.max(1, Math.round(hours * 60)) + ' 分钟'
}

export function formatMinutes(minutes) {
  if (minutes < 60) return minutes + ' 分钟'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? hours + ' 小时' : hours + ' 小时' + rest + ' 分'
}

export function kindLabel(item) {
  if (item.kind === 'medicine') return item.needed ? '对症！' : '药'
  if (item.kind === 'revive') return '复活用'
  if (item.kind === 'bath') return '洗浴'
  return '食物'
}
