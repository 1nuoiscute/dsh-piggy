// @ts-check
/**
 * dsh-pig · core —— 插件侧的入口，只做再导出。
 *
 * 领域模型本体在 packages/pet-core（`@dsh-piggy/core`），DSH 插件和以后的独立版
 * 共用同一份。这个文件留在根目录，是为了让 `../core.js` 这类既有导入一行都不用改。
 *
 * @module dsh-pig/core
 */

export * from './packages/pet-core/src/core.js'
