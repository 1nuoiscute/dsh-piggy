// @ts-check
/**
 * 防御性读取：把任何宿主载荷映射成确定的形状。
 *
 * @module dsh-pig/client/values
 */
export var isObj = v => typeof v === 'object' && v !== null && !Array.isArray(v)
export var obj = v => (isObj(v) ? v : {})
export var arr = v => (Array.isArray(v) ? v : [])
export var num = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : dflt)
export var str = (v, dflt) => (typeof v === 'string' && v !== '' ? v : dflt)
