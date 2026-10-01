# C 批次任务卡（2026-10-01）

> 规划/验收：Claude；执行：Codex（C3/C5/C6/C7）、DSH agent（C1/C2/C4）。卡上数值用户已确认。每卡末尾留「验证记录」「疑问」「验收意见」。

## Context
用户额度紧，本轮 Claude 只出计划/规范/验收，代码由 **Codex** 和 **DSH agent** 写。需求来自用户 9 条：调试模式要解锁才开、调试页要覆盖所有可解锁内容、番茄钟、胖猪、换肤、加冕道具化（并入 PR #3 恶魔契约）、加冕 App 改图鉴、钓鱼（星露谷式手动 + 自动）。**自定义导演系统、社区：本轮不做。**

用户已定：调试=连点版本号 7 次解锁；番茄钟=小奖励+猪陪伴；鱼=进背包可喂可卖+图鉴；换肤立绘用户自己找，Claude 出 SVG 规范。

现状（已核对代码，仓库 `/zyx/DSH/workspaces/dsh-pig`，main=b797012，存档 v12）：
- 调试：`src/client/index.js:332-366` Ctrl+Shift+D 开关，`writeStore(DEV_KEY)` 写 localStorage **永久记住** → 用户看到"没关"。`window.dshPigDev.on()` 也能直接开。调试页 `src/client/tabs/dev.js` 没有形态（猪猪王）入口。
- 形态：`packages/pet-core/src/data/evolution.js` 的 `FORMS`（仅 king）；主屏 `TABS` 里有 `crown` App（`src/client/constants.js:41`，`src/client/tabs/crown.js`）。
- PR #3（1nuoiscute，OPEN）：给 FORMS 加 `via` 字段，恶魔猪走商店「📜 契约」→背包使用，条件不齐不消耗；10 张 SVG。
- 体重：已有 `state.weightG`（`core/effects.js:77` 只增不减，下限 400g）。
- 背包使用：`src/client/tabs/bag.js:98` `ui.send('use',{item})`。

## 分工与协作
| 卡 | 内容 | 谁 | 依赖 |
|---|---|---|---|
| C1 | 调试模式解锁 + 调试页全覆盖 | DSH | 无 |
| C2 | 番茄钟 App | DSH | 无 |
| C3 | 合入 PR #3 + 王冠/契约道具化 + 变身 emoji 特效 | Codex | 无 |
| C4 | 图鉴 App（替换加冕 App 的位置） | DSH | C3 合入后 |
| C5 | 钓鱼 App（手动星露谷式 + 自动） | Codex | C4 合入后接图鉴「鱼」分区（先做本体） |
| C6 | 换肤框架 + 占位皮肤 | Codex | C3 |
| C7 | 胖猪（体重分档换立绘） | Codex | **等用户给圆猪图**，先不开工 |

协作规则（沿用 `docs/tasks/README.md`，以下为本轮补充）：
- DSH 在原目录 main 直接提交；Codex 用 worktree `/zyx/DSH/workspaces/dsh-pig-codex` 分支 `codex/next`，每卡完成 rebase 到 main 再快进合入。
- **本轮不升存档版本**：新字段一律 `ensureXxx(state)` 补默认值（参考 `core/lines.js` 的 `ensureDialogue`）。确需升版本只能由 Codex 做，且先在卡里写明。
- 提交**不加任何 AI 署名行**；外部贡献者（PR #3）的作者/Co-Authored-By 保留。
- 每卡：先写会红的测试再改；改完 `npm run build && npm test && npm run typecheck` 全绿；**README 和 CHANGELOG 同步更新**；界面截图存 `docs/screenshots/c<N>-*.png`（Playwright + `/usr/bin/chromium` 截隔离实例 3082，不碰用户 3080 的 dsh）。
- **不改现有页面排版**（只能加新 App / 替换格子内容）；两列 grid 用 `minmax(0,1fr)`，格子文字 ≤ 两行短字。
- 下面写的数值是**建议值，用户批准本计划即视为确认**；agent 觉得不合理写在卡末「疑问」里，不擅自改。

---

## C1 调试模式（DSH）
1. 去掉 Ctrl+Shift+D 和 `dshPigDev.on/toggle`（保留 `off`）。启动时 `removeStore(DEV_KEY)`/写 '0'，清掉老用户永久打开的状态。
2. 主屏九宫格底部加一行小字版本号 `v0.25.x`（灰色、不占格子）。**3 秒内连点 7 次**解锁；第 4 次起气泡提示「再点 N 次」；解锁后出现 🔧调试 App。**只存内存，刷新/重启即关**。调试页顶部加「关闭调试」按钮。
3. 调试页补「形态」组：每个 `FORMS` 一个按钮（直接设 `form`）+「恢复普通」；补「道具」组：一键给王冠/契约（C3 后）；以后皮肤、鱼也要有对应按钮。
4. 加测试 `test/dev-coverage.test.js`：遍历 `FORMS`（以及将来的 `SKINS`、`FISH`），断言 dev.js 里都有 `data-dev` 入口 —— 以后新加内容忘了调试入口会红。
5. 服务端 `routes.js` 的 `dev`/`giveAll` 不变（单机，不做鉴权）。

