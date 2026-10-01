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

## 疑问（数值/规则觉得不合理写这里，等用户定）

## 验收意见（Claude 写）
