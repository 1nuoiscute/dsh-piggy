// 桌面版几何真机检查：隔离启动桌面程序（不碰你自己的存档和位置），用 CDP 往页面发真实鼠标事件，
// 每一步都量「猪的屏幕点」（窗口回读 + 猪的布局盒，不用 getBoundingClientRect——猪有待机动画）。
// 断言只有一条：点猪、开关面板、重启之后，猪的屏幕点不动（差 ≤2px）。
//
// 用法（Linux 桌面上跑，会在屏幕上真的弹出一只猪）：
//   cd apps/desktop && npm run pack-game && cd ../.. && node tools/desktop-geometry-check.mjs [all|click|low|panel|restart|stress]
// 限制：拖动是主进程按真实鼠标位置算的，CDP 挪不动真鼠标，所以这里只能测「点一下」（同样走 beginDrag/endDrag），
// 真拖动：GNOME（Wayland）桌面上 `drag` 场景用 tools/gnome-pointer.py（Mutter 远程桌面接口）按住真鼠标拖猪；别的桌面跳过。
// 多屏、Windows 缩放仍要人工在真机上试。下面的坐标按 1920x1080（工作区 0,29,1920,985）写，别的屏幕按比例换算。
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
  // 量脚底中心：猪的立绘会换大小（73x58 / 54x54），量左上角会把换大小误判成位移
  return { win: g.window, pig: { x: Math.round(g.window.x + b.x + b.width / 2), y: g.window.y + b.y + b.height }, size: { w: b.width, h: b.height }, open: h.getAttribute('data-open'), area: g.workArea }
})()`
const probe = () => ev(PROBE)

async function pigClientCenter() {
  return ev(`(() => { const p = document.querySelector('[data-dsh-pig] .dp-pig'); const r = p.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 } })()`)
}
async function mouse(type, x, y, button = 'left', clickCount = 1) {
  await send('Input.dispatchMouseEvent', { type, x, y, button, clickCount, buttons: type === 'mouseReleased' ? 0 : (button === 'left' ? 1 : 2) })
}
// 真鼠标：GNOME（Wayland）下走 Mutter 远程桌面接口（tools/gnome-pointer.py）；别的桌面退回 CDP 合成事件。
// 每次操作开一个会话、做完立刻关：会话里挂着一个没人消费的录屏流，开久了会把 gnome-shell 拖死。
const { spawnSync } = await import('node:child_process')
const runPointer = script => spawnSync('python3', [join(import.meta.dirname, 'gnome-pointer.py'), process.env.PIGGY_CONNECTOR ?? 'Virtual-1'],
  { input: script.join('\n') + '\n', encoding: 'utf8', timeout: 30000 })
const realPointer = process.env.PIGGY_CDP_ONLY !== '1' && String(runPointer([]).stdout).startsWith('ready')
const pigScreenCenter = () => ev(`(() => { const p = document.querySelector('[data-dsh-pig] .dp-pig'); const r = p.getBoundingClientRect(); return { x: Math.round(screenX + r.x + r.width/2), y: Math.round(screenY + r.y + r.height/2) } })()`)

async function click(button = 'left') {
  if (realPointer && button === 'left') {
    // 真点：按下时窗口会缩成拖动尺寸，CDP 合成的松开会落在旧坐标上丢掉；真鼠标一直在猪身上。
    const c = await pigScreenCenter()
    runPointer([`move ${c.x} ${c.y}`, 'sleep 120', 'down', 'sleep 70', 'up'])
    await sleep(700)
    return
  }
  const c = await pigClientCenter()
  await mouse('mouseMoved', c.x, c.y, 'none')
  await mouse('mousePressed', c.x, c.y, button)
  await sleep(70)
  await mouse('mouseReleased', c.x, c.y, button)
  await sleep(700)
}
async function settle() { await sleep(1500) }

let AREA = null
async function placePigAt(x, y) {
  // 用启动存档把猪放到指定屏幕点，然后重载页面（和用户重启后同一路径）。坐标按 1920x1080 写，按实际工作区等比换算。
  if (AREA === null) AREA = await ev('window.piggyShell.place({}).workArea')
  const rx = Math.round((x / 1920) * AREA.width), ry = Math.round(((y - 29) / 985) * AREA.height)
  await ev(`localStorage.setItem('dsh-piggy:desktop-pig', JSON.stringify({v:2, area:${JSON.stringify(AREA)}, x:${rx}, y:${ry}}))`)
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
  // 猪必须整只画在自己的窗口里：画到窗口外面就看不见、点不到（2026-10-06 内容挪动累加的 bug）
  const w = after.win, hw = after.size.w / 2
  const inside = after.pig.x - hw >= w.x - 1 && after.pig.x + hw <= w.x + w.width + 1 && after.pig.y - after.size.h >= w.y - 1 && after.pig.y <= w.y + w.height + 1
  results.push({ name, dx: inside ? dx : 9999, dy })
  if (!inside) console.log(`  !! ${name}: 猪画在窗口外面`)
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
if (scenario === 'drag' || scenario === 'all') {
  if (!realPointer) console.log('drag: 没有 GNOME 远程桌面接口（不是 GNOME/Wayland？），跳过真拖动')
  else {
    const pigCenter = pigScreenCenter
    async function realDrag(dx, dy) {
      // 指针命令带上间隔（sleep 毫秒），一次性交给 helper 执行，执行完会话就关
      const c = await pigCenter()
      const steps = Number(process.env.PIGGY_DRAG_STEPS ?? 48)
      const script = [`move ${c.x} ${c.y}`, 'sleep 150', 'down', 'sleep 120']
      for (let i = 1; i <= steps; i += 1) script.push(`move ${Math.round(c.x + dx * i / steps)} ${Math.round(c.y + dy * i / steps)}`, 'sleep 8')
      script.push('sleep 120', 'up')
      runPointer(script)
      await sleep(2000)
    }
    // 贴着四条屏幕边松手：窗口的透明留白会伸出屏幕，猪不能因此被推开
    for (const edge of ['bottom', 'left', 'right', 'top']) {
      await placePigAt(960, 500)
      const s0 = await probe()
      const a = s0.area, half = s0.size.w / 2
      const want = edge === 'bottom' ? { x: s0.pig.x, y: a.y + a.height - 2 } : edge === 'top' ? { x: s0.pig.x, y: a.y + s0.size.h + 2 }
        : edge === 'left' ? { x: a.x + half + 2, y: s0.pig.y } : { x: a.x + a.width - half - 2, y: s0.pig.y }
      await realDrag(want.x - s0.pig.x, want.y - s0.pig.y)
      const s1 = await probe()
      record(`drag to ${edge} edge`, { ...s0, pig: want }, s1)
      await click('left'); await settle()
      record(`  then click`, s1, await probe())
      await click('right'); await settle(); await click('right'); await settle()
      record(`  then open/close panel`, s1, await probe())
    }
    for (const [y, dx, dy] of [[300, -360, 250], [300, 0, 500], [700, 200, -400], [500, -300, 300]]) {
      await placePigAt(1400, y)
      const s0 = await probe()
      await realDrag(dx, dy)
      const s1 = await probe()
      // 拖到哪就是哪：猪的位移应该等于鼠标位移（没碰到屏幕边时）
      record(`drag (${dx},${dy}) from y=${y}`, { ...s0, pig: { x: s0.pig.x + dx, y: s0.pig.y + dy } }, s1)
      await click('left'); await settle()
      record(`  then click`, s1, await probe())
      await click('right'); await settle(); await click('right'); await settle()
      record(`  then open/close panel`, s1, await probe())
    }
  }
}
const bad = results.filter(r => Math.abs(r.dx) > 2 || Math.abs(r.dy) > 2)
console.log(bad.length === 0 ? 'ALL OK' : `FAIL ${bad.length}: ` + bad.map(r => r.name).join(', '))
child.kill()
process.exit(0)