验收：刷新后无 🔧；连点 6 次不开、7 次开；刷新又关；控制台 `dshPigDev.on` 不存在；调试页能一键变猪猪王/恶魔猪/恢复。

## C2 番茄钟（DSH）
- 主屏新 App「🍅 番茄钟」。时长选 15/25/45 分钟，休息 5 分钟。
- 状态存服务端 `state.pomodoro = {startedAt, minutes, todayDone, day}`（`ensurePomodoro`），面板关了/刷新/重启都接着倒计时；到点由 `settlement` 或下次请求结算。
- 专注中：猪进入免打扰（复用 B6 免打扰），头顶小 🍅 + 剩余分钟；说一句陪伴台词（`data/lines.js` 加场景 `pomodoroStart/Done/Abandon`，各 3 句）。
- 完成：+8 🪙、+6 心情；**每天前 8 个**给奖励，之后只计数。中途放弃无奖励。
- 完成时浏览器 Notification（无权限就气泡），状态页显示今日完成数。

验收：开 25 分钟 → 刷新仍在倒计时；调试 +1 小时后结算给奖；第 9 个不给钱；放弃无奖励。

## C3 加冕道具化（Codex）
1. 先把 PR #3 合进来（保留作者），在其基础上改：`FORMS.via` 统一成 `'item'`，每个形态带 `item` 键。
2. 商店新货架「✨ 晋升」：`👑 王冠` 3000 🪙（key `crown`）、`😈 恶魔契约` 6666 🪙（沿用 PR）。条件不变（猪猪王 Lv40+三维各 20+本代打工 10 次；恶魔猪按 PR）。
3. 背包里这类道具的使用按钮文字取 `item.useLabel`：王冠＝「加冕」，契约＝「签约」。条件不齐→拒绝、不消耗、列出差哪条。
4. 成功时全屏 emoji 特效：王冠 👑✨ 从上落下 + 猪中心放大弹出一个 👑；契约 😈🔥 同理（放 `src/client/effects.js`，1.5 秒内结束，可重复触发不叠加卡顿）。
5. `/pig crown` 命令改成「有王冠就用，没有就提示去商店买」。已经加冕过的老存档保持 `form='king'` 不动。
6. 主屏 `crown` App 暂时保留，C4 替换。

验收：没王冠时加冕 App/命令都提示买；买了条件不齐点「加冕」不消耗；条件齐→特效→立绘变王；契约同理；老存档 king 不变。

## C4 图鉴（DSH，C3 合入后）
- 主屏 `crown` 位置换成「📖 图鉴」（`TABS` 同一格，key 改 `dex`，旧 `crown` tab 选中时回落到 `dex`）。
- 存档 `state.dex = {forms:{}, skins:{}, fish:{}, items:{}}`（`ensureDex`），记录「第一次获得时间/次数」。进背包、变身、换肤、钓到鱼时记。
- 分区（两层方块，同商店风格）：形态 / 皮肤 / 鱼 / 道具 / 纪念品。未获得显示灰色剪影 + 获得条件；形态卡显示条件进度（例如 魅力 12/20）。
- 分区注册表 `src/client/tabs/dex.js` 里留 `registerDexSection`，C5 鱼、C6 皮肤自己往里加。

验收：新猪图鉴全灰；买个苹果后「道具」点亮；调试变猪猪王后「形态」点亮；未解锁形态能看到差多少。

## C5 钓鱼（Codex）
**流程**（还原星露谷）：
1. 抛竿：按住鼠标/空格蓄力条往返，松手决定抛远（远=稀有鱼概率+）。
2. 等咬钩：2–8 秒随机；出现「❗」后 **1 秒内**点击，否则跑掉。
3. 小游戏：竖条（高 ≈ 面板 60%），玩家绿条受重力下落、按住上升（有惯性）；鱼图标按行为模式移动（平滑/冲刺/下沉/上浮/混合，难度 1–100 决定速度和变向频率）；鱼在绿条内捕获槽涨，在外降；满＝钓上，空＝跑掉。初始槽 30%。
4. 结果卡：鱼 emoji、名字、尺寸、售价，「放进背包」。

