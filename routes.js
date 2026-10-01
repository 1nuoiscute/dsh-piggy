// @ts-check
/**
 * HTTP 路由：面板读的快照、面板发的动作，以及手绘精灵图。
 *
 * 路由只做分发与序列化，不算业务规则 —— 每个动作都转发给 store（见 docs/CONVENTIONS.md）。
 * @module dsh-piggy/routes
 */
import { readFileSync } from 'node:fs'

import { snapshot } from './snapshot.js'

const STATE_ROUTE = '/dsh-piggy/state'
const ACT_ROUTE = '/dsh-piggy/act'
const ART_ROUTE = '/dsh-piggy/art'
const BODY_LIMIT_BYTES = 2048

const str = value => (typeof value === 'string' ? value : '')

function sendJson(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extra })
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (text.length > BODY_LIMIT_BYTES) return null
  }
  if (text.trim() === '') return {}
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

/**
 * Every operation the panel can invoke. One table means the HTTP route and the
 * slash command cannot drift apart.
 */
const OPERATIONS = {
  hatch: store => ({ ok: true, hatched: store.hatch() }),
  adopt: store => ({ ok: store.adopt(), adopted: true }),
  reset: store => ({ ok: store.reset(), reset: true }),
  dev: (store, body) => ({ ok: store.dev(body.patch ?? {}), dev: true }),
  ageFromNow: store => ({ ok: store.ageFromNow(), ageFromNow: true }),
  timeScale: (store, body) => ({ ok: store.setTimeScale(body.scale), timeScale: true }),
  // The three care actions spend an item; `item` says which one.
  feed: (store, body) => store.act('feed', str(body.item)),
  bathe: (store, body) => store.act('bathe', str(body.item)),
  play: (store, body) => store.act('play', str(body.item)),
  pet: store => store.act('pet'),
  // Answer the pig's latest line: `line` is the message id, `index` the button.
  reply: (store, body) => store.reply(Number(body.line), Number(body.index)),
  // 日常：签到（在线礼包在 B5 的第二步接上）。
  signIn: store => store.signIn(),
  openGift: store => store.openGift(),
  // The panel's timers ask the pig to speak up; the pig decides whether to.
  chat: (store, body) => store.chat(str(body.reason)),
  quiet: (store, body) => store.setQuiet(body.on === true),
  owner: (store, body) => store.setOwnerName(str(body.name)),
  // 居民卡: the catchphrase and the motto.
  catchphrase: (store, body) => store.setCatchphrase(str(body.text)),
  motto: (store, body) => store.setMotto(str(body.text)),
  // 加冕: `form` picks which one (empty = the first).
  crown: (store, body) => store.crown(str(body.form)),
  // 改猪的名字（和斜杠命令 /pig name 同一条路）。
  name: (store, body) => ({ ok: Boolean(store.rename(str(body.name))), name: true }),
  work: (store, body) => store.startWork(str(body.job)),
  study: (store, body) => store.startStudy(str(body.subject), str(body.stage)),
  interest: (store, body) => store.startInterest(str(body.interest)),
  trip: (store, body) => store.startTrip(str(body.trip)),
  calloff: store => store.callOffActivity(),
  buy: (store, body) => store.buy(str(body.item)),
  use: (store, body) => store.useItem(str(body.item)),
  doctor: store => store.seeDoctor(),
  // Souvenirs are the only thing the pig can sell back.
  sell: (store, body) => store.sellSouvenir(str(body.souvenir)),
  // 家当: put a dress item on / take it off.
  wear: (store, body) => store.wear(str(body.item), body.on !== false),
  // Debug: one of everything.
  giveAll: store => store.grantAll(),
}

