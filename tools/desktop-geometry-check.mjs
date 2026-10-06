// 桌面版几何真机检查：隔离启动桌面程序（不碰你自己的存档和位置），用 CDP 往页面发真实鼠标事件，
// 每一步都量「猪的屏幕点」（窗口回读 + 猪的布局盒，不用 getBoundingClientRect——猪有待机动画）。
// 断言只有一条：点猪、开关面板、重启之后，猪的屏幕点不动（差 ≤2px）。
//
// 用法（Linux 桌面上跑，会在屏幕上真的弹出一只猪）：
//   cd apps/desktop && npm run pack-game && cd ../.. && node tools/desktop-geometry-check.mjs [all|click|low|panel|restart|stress]
// 限制：拖动是主进程按真实鼠标位置算的，CDP 挪不动真鼠标，所以这里只能测「点一下」（同样走 beginDrag/endDrag），
// 真拖动、多屏、Windows 缩放仍要人工在真机上试。坐标按单屏 1920x1080、工作区 (0,29,1920,985) 写死，别的屏幕要改 placePigAt。
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const DESKTOP = join(import.meta.dirname, '..', 'apps', 'desktop')
const UD = join(tmpdir(), 'dsh-piggy-geometry-check')
const PORT = 9333
const sleep = ms => new Promise(r => setTimeout(r, ms))

rmSync(UD, { recursive: true, force: true })
mkdirSync(join(UD, 'dsh-piggy'), { recursive: true })
const home = process.env.HOME
if (existsSync(join(home, '.config/dsh-piggy-desktop/dsh-piggy/state.json')))
  cpSync(join(home, '.config/dsh-piggy-desktop/dsh-piggy/state.json'), join(UD, 'dsh-piggy/state.json'))

const child = spawn(join(DESKTOP, 'node_modules/.bin/electron'), ['.', '--no-sandbox', '--ozone-platform=x11', `--remote-debugging-port=${PORT}`], {
  cwd: DESKTOP, env: { ...process.env, DISPLAY: ':0', PIGGY_USERDATA: UD }, stdio: ['ignore', 'ignore', 'ignore'],
})
process.on('exit', () => { try { child.kill() } catch {} })

let ws, seq = 0
const waiting = new Map()
async function connect() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find(t => t.type === 'page')
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break }
    } catch {}
    await sleep(250)
  }
  await new Promise(r => ws.addEventListener('open', r))
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) } })
}
function send(method, params = {}) { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise(r => waiting.set(id, r)) }
async function ev(expr) {
  const m = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 400))
  return m.result?.result?.value
}

const PROBE = `(() => {
  const lb = n => { let x=0,y=0,w=n; while (w && w !== document.body) { x += w.offsetLeft||0; y += w.offsetTop||0; w = w.offsetParent } return {x,y,width:n.offsetWidth,height:n.offsetHeight} }
  const h = document.querySelector('[data-dsh-pig]'); const p = h && h.querySelector('.dp-pig')
  if (!p) return null
  const g = window.piggyShell.place({}); const b = lb(p)
  return { win: g.window, pig: { x: g.window.x + b.x, y: g.window.y + b.y }, local: {x:b.x,y:b.y}, open: h.getAttribute('data-open'), area: g.workArea }
})()`
const probe = () => ev(PROBE)

async function pigClientCenter() {
  return ev(`(() => { const p = document.querySelector('[data-dsh-pig] .dp-pig'); const r = p.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 } })()`)
}
async function mouse(type, x, y, button = 'left', clickCount = 1) {
  await send('Input.dispatchMouseEvent', { type, x, y, button, clickCount, buttons: type === 'mouseReleased' ? 0 : (button === 'left' ? 1 : 2) })
}
async function click(button = 'left') {
  const c = await pigClientCenter()
  await mouse('mouseMoved', c.x, c.y, 'none')
  await mouse('mousePressed', c.x, c.y, button)
  await sleep(70)
  await mouse('mouseReleased', c.x, c.y, button)
  await sleep(700)
}
async function settle() { await sleep(1500) }

async function placePigAt(x, y) {
  // 用启动存档把猪放到指定屏幕点，然后重载页面（和用户重启后同一路径）
  await ev(`localStorage.setItem('dsh-piggy:desktop-pig', JSON.stringify({v:2, area:{x:0,y:29,width:1920,height:985}, x:${x}, y:${y - 29}}))`)
  await send('Page.reload')
  await sleep(4000)
}

const fmt = s => s ? `pig(${s.pig.x},${s.pig.y}) win(${s.win.x},${s.win.y} ${s.win.width}x${s.win.height}) open=${s.open}` : 'null'

await connect()
await send('Runtime.enable')
await sleep(4000)

const scenario = process.argv[2] ?? 'all'
const results = []
function record(name, before, after) {
  const dx = after.pig.x - before.pig.x, dy = after.pig.y - before.pig.y
  results.push({ name, dx, dy })
  console.log(`${name.padEnd(28)} ${fmt(before)}  ->  ${fmt(after)}  Δ(${dx},${dy})`)
}

// 先开关一次面板，让本机记下「面板往下开」的预留范围（用户机器上就是这个状态）
await placePigAt(1400, 300)
await click('right'); await settle(); await click('right'); await settle()
console.log('seeded open-box:', await ev(`localStorage.getItem('dsh-piggy:desktop-open-box')`))

if (scenario === 'click' || scenario === 'all') {
  await placePigAt(1400, 300)
  const s0 = await probe(); console.log('start', fmt(s0))
  let prev = s0
  for (let i = 0; i < 5; i += 1) { await click('left'); await settle(); const s = await probe(); record(`left click #${i + 1}`, prev, s); prev = s }
  record('left click total', s0, prev)
}
if (scenario === 'low' || scenario === 'all') {
  for (const y of [500, 700, 850]) {
    await placePigAt(1400, y)
    const s0 = await probe()
    await click('left'); await settle()
    record(`low y=${y} click`, s0, await probe())
  }
}
if (scenario === 'panel' || scenario === 'all') {
  for (const y of [300, 800]) {
    await placePigAt(1400, y)
    const s0 = await probe()
    let s = s0
    for (let i = 0; i < 3; i += 1) {
      await click('right'); await settle(); const o = await probe()
      await click('right'); await settle(); s = await probe()
      console.log(`  y=${y} open#${i + 1} ${fmt(o)}`)
    }
    record(`panel y=${y} 3x open/close`, s0, s)
  }
}
if (scenario === 'restart' || scenario === 'all') {
  for (const y of [300, 650, 900]) {
    await placePigAt(1400, y)
    await click('left'); await settle()
    const s0 = await probe()
    let s = s0
    for (let i = 0; i < 3; i += 1) { await send('Page.reload'); await sleep(5000); s = await probe() }
    record(`restart y=${y} x3`, s0, s)
  }
}
if (scenario === 'stress' || scenario === 'all') {
  for (const y of [150, 500, 950]) {
    await placePigAt(900, y)
    const s0 = await probe()
    for (let i = 0; i < 10; i += 1) await click('left')
    await settle()
    for (let i = 0; i < 3; i += 1) { await click('right'); await settle(); await click('right'); await settle() }
    record(`stress y=${y} 10 clicks+3 panels`, s0, await probe())
  }
}
const bad = results.filter(r => Math.abs(r.dx) > 2 || Math.abs(r.dy) > 2)
console.log(bad.length === 0 ? 'ALL OK' : `FAIL ${bad.length}: ` + bad.map(r => r.name).join(', '))
child.kill()
process.exit(0)