**规则**：
- 服务端在抛竿时用 `roll(state)` 决定鱼和尺寸，存 `state.fishing.pending`（60 秒过期）；客户端只上报成功/失败。禁止 `Math.random()` 进 core（小游戏动画在客户端可以用）。
- 每次抛竿饱食 −1；猪在打工/学习/旅行时不能钓。
- 自动模式：选 30/60 分钟，猪去钓鱼（占用状态同打工，复用 `core/activity.js`），每 3 分钟按鱼难度判一次成功率（难度越高越低，最低 20%），售价按 **70%**；每天最多 2 次。
- 鱼表 `data/fish.js`：15 种，普通 8 / 少见 4 / 稀有 2 / 传说 1；按真实时间分早/午/晚/夜出现；售价 8–300；可喂（饱食 = 售价/2，上限 60）；key 统一 `fish_` 前缀（避开已有 `fish` 小鱼干）。具体表 Codex 写进 `docs/tasks/numbers/C5-fish.md`，用户验收时看。
- 背包鱼：「喂」「卖」两个按钮；图鉴「鱼」分区记最大尺寸。调试页加「钓鱼」组（一键给每种鱼、跳过等待）。
- 小游戏 60fps 用 requestAnimationFrame，面板关掉自动判失败并停循环。

验收：手动能钓上/会跑；稀有鱼明显更难；刷新时 pending 不重复发鱼；自动模式 30 分钟后结算；鱼可喂可卖，图鉴点亮。

## C6 换肤（Codex）
- `data/skins.js`：`{key, label, emoji, art, price, actionArt}`；默认皮肤 `default`（现有 piglet）。`state.skin`（`ensureSkin`），商店「🎨 皮肤」货架，买后背包「换上」。
- 立绘查找顺序：形态（王/恶魔）> 皮肤 > 默认。**形态优先，皮肤被盖住**（用户说进化形态不管）。缺动作图时回落到该皮肤待机图。
- 先放 1 个占位皮肤（把 piglet.svg 换色）走通流程，等用户的图再加。

### 给用户的皮肤 SVG 规范（每套皮肤）
格式同 `docs/ART-SPEC.md`：`viewBox="0 0 64 64"`、透明底、平涂无位图/字体/渐变/滤镜，猪站位与 `assets/piglet.svg` 对齐（脚底同一高度、身体同一中心）。

| 必需 | 文件名 | 场景 |
|---|---|---|
| ✅ | `skin-<名>.svg` | 待机 |
| ✅ | `-eat` | 吃东西 |
| ✅ | `-bathe` | 洗澡 |
| ✅ | `-play` | 玩耍 |
| ✅ | `-pet` | 被摸摸 |
| 可选 | `-relaxed` | 闭眼放松/睡觉 |
| 可选 | `-work` | 打工 |
| 可选 | `-study` | 学习 |
| 可选 | `-trip` | 旅行 |
| 可选 | `-fish` | 钓鱼（C5 新增场景） |

最少 5 张能上线，完整 10 张。可选的缺了用待机图。

## C7 胖猪（Codex，等图）
- 体重分 3 档：正常 / 圆润（≥ 理想体重 ×1.3）/ 胖胖（≥ ×1.6）；理想体重按等级取（Codex 从现有 weightG 增长数据算一张表写进数值单）。
- 减重：玩耍、打工、钓鱼、每天自然回落 2%（向理想体重）。
- 只作用于默认皮肤普通形态；王/恶魔/其他皮肤不变。
- **用户给图规范**：圆润、胖胖各一套，每套同上表（最少 5 张：待机/吃/洗澡/玩/摸），文件名 `pig-round*.svg`、`pig-fat*.svg`。

---

## 给 agent 的提示词（直接复制）

### 给 DSH agent
```
你在 dsh-piggy 仓库 /zyx/DSH/workspaces/dsh-pig 的 main 上工作。先读 docs/tasks/README.md 和 docs/tasks/C-round.md（本轮任务卡），按顺序做 C1 → C2 → C4（C4 要等 Codex 的 C3 合进 main 再开工，开工前 git log --oneline -15 确认）。
硬规则：
- 每卡先写会红的测试，再改代码；完成后 npm run build && npm test && npm run typecheck 全绿。
- 只 git add 自己改的文件，不要 git add -A；不要碰 codex/* 和 claude/* 分支；提交信息 feat(pig)/fix(pig) 开头，不加任何 AI 署名行。
- 不升存档版本、不改 core/upgrades.js 和 STATE_VERSION，新字段用 ensureXxx(state)。
- 不改现有页面排版，只加新 App；数值照卡上写的，不合理写到卡末「疑问」，不要自己改。
- 随机数只用 core/random.js，禁止 Math.random() 进 core。
- 每卡同步更新 README 和 CHANGELOG（未发布小节）。
- 界面截图：起隔离实例（DSH_HOME 用拷贝，端口 3082，见 docs/tasks/README.md 验收段），Playwright 截图存 docs/screenshots/c<N>-*.png；不要动 3080 上用户在用的 dsh。
- 每卡做完在卡末「验证记录」写测试结果、截图路径，然后停下告诉我，等验收后再做下一张。
```

