// @ts-check
/**
 * dsh-piggy — a pig that lives in your DeepSeek Harness.
 *
 * The plugin registers no model-facing tool and injects no context, so the
 * model never learns the pig exists and the pig costs zero tokens per request.
 * Every listener body is wrapped so a pig bug can never veto or delay real work.
 *
 * Two ways the human interacts, both ending in the same core calls:
 *   - the floating pig's six icons → POST /dsh-piggy/act
 *   - typing `/pig feed`           → the slash command
 * The GUI is the primary path; the command is the fallback.
 *
 * This file only wires things together: the store, the harness listeners, the
 * routes and the command. The shapes live in snapshot.js, the command in
 * commands.js, the HTTP surface in routes.js (see docs/CONVENTIONS.md).
 *
 * @module dsh-piggy
 */

import { dispatch, registerSlashCommand } from './commands.js'
import { registerRoutes } from './routes.js'
import { createStore, moveLegacySaveDir } from './store.js'

export const name = 'dsh-piggy'

/**
 * No required services. The pig rides on emit-mode events, and it reaches the
 * optional web seam through the safe `ctx.get()` accessor rather than a
 * declared injection — reading an undeclared service as a property throws in
 * cordis and would take the whole plugin down.
 */
export const inject = []

/** Wrap a listener so a pig bug can never veto or delay real harness work. */
const contained = fn => (...args) => {
  try { fn(...args) } catch { /* the pig absorbs its own mishaps */ }
}

/** The pig eats your real work: turns, tool calls and errors. */
function registerDietListeners(ctx, store) {
  ctx.on('agent/inbox/claimed', contained(() => store.feed('message')))
  ctx.on('agent/turn-stopping', contained(() => store.feed('turn')))
  ctx.on('agent/error', contained(() => store.feed('agentError')))
  ctx.on('tools/result', contained((exec, result) => {
    store.feed(result?.isError === true ? 'toolError' : 'tool')
  }))
}

export function apply(ctx, config = {}) {
  const commandName = typeof config.command === 'string' && /^[a-z][a-z0-9-]{0,23}$/.test(config.command)
    ? config.command
    : 'pig'
  const customPath = typeof config.statePath === 'string' && config.statePath.trim() !== ''
  // The default save moved from $DSH_HOME/dsh-pig/ to dsh-piggy/; bring an old one along.
  if (!customPath) moveLegacySaveDir()
  const store = createStore(customPath ? config.statePath : undefined)

  registerDietListeners(ctx, store)
  registerRoutes(ctx, store)
  registerSlashCommand(ctx, store, commandName)

  ctx.effect(() => () => store.dispose())
}

export { dispatch, performAction } from './commands.js'
export { snapshot } from './snapshot.js'
export { JOBS, MAX, SCHOOL_STAGES, SHOP, SUBJECTS, TRAITS, TRAIT_ORDER, TRIPS, jobByKey } from './data.js'
