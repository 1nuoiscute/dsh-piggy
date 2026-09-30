// @ts-check
/**
 * @dsh-piggy/core —— 宠物的纯领域模型与数值表。
 *
 * 零依赖、零 IO：不读文件、不发请求、不碰 DOM、不自己取时间或随机数。
 * 宿主（DSH 插件、以后的独立版）负责存档、时钟和界面，把 nowMs 等外部输入传进来。
 *
 * @module @dsh-piggy/core
 */

export * from './core.js'
export * from './data.js'