### 给 Codex
```
你在 dsh-piggy 仓库工作。先建 worktree：git -C /zyx/DSH/workspaces/dsh-pig worktree add /zyx/DSH/workspaces/dsh-pig-codex -b codex/next main，之后都在 /zyx/DSH/workspaces/dsh-pig-codex 里干活。先读 docs/tasks/README.md、docs/tasks/C-round.md、docs/ART-SPEC.md、docs/CONVENTIONS.md。
顺序：C3 → C5 → C6（C7 等我给图再做）。
C3 第一步：gh pr checkout 3 拿到 PR #3（作者 1nuoiscute）的提交，保留原作者，在其上按卡改成「王冠/契约都是商店道具」。
每卡完成：npm run build && npm test && npm run typecheck 全绿 → git rebase main → 在主目录 git merge --ff-only codex/next 合进 main（DSH agent 也在 main 上提交，冲突你解决，不要覆盖他们的改动）。
硬规则：
- 先写会红的测试再改；随机只用 core/random.js 的 roll/chance/pickOne，core 里禁止 Math.random()。
- 不升存档版本，新字段 ensureXxx(state)；真要升先停下问我。
- 不改现有页面排版，只加新 App / 新货架；数值照卡写，C5 鱼表写进 docs/tasks/numbers/C5-fish.md。
- 每加一种形态/皮肤/鱼，调试页（src/client/tabs/dev.js）都要有对应入口，test/dev-coverage.test.js 会检查。
- 提交 feat(pig)/fix(pig) 开头，不加任何 AI 署名行；同步更新 README 和 CHANGELOG。
- 界面截图：隔离实例 3082 + Playwright + /usr/bin/chromium，存 docs/screenshots/c<N>-*.png；钓鱼小游戏另录一段 10 秒 GIF/webm。不要动 3080 上用户在用的 dsh。
- 每卡做完在卡末「验证记录」写结果，停下告诉我，等验收再做下一张。
```

---

## Verification（Claude 验收清单，每卡）
1. `git log` 看提交：无 AI 署名、只动了相关文件、README/CHANGELOG 有更新。
2. 在干净拷贝里 `npm run build && npm test && npm run typecheck`。
3. 起隔离实例 3082，Playwright 按每卡「验收」逐条点一遍，对照 agent 截图；钓鱼必须实际玩一局手动 + 跑一次自动（调试 ×60 加速）。
4. 老存档（`test/fixtures/` 里 v12 样本 + 用户当前存档拷贝）加载不报错、king 形态保留。
5. 不合格写回卡末「验收意见」，让对应 agent 改。


---

## 验证记录（各 agent 每卡完成后追加）

### C1 调试模式（DSH agent，2026-10-01）

- `npm run build && npm test`：**328 / 328 通过**（新增 `test/dev-coverage.test.js` 11 条，
  改写 `test/client.test.js` 里 2 条 B1 时代的旧断言 —— 它们还在测 Ctrl+Shift+D）
- `npm run typecheck`：**0 错误**
- 真机验收（隔离实例 3082，`DSH_HOME=/zyx/DSH/workspaces/.dsh-home-test`，Playwright + `/usr/bin/chromium`）：

  | 验收项 | 实测 |
  |---|---|
  | 刷新后无 🔧 | `data-dev="false"`、`[data-app="dev"]` 0 个 ✓ |
  | 连点 6 次不开 / 7 次开 | 6 次后 `false`，第 7 次 `true` ✓ |
  | 第 4 次起提示 | 气泡「再点 3 次」✓ |
  | 刷新又关 | reload 后 `data-dev="false"` ✓ |
  | 控制台 | `dshPigDev.on` / `.toggle` 都是 `undefined`，只有 `off` 是函数 ✓ |
  | 调试页一键变形态 | 「形态」组有 猪猪王 / 恢复普通 ✓（截图里是调试页全貌） |

- 截图：`docs/screenshots/c1-home-version.png`（主屏版本号）、`c1-tap-hint.png`（第 4 次提示）、
  `c1-dev-tab.png`（解锁后直接落在调试页）、`c1-dev-app.png`（🔧 App 出现）、`c1-form-king.png`（调试页形态组）
- 改动文件：`src/client/dev-mode.js`（新，连点解锁 + 控制台 off）、`src/client/index.js`（去掉
  Ctrl+Shift+D 与 localStorage 记忆，接线给主屏与调试页）、`src/client/constants.js`（解锁参数）、
  `src/client/tabs/home.js`（版本号）、`src/client/tabs/dev.js`（关闭调试 + 形态组）、
  `src/client/css-tiles.js`（`.dp-version`）、`packages/pet-core/src/core/state.js`
  （`applyDevPatch` 支持 `form`，`null` = 恢复普通）、测试两个、README、CHANGELOG


### C1 尾巴：形态按钮拉等级（DSH agent，2026-10-01）

- 用户定了「要拉等级」：等级低于该形态所在阶段时，同一次 dev patch 里把等级顶到起始等级。
  起始等级由宿主从 `data/life.js` 读（`formsView` 新增 `stage` / `fromLevel`），客户端不写死数字。
- 测试 +4（幼年拉等级、等级够了不动、纸盒置灰、死猪置灰）；`npm test` 333/333、typecheck 0。
- 真机（隔离 3082）：`Lv.2 幼年猪` → 点「👑 猪猪王」→ `Lv.40 猪猪王`，立绘换成 `pig-king` ✓
  截图 `docs/screenshots/c1-tail-form-level.png`。
