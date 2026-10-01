// @ts-check
/**
 * 样式入口：基础样式 + 页签样式拼成一张表。
 *
 * @module dsh-pig/client/styles
 */
import { CSS_BASE } from './css-base.js'
import { CSS_TABS } from './css-tabs.js'
import { CSS_TILES } from './css-tiles.js'

/** The whole stylesheet, in the order it must be applied. */
export const CSS = CSS_BASE + CSS_TABS + CSS_TILES