/** GET /dsh-piggy/state — the one shape the panel reads. */
function registerStateRoute(webServer, store) {
  return webServer.register({
    kind: 'exact',
    path: STATE_ROUTE,
    handler: async (req, res) => {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
      try {
        sendJson(res, 200, snapshot(store), { 'cache-control': 'no-store' })
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
}

/**
 * GET /dsh-piggy/art/<name>.svg — the hand-drawn sprites.
 *
 * Serving them from the package keeps the art as real .svg files in the
 * repository rather than a blob embedded in the client bundle.
 */
function registerArtRoute(webServer) {
  return webServer.register({
    kind: 'prefix',
    path: ART_ROUTE,
    handler: (req, res) => {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
      const raw = String(req.url ?? '').split('?')[0]
      const name = raw.startsWith(ART_ROUTE + '/') ? raw.slice(ART_ROUTE.length + 1) : ''
      // Only the files this package ships: a fixed, boring name pattern, so
      // nothing from the request can ever walk out of ./assets.
      if (!/^[a-z][a-z0-9-]{0,31}\.svg$/.test(name)) return sendJson(res, 404, { error: 'not found' })
      try {
        const svg = readFileSync(new URL('./assets/' + name, import.meta.url))
        res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-cache' })
        res.end(svg)
      } catch (error) {
        console.warn(`[dsh-piggy] sprite missing: name="${name}" reason="${error instanceof Error ? error.message : String(error)}"`)
        sendJson(res, 404, { error: 'not found' })
      }
    },
  })
}

/**
 * POST /dsh-piggy/act — one action from the panel.
 *
 * The operation's verdict must win over the snapshot's always-true `ok`:
 * spreading the snapshot last silently swallowed every refusal.
 */
function registerActRoute(webServer, store) {
  return webServer.register({
    kind: 'exact',
    path: ACT_ROUTE,
    handler: async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
      const body = await readJsonBody(req)
      if (body === null) return sendJson(res, 413, { error: 'body too large or not JSON' })
      const operation = typeof body.action === 'string' ? body.action : ''
      const run = Object.hasOwn(OPERATIONS, operation) ? OPERATIONS[operation] : null
      if (run === null) {
        return sendJson(res, 400, { error: `unknown action "${operation}"`, allowed: Object.keys(OPERATIONS) })
      }
      // A throwing operation must answer, not take the route down with it: an
      // unhandled error here would leave the panel polling a dead handler.
      try {
        const result = run(store, body)
        sendJson(res, 200, {
          ...snapshot(store),
          ok: result.ok !== false,
          reason: result.reason,
          wait: result.wait,
          price: result.price,
          missing: result.missing,
          sold: result.sold,
          need: result.need,
          have: result.have,
        }, { 'cache-control': 'no-store' })
      } catch (error) {
        console.warn(`[dsh-piggy] action failed: action="${operation}" reason="${error instanceof Error ? error.message : String(error)}"`)
        sendJson(res, 500, { ok: false, reason: 'error' })
      }
    },
  })
}

/**
 * Register the three routes once the web seam exists.
 *
 * `ctx.inject` waits for the service instead of sampling it. The previous
 * version read `ctx.get('webServer')` at apply time and bailed out when it was
 * undefined — which is exactly what happened during profile activation, so the
 * routes were never registered and the panel polled a 404 forever. A silent
 * optionality guard is not the same thing as a tolerant one: this one still
 * degrades on a host with no web seam, but only *after* the service has
 * actually been waited for.
 */
export function registerRoutes(ctx, store) {
  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.webServer
    if (webServer === undefined) return () => {}
    const disposers = []
    try {
      disposers.push(registerStateRoute(webServer, store))
      disposers.push(registerArtRoute(webServer))
      disposers.push(registerActRoute(webServer, store))
    } catch (error) {
      // A route already taken: the pig stays command-only rather than breaking
      // activation, but this is a real failure and should be visible.
      console.warn(`[dsh-piggy] 路由注册失败，猪只能用命令访问：${error instanceof Error ? error.message : String(error)}`)
    }
    return () => { for (const dispose of disposers) { try { dispose() } catch { /* best effort */ } } }
  })
}