- 备注：纸盒存档在真机上进不到调试页（面板整屏是纸盒页），那条置灰逻辑用直接渲染调试页的
  单元测试守着。

### C2 番茄钟（DSH agent，2026-10-01）

- `npm run build && npm test`：**356 / 356 通过**（新增 `test/pomodoro.test.js` 23 条：核心 15、
  界面 7、真实 store 1；顺手把客户端挂具抽成 `test/helpers/bundle.js`，C1/C2 共用）
- `npm run typecheck`：**0 错误**
- 红测试：把 `store/api.js` freshen 里的结算钩子注释掉，「走真实 store」那条立刻变红（已复原）
- 卡上四条验收（隔离实例 3082，Playwright + 接口实测）：

  | 验收项 | 实测 |
  |---|---|
  | 开 25 分钟后刷新仍在倒计时 | 刷新后 `active: true`、`secondsLeft: 1493`，猪头顶药丸 🍅 24:55 ✓ |
  | 调试 +1 小时后结算发奖 | `todayDone: 1`，金币 500 → 508 ✓ |
  | 第 9 个不给钱 | 设今天=8 → 再完成一个：`todayDone: 9`，金币仍是 508 ✓ |
  | 放弃不给奖励 | 放弃前后 `todayDone` 与金币都不变，药丸消失 ✓ |

- 截图：`docs/screenshots/c2-home-tile.png`（主屏新 App）、`c2-app-idle.png`（三个时长）、
  `c2-focusing.png`（专注中：页面倒计时 + 猪头顶 🍅 + 开场台词）、`c2-after-reload.png`（刷新后还在走）、
  `c2-settled.png`、`c2-cap.png`（今天=8 之后）、`c2-abandoned.png`
- 实现要点：状态在 `state.pomodoro`（`ensurePomodoro` 补默认值，**不升存档版本**）；结算挂在
  `store/api.js` 的 freshen（每次读状态都会结算，所以关着面板也算）；完成时 `finishedAt` 变化，
  客户端按时间去重弹一次浏览器通知，没权限退回气泡
- **顺带一动**：调试页「⏩ +1 小时」以前只推进猪的时间（decay），墙上时钟不动，所以番茄钟永远
  等不到点。现在快进会把番茄钟的 `startedAt` / `restUntil` 一起往前挪并立即结算 —— 这是卡上
  「调试快进一小时后结算发奖」这条验收的前提，改动只在 `applyDevPatch` 的调试分支里。

### C2 返工（DSH agent，2026-10-01）

**1. 头顶 🍅 角标压面板（必改）**

- 原来 `.dp-pomo` 挂在**场景**上（`bottom:calc(100%+40px)`、`z-index:4`），面板打开时正好落在
  「今天完成」那行中间。现在改成挂在**猪立绘**上的小角标：`bottom:calc(100% + 2px)`、`right:-4px`、
  `z-index:1`（低于说话气泡的 2、也低于装扮层 3），跟着猪一起动。
- 真机实测（隔离 3082，`getBoundingClientRect` 采样）：
  - 面板收起：角标离猪头 **18px**（要求 ≤20px）；与面板/ HUD / 气泡重叠面积 **0 px²**（12 次采样）
  - 面板打开：角标离猪头 **19px**；与面板重叠 **0 px²**（面板底边 602、角标顶 639，让开 37px）、
    与 HUD 重叠 **0 px²**（HUD 右 789 < 角标左 828）
- 说话气泡和角标位置挨着，所以加了条规则：**猪说话时角标让位**（`showBubble` 先把它藏起来，
  气泡收起后按 `data-pomo` 放回来）。真机实测：摸一下猪 → 气泡「再多待一会儿」出现 → 角标隐藏；
  3.2 秒后气泡消失 → 角标回来（🍅 44:44）。
- 截图：`docs/screenshots/c2-pill-open.png`（面板打开）、`c2-pill-closed.png`（面板收起）、
  `c2-pill-open-zoom.png` / `c2-pill-closed-zoom.png`（放大自查没有重叠）、`c2-pill-bubble.png`（让位瞬间）；
  顺手把 `c2-focusing.png` 按新样式重截。

**2. 放弃前先结算（小修）**

- `abandonPomodoro` 现在先调 `settlePomodoro`：已经到点的按完成返回（`{ok:true, done:true, ...}`，
  照常计数发奖、说完成台词、恢复免打扰），没到点才走放弃分支（返回里带 `abandoned: true`）。
- 红测试：`test/pomodoro.test.js` 的「放弃一个已经到点的番茄」——先写红，再去掉修复里的两行确认它变红，
  然后复原。顺带发现原来那条「中途放弃」的测试其实一直在放弃一个**已经完成**的番茄（`at(20)` 是 20:00，
  45 分钟的那轮 10:45 就到点了），改成真正的 20 分钟后放弃。
- `npm run build && npm test`：**360 / 360 通过**；`npm run typecheck`：**0 错误**
- 改动文件：`packages/pet-core/src/core/pomodoro.js`、`src/client/scene.js`、`src/client/panel.js`、
  `src/client/effects.js`、`src/client/css-tiles.js`、`test/pomodoro.test.js`、README/CHANGELOG

### D1 桌面版 Windows 卡顿（DSH agent，2026-10-01）

**改了什么**

1. **窗口改小**：主进程不再铺满工作区，只框住页面报上来的内容外接矩形 + 16px（`lib/window-geometry.js`，
   纯函数可测）。以窗口**右下角**为锚：内容变大就往左上长，贴边时自动收进 `workArea`，多显示器按窗口所在的
   那块屏算。页面把「猪 + 面板 + 气泡」的框报上来（`piggy:content`），拖猪改成把鼠标增量交给主进程
   （`piggy:move`），页面自己不再改坐标；窗口位置存 `userData/window.json`。
2. **量框不被动画带跑**：渲染层改用布局盒（`offsetLeft/offsetTop/offsetWidth/offsetHeight` 累加到 body），
   再按 4px 取整比 key —— 呼吸/浮动只改 transform，猪闲着时一次都不上报。
3. `win.webContents.setFrameRate(30)`。
4. 阴影从做动画的 `.dp-pig` 挪到立绘（`.dp-pig-img`/`.dp-pig-emoji`）上；心情滤镜（脏/病/去世）同样挂在立绘上，
   网页版视觉不变。
5. Linux/macOS 没退化：X11 窗口形状照旧（可点区域仍是猪 + 面板两块），拖动、托盘、退出、更新 App 都没动。

**验收**

- 自动化：`apps/desktop/test/window.test.js` 7 条 + `test/desktop-shell.test.js` 3 条
  - 猪闲着 10 秒（120ms × 83 次 tick）`setShape`/`setContent` **多调 0 次**（红测试：改之前会一直调）
  - 拖猪时窗口跟着走（两次 pointermove → 两次 `moveBy`），页面坐标不写
  - 桌面版面板按屏幕空间朝上开、横向不挪；网页版（没有外壳时）行为不变
  - 几何：锚右下角、贴边收进 workArea、多显示器夹取、4px 取整
- `npm run build && npm test`：**370 / 370 通过**；`npm run typecheck`：**0 错误**
- **Linux 实机**（X11，本机 3840×2160 屏）：`apps/desktop` 用 electron 44.5.1 + `--ozone-platform=x11` 跑起来，
  python-xlib 查 X 树里的真实窗口（不信 capturePage）：
  - 收起：**117×114 DIP**（X 里 234×228 物理像素），停在工作区右下角；主进程日志 `bounds content 117x114` ✓
  - 面板展开：**324×271 DIP**（X 里 648×542），正好是面板 292 + 32 留白 ✓
  - 可点区域（`XShapeGetRectangles`）**2 块**：面板 (32,32,584,192) + 猪 (32,240,584,272) —— 空白角被抠掉，
    点得到桌面 ✓
- **给 Windows 用户的实测步骤**（Claude 补充：现象主要出在浏览器 —— 全屏透明置顶窗口压着，
  浏览器的 direct flip/overlay 失效）：
  1. 装免安装版 `dsh-piggy-portable-<版本>.exe`，开着猪，滚动一个长网页（新闻/微博都行），
     记录 1 分钟任务管理器里 `dsh-piggy` 和「桌面窗口管理器」的 CPU/GPU；
  2. 托盘「退出」关掉猪，同样滚动 1 分钟，再记一次；
  3. 对比两次；顺带确认：拖猪、展开面板、空白处点击落到桌面、托盘、退出、更新 App 都正常。
- **Windows 测试包：本机打不出来**（`apps/desktop` 没装 electron-builder，机器上也没有 wine，NSIS 打不了；
  `.github/workflows/release.yml` 是 `push: tags: v*` 触发的，还要标签与 `package.json` 版本一致）。
  可选：① 推一个 `v0.25.2`（或 0.25.1 的补丁版）标签，CI 会产出
  `dsh-piggy-portable-<版本>.exe`；② 在 Windows 机器上进 `apps/desktop` 跑 `npm install && npm run dist:win`。
  要哪种我照做（推标签需要你点头）。
- 截图/日志：`/zyx/DSH/workspaces/.piggy-desktop.log`、窗口日志在 `PIGGY_USERDATA/piggy.log`（临时目录，未入库）

## 疑问（数值/规则觉得不合理写这里，等用户定）

- **C2 番茄钟**三条自己定的规则，等用户点头：
  1. 猪在打工 / 学习 / 旅行（`state.activity !== null`）时**开不了**番茄钟（它在外面陪不了你），
     返回 `reason: 'away'`；纸盒和已去世同理。
  2. 「休息 5 分钟」只做显示与提示，**可以直接开下一个**（不强制等待）。
  3. 开始前如果用户自己开着免打扰，结束后仍然保持免打扰（不覆盖用户设置）。

- **C1**：「形态」按钮按卡只改 `state.form`。而形态的立绘只在该形态对应的生活阶段才显示
  （猪猪王要 `middle`/青年以后，见 `formStageView`），所以幼年猪点「猪猪王」看不到变化。
  要不要让这个按钮顺手把等级顶到该形态所在的阶段（更好按着玩），还是保持"只改形态"？
  现在是保持原样，验收时可以先点「等级 → 成年 Lv40」再点形态。
  - **用户定（2026-10-01）：要。** 形态按钮在猪的等级低于该形态 `stage` 的起始等级时，同一次 patch 里把等级拉到那个起始等级（取 `data/life.js`，不要写死 40/10）；已经够了就不动等级。纸盒/死猪先孵化/复活再说，按钮置灰并写原因。


## 验收意见（Claude 写）

### C1（Claude，2026-10-01）：✅ 通过
- 提交 0ff5878：无 AI 署名，只动了 C1 相关文件，README/CHANGELOG 已更新；`client.js` 重新构建后无差异。
- `npm test` 328/328，`npm run typecheck` 0 错误（用 deepseek-harness 里的 tsc）。
- 自己起的隔离实例（3083，存档拷贝）+ Playwright 实测：老存档 localStorage 里是 `1` 启动仍为关；控制台只剩 `dshPigDev.off`；主屏显示 `v0.25.1`；第 6 次提示「再点 1 次」且未开，第 7 次开；调试页「👑 猪猪王」在 Lv40 下立绘变 `pig-king`、「恢复普通」能变回；「关闭调试」后 🔧 App 消失；刷新后仍是关、localStorage 为 `0`。
- 「疑问」里形态按钮要不要顺手把等级拉到对应阶段：等用户定，没定之前保持只改形态。

### C1 尾巴（Claude，2026-10-01）：✅ 通过
- a41a248：幼年猪点「猪猪王」直接到 Lv40 并换立绘；起始等级从 life 表读；测试齐。

### C2（Claude，2026-10-01）：⚠️ 功能通过，界面有 1 处要返工 + 1 处小修
通过的部分：c165155 无 AI 署名；`npm test` 356/356、typecheck 0、`client.js` 无差异；core 里无 `Math.random`/`Date.now`；主屏只是多了一格，原有排版没动。
自己起的隔离实例（3083，存档拷贝）实测：开 25 分钟后刷新仍显示 🍅 24:55；调试「+1 小时」后结算，金币 508→516、今日 1 个；今日已 9 个时再完成只计数不给钱；开 15 分钟后放弃，金币不变、猪说放弃台词。

要改：
1. **头顶 🍅 药丸压在面板上**（必改）。`.dp-pomo` 用 `bottom:calc(100% + 40px)` + `z-index:4`，面板打开时它正好落在面板「今天完成」那一行中间，盖住文字（你自己的 `c2-focusing.png` 里也是这样）。改成贴在猪立绘右上角的小角标（跟着猪走，不超出猪的范围上方 20px），层级低于面板，面板打开时不能盖住面板任何内容；也不能和猪的说话气泡、HUD 卡片重叠。改完补两张截图：面板打开 / 面板收起 时的专注状态。
2. **放弃前先结算**（小修）。`abandonPomodoro` 没先调 `settlePomodoro`：时间已到但还没轮询到时点「放弃」，会把一个已经完成的番茄当放弃丢掉。放弃时先结算，已经完成的就按完成处理并返回完成结果。补一条会红的测试。

---

## D1 桌面版 Windows 卡顿（插队，优先于 C4）

**现象**（用户反馈，2026-10-01）：Windows 用户开着**桌面版**猪，**浏览器**会卡（其他软件基本无感）；关掉猪就好。全屏透明置顶窗口压在浏览器上，会让浏览器的显卡直出通道（direct flip/overlay）失效、退回慢合成，所以主要是浏览器受影响。验收时也要让 Windows 用户开着猪滚动长网页，前后对比。

**Claude 排查结论**：
- 网页版猪本身不重：用真实存档隔离实例连续量 3 分钟，JS 约 1% CPU，节点/监听/内存没有增长；页面上一直在跑的动画只有一个（`.dp-pig` 的 bob/breathe，只改 transform）。
- 问题在桌面版外壳 `apps/desktop`：
  1. `main.js:105` 窗口**铺满整个工作区、透明、置顶**（`transparent:true` + `alwaysOnTop`）。Windows 上每帧都要合成一整块全屏带透明度的图层；猪一直在动，就是全屏 60fps 一直重新合成，整台机器跟着卡。Linux/X11 没这个代价，所以我们这边没发现。
  2. `renderer/shell.js` 每 120ms 量一遍猪和面板的框，变了就 `setShape`。呼吸动画会改 `getBoundingClientRect`：实测面板收起时每秒 1.7 次 `setShape`，Windows 上就是 `SetWindowRgn`，每次都会让整窗重绘。
  3. 次要：`.dp-pig` 在动的同时带 `filter: drop-shadow(...)`（`css-base.js:105/140/141`），可能每帧重算滤镜。

**修法**：
1. **窗口改小**（根治）：窗口不再铺满屏幕，只框住「猪 + 面板 + 气泡」外接矩形再留 16px 边。猪拖到哪，窗口就移到哪（`win.setBounds`，屏幕坐标）；面板打开/收起时改窗口大小。页面里的猪坐标改成相对窗口。面板往哪边展开沿用现在的规则（靠屏幕边时朝里开），由主进程按 `screen.getDisplayMatching().workArea` 算好，不能伸出屏幕。窗口改小以后 `setShape` 只在面板展开时用来抠掉空白角，或者干脆不用。
2. **不再被动画带着测**：量框时用不随动画变化的容器（`.dp-scene` 等布局框，PAD 已经盖住 9% 缩放），或者把结果取整到 4px 再比较，保证猪闲着时 `setShape`/`setBounds` 每秒 0 次。
3. `win.webContents.setFrameRate(30)`；面板收起、猪闲着时可以再降。
4. 把 `filter: drop-shadow` 从正在做动画的 `.dp-pig` 上挪到不动的外层，或者换成一个静态的阴影元素。网页版视觉不能变。
5. Linux（X11/Wayland 回退到 X11 那条路）和 macOS 行为不能退化：拖动、点穿空白处、托盘、多显示器都要还能用。

**验收**：
- 自动化：渲染层加一个测试，猪闲着 10 秒内 `setShape`/`setBounds` 调用 0 次；拖动时会跟。
- Linux 实机：窗口大小 ≈ 猪/面板外接框，用 python-xlib 查 X 树里的窗口尺寸（不能只看 `capturePage`）；空白处点击能点到桌面。
- **Windows 由用户找人实测**：发一个测试包（`dsh-piggy-portable-<版本>.exe`），同一台机器开猪前后，各看 1 分钟任务管理器里 dsh-piggy 和「桌面窗口管理器」的 CPU/GPU，记录到「验证记录」；拖动、展开面板、点穿都正常。

### D1（Claude，2026-10-01）：❌ 方向对，有 1 个确认的 bug + 1 个高风险点，改完再验
通过的部分：163c040 无 AI 署名；网页版改动都包在「检测到桌面外壳」的分支里，阴影挪到立绘上视觉等价；量框改成布局盒 + 4px 取整、`setFrameRate(30)`、窗口改小这几条思路都对；370 项测试全过。

要改：
1. **猪在屏幕上半部分时，面板整个看不见**（已确认）。外壳把猪钉在窗口右下角（`shell.js` `host.style.right/bottom = INSET`），主进程也以窗口右下角为锚往左上长（`window-geometry.js` `contentBounds`）。可 `fitPanel` 在 `room.below > room.above` 时让面板往**下**开（`top: calc(100% + gap)`），面板就落在窗口底边之外。Claude 用 Chromium 加载 `apps/desktop/renderer` + 伪造外壳复现：窗口在屏幕顶部（y=0）时，窗口高 552，面板却在 544–923，整块在窗口外；同时主进程会把窗口往下挪，猪会跳。
   修法：锚点跟着面板方向走。面板朝上开时，猪在窗口底部、锚右下角；面板朝下开时，猪在窗口顶部、锚**右上角**（窗口往下长）。横向同理：猪靠屏幕左边时锚左边、面板朝右开。原则是**展开、收起面板时，猪在屏幕上的位置一像素都不动**，收起后窗口回到原位。补几何测试：四个角各开一次、收一次，断言猪的屏幕坐标前后相等、面板完全在窗口内、窗口完全在 workArea 内。
2. **拖动用的是 `clientX`，可窗口自己在动**（高风险，没测到）。`index.js` 拖动按 `event.clientX - drag.lastX` 算增量再 `moveBy`；窗口一挪，鼠标相对窗口的坐标也跟着变，下一次算出来的增量就错了（追不上鼠标、抖、或者猪从鼠标底下溜走）。现有测试是「两次 pointermove → 两次 moveBy」，没模拟窗口真的移动，所以测不出来。改用 `event.screenX/screenY` 算增量（或者 pointerdown 时记下屏幕坐标和窗口位置，拖动时让主进程直接 `setBounds` 到「起点 + 鼠标屏幕位移」），同时检查 `shell.js` 的 `moveChannel` 和 `index.js` 不要两边都发 moveBy。**必须在 X11 实机上真的拖一次**：拖 300px，用 python-xlib 读拖之前/之后的窗口位置，差值误差在 4px 以内；来回拖 5 次，猪不能离开鼠标。
3. 这次的 X11 实测只有「收起」「朝上展开」两种情况，返工后要补「猪在屏幕左上角展开」「拖动」两项实测，数据写进验证记录。

Windows 测试包：走 CI 推标签的方式，需要用户批准，等上面两条修完再说。
