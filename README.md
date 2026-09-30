# dsh-piggy 🐖

> 包名是 `dsh-piggy`（npm 上的 `dsh-pig` 已被一个无关的包占用）。
> 插件在运行时注册的名字、它的 HTTP 路由 `/dsh-pig/`、以及存档目录
> `$DSH_HOME/dsh-pig/` 都保留了 `dsh-pig` —— **存档路径尤其不能动，
> 那是你正在养的那只猪**。

一只住在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 里的猪。

它吃你的**真实工作**长大，会**上课学习**、**出门打工**、**出去旅行带纪念品**，
会**饿会脏会生病**，病了得**对症下药**，撑不住会**死**——但用**还魂丹**能救回来。

玩法参考经典电子宠物：喂食 / 洗澡 / 玩耍 / 打工 / 上课 / 旅行 / 生病。
数值与命名参考了两份公开资料 ——
[xuemian168/qqpet_automation](https://github.com/xuemian168/qqpet_automation)（逆向分析）
与 [ice-cream-headache.github.io](https://github.com/ice-cream-headache/ice-cream-headache.github.io)（界面截图）。
**没有使用任何原版代码或美术资源**，详见 [THIRD-PARTY.md](THIRD-PARTY.md)。

- **六个图标的面板** —— 状态 / 学习 / 打工 / 商店 / 旅行 / 背包，**不用敲命令**
- **零 token** —— 不注册模型工具、不注入上下文，模型不知道它存在
- **零运行时 npm 依赖** —— 纯 JS；客户端源码开发使用 esbuild 打包，类型检查使用 TypeScript（见下方开发说明）

---

## 安装

```sh
dsh plugin --profile web add /path/to/dsh-pig
```

装完**重启 dsh**（宿主半边在启动时注册命令与路由），然后刷新页面。

## 界面

平时就是一只**透明背景的 🐖** 浮在右下角。点它，面板从**上方**展开：

```
┌──────────────────────────────┐
│ 🍚 饱食 ▓▓▓▓▓▓░░░░ 62%        │  ← 内容区（带标签的属性条）
│ ❤️ 心情 ▓▓▓▓▓▓▓░░░ 74%        │
│ 🫧 清洁 ▓▓▓░░░░░░░ 41%        │
│ 💚 健康 ▓▓▓▓▓▓▓▓░░ 4/5        │
│ 🧠 智力 5  ✨ 魅力 3  💪 武力 2 │
│ [🍎喂食][🛁洗澡][🎾玩耍][❤️摸摸] │
├──────────────────────────────┤
│ 📋  📚  💼  🛒  🧳  🎒        │  ← 六个图标
│ 状态 学习 打工 商店 旅行 背包  │
└──────────────────────────────┘
  ┌─────────┐  ┌───────┐
  │猪猪 Lv.3│  │好舒服…│          ← 状态 + 气泡（浅色胶囊）
  │🪙 60    │  └───────┘
  │💚 4/5   │
  └─────────┘
              🐖                  ← 猪固定在这里，永远不动
```

**猪是面板的兄弟节点，不是子节点。**

```
host [data-dsh-pig]   ← 固定在右下角
├── .dp-card   面板（收起时整体隐藏）
└── .dp-scene  猪（永远在最底部）
```

所以展开时**面板只能向上生长，猪一个像素都不移动** —— 不管窗口多矮。
（曾经不是这样：猪在面板内部，展开时被顶到 452px 卡片的顶端，400px 高的窗口里
直接飞出屏幕上边缘。实测 `top: -24`，只剩两只脚。）

| 交互 | 结果 |
|---|---|
| **右键猪** | 收起 ↔ 展开菜单 |
| **左键猪** | 摸摸（专属动画 + ❤️），不会开关菜单 |
| 拖动 | 移动位置（记住） |
| 点图标 | 切换内容区 |

菜单**永远不会超出页面**：它默认开在猪的上方，上方空间不够时自动翻到下方；
靠窗口左边停放时会自动平移回来。而且**菜单出现不会移动猪**（面板脱离文档流，
外层容器的尺寸只由猪决定）。

拖动只受一个限制：别把猪推出窗口。**包括输入框旁边 —— 随便放。**

## 视觉：动森风格

配色、圆角、边框、阴影、动效全部照
[guokaigdg/animal-island-ui](https://github.com/guokaigdg/animal-island-ui)
的 `docs/design-system` 实现（那个项目把规范单独成套，其中 `css-variables.md`
就是给"不装库也复刻这套风格"用的）。

| | |
|---|---|
| 奶油羊皮纸底 | `#f8f8f0` 面板 · `rgb(247,243,223)` 图标栏 · `#fffbe7` 按钮 |
| 暖棕文字 | `#794f27` 标题 · `#725d42` 正文 · `#9f927d` 次要 |
| 2px 暖棕边框 | `#e5dcc6` 常态 · `#a89878` 悬停 |
| 薄荷青主色 | `#19c8b9`，主按钮带 `0 3px 0` **游戏 3D 底边** |
| 淡紫选中态 | `#b7c6e5`（取它的侧边栏 token） |
| 属性条配色 | 饱食 `#f7cd67` · 心情 `#f8a6b2` · 清洁 `#82d5bb` · 健康 `#8ac68a` |
| 圆体 | Nunito + Noto Sans SC（Google Fonts，离线自动回退系统字体） |

规范里的硬规则也照做了：卡片**用边框而不是投影**表达层次、厚 3D 底边**只给主按钮**
（全加会"太重、太游戏化"）、**禁止纯黑文字与冷灰背景**、焦点环用青/黄不用蓝、
过渡统一 `cubic-bezier(.4,0,.2,1)` 且 0.15–0.35s。

> token 声明在组件根节点而**不是 `:root`** —— 宿主页面的自定义属性既不该被污染，
> 也不该能反过来覆盖这里。

## 六个图标

### 📋 状态
四条带标签的属性条 + 智魅武三维 + 体重/金币/经验，以及四个照顾按钮。

**喂食 / 洗澡 / 玩耍都要花道具**（背包按
`food` / `commodity` / `medicine` 三类分）。点按钮会**弹出背包**，
告诉你有什么、还剩几个、每样加多少：

```
喂点什么？
 🍎 苹果 ×2      饱食 +22 · 心情 +3    [用]
 🍖 肉骨头 ×1    饱食 +45 · 心情 +8    [用]
 [算了]
```

| 按钮 | 消耗 | 冷却 |
|---|---|---|
| 🍎 喂食 | 一件**食物** | 60 秒 |
| 🛁 洗澡 | 一件**洗浴用品** | 90 秒 |
| 🎾 玩耍 | 一件**玩具**（`🎾 小皮球` 自带、免费、永不消耗） | 45 秒 |
| ❤️ 摸摸 | 什么都不花 | 无 |

背包里没有对应道具时，动作会被明确拒绝并说明原因 —— 不会静默失败。

### 📚 学习
**9 门课 × 3 学段**（照原版 `img_res/study/` 的 `xx-` / `dx-` / `yjs-`）。

**学校是阶梯，不是菜单** —— 所有宠物都从小学起步：

| 学段 | 时长 | 学费 | 属性 | 解锁条件 |
|---|---|---|---|---|
| 小学 | 30 分钟 | 40 金币 | +1 | 无 |
| 大学 | 2 小时 | 220 金币 | +2 | **小学九门课各上一次** |
| 研究生 | 6 小时 | 900 金币 | +4 | **大学九门课各上一次** |

锁住的学段**可以点进去看**还差多少（`🔒 要先念完小学九门课各上一次（3/9）`），
只是里面的课点不了。老存档已有的课时会算作小学课时。

九门课：

| 科目 | 涨什么 |
|---|---|
| 📖 语文 · 🔢 数学 · ⚖️ 政治 | 🧠 智力 |
| 🎨 美术 · 🎵 音乐 · 🎩 礼仪 | ✨ 魅力 |
| 🏃 体育 · 🥋 武术 · 🧺 劳动 | 💪 武力 |


### 💼 打工
| 工作 | 时长 | 报酬 |
|---|---|---|
| 🧹 打零工 | 15 分钟 | 30 金币 |
| 🧱 搬砖 | 1 小时 | 160 金币 |
| 💼 上班 | 4 小时 | 900 金币 |

### 🛒 商店
| 货架 | 商品 |
|---|---|
| 🍎 食物 | 苹果(6) · 肉骨头(15) · 奶油蛋糕(40) |
| 🧼 洗浴 | 香皂(6) · 沐浴露(12) · 泡泡浴(28) |
| 🪀 玩具 | 小皮球(**自带免费**) · 悠悠球(30) · 布偶(75) · 旋转木马(260) |
| 💊 药品 | 普通药(12) · 特效药(26) · 进口药(52) · 秘方药(95) |
| ✨ 复活 | 还魂丹(150) |

生病时，**需要的那味药会在商店和背包里高亮标注**。

### 🧳 旅行
| 目的地 | 时长 | 花费 | 心情 |
|---|---|---|---|
| 🏞 郊游 | 1 小时 | 60 金币 | +10 |
| 🏔 名山大川 | 3 小时 | 200 金币 | +16 |
| 🌊 看海 | 8 小时 | 620 金币 | +24 |
| 🌍 出国 | 1 天 | 2000 金币 | +38 |

每趟带回一件**纪念品**进收藏册（每个目的地 3 种，轮换发放保证都能收集到）。

### 🎒 背包
买到的东西在这里使用。药品必须**对症**；还魂丹只在死后可用。

## 外出时的样子

猪出去打工 / 上学 / 旅行时不再只是原地站着 —— 场景里会多出它正在用的东西，
猪也有各自的姿势，进度条告诉你还要多久：

| 活动 | 猪 | 道具 |
|---|---|---|
| 💼 打工 | 打字的小幅抖动 | 💻 上班 · 🧹 打零工 · 🧱 搬砖 |
| 📚 学习 | 慢速歪头，像在看书 | 📖 语文 · 🔢 数学 · 🎵 音乐 … |
| 🧳 旅行 | 走路的弹跳 | 🌊 看海 · 🏔 名山 · 🏞 郊游 … |

道具在猪的**左边**、场景向左扩，所以猪自己不会移动。

## 数值节奏

衰减按活动时长重新标定过（活动是小时级的，不是分钟级的）：

| | 每分钟 |
|---|---|
| 饱食 | 0.08 |
| 心情 | 0.06 |
| 清洁 | 0.07 |
| 在外 | ×1.4 |

实测净消耗：打零工 15 分钟几乎无感（92/95/99）· 搬砖 1 小时（77/80/95）·
上班 4 小时（39/50/80，两顿饭一次澡回本）· 看海 8 小时（15/53/60）·
出国 1 天（15/15/15）—— **任何活动都不会把任何一条清零**（下限 15），
而且**在外不会生病**，猪回来是饿，等着你喂它。

## 生病与死亡

**饿着或脏着太久**（饱食 <25 或 清洁 <30 累计 12 分钟）就会得病。三条疾病链，各四期：

| 链 | 一期 | 二期 | 三期 | 四期 |
|---|---|---|---|---|
| 🤧 | 感冒 | 发烧 | 重感冒 | 肺炎 |
| 😷 | 咳嗽 | 支气管炎 | 哮喘 | 肺结核 |
| 🤢 | 肚子胀 | 胃炎 | 胃溃疡 | 胃癌 |

- 每期占用**一点健康**（上限 **5**，和原版一致）
- 不治每 **25 分钟**加重一期
- **必须吃对应的药**（一期普通药，四期秘方药），吃错无效也不消耗
- **健康归零就是死** —— 但**等级、经验、金币、纪念品全部保留**，
  用 **✨ 还魂丹**救回来

## 外出期间

打工 / 上课 / 旅行共用一个"不在家"状态：

- **不能喂食洗澡**（但可以摸摸）
- **消耗 ×1.8**
- 随时可以「叫它回来」：**打工白跑没钱**，**学习和旅行退款**

## 数值体系

| | QQ 宠物 | 本插件 |
|---|---|---|
| 饥饿 | 上限 3100，<720 报警 | 饱食 0-100，<25 报警 |
| 清洁 | 上限 3100，<1080 报警 | 清洁 0-100，<35 报警 |
| 心情 | 上限 1000，<100 报警 | 心情 0-100，<35 报警 |
| 健康 | **5**（0 = 死亡） | **5**（原样） |
| 喂食/洗澡/逗玩 | +1000 / +1000 / +100 | +22 / +50 / +16 |

## 一生

猪不是一条经验条，而是一段**按天数计的生命**：

| 阶段 | 形象 | 大小 | 什么时候 |
|---|---|---|---|
| 纸盒 | 📦 | 54px | 一开始就放在那儿 |
| 小猪 | 🐖 手绘 | 40px | 拆开纸盒，蹦出来 |
| 青年猪 | 🐖 | 50px | 第 1 天 |
| 中年猪 | 🐖 | 62px | 第 3 天 |
| 老年猪 | 🐖 手绘 | 56px | 第 7 天 |
| 墓碑 | 🪦 | 54px | 第 14 天自然老去，或病死 |
| 墓碑 + 👻 | | | 死后 1 天还没人管它 |

**年龄按真实时间走** —— 关掉 DSH 期间猪照样在长大，回来时它老了一天。

![一生（早期版本界面示意）](docs/screenshots/15-life-stages.png)

所有阶段都是同一只 🐖，靠**体型**区分；小猪和老年猪另外有两张手绘形象
（[`assets/piglet.svg`](assets/piglet.svg) / [`assets/elder.svg`](assets/elder.svg)，
由插件自己的 `/dsh-pig/art/` 路由伺服）。看形象对照：
`xdg-open tools/art.html`。

**XP 不再是等级，改喂体重** —— 「吃你的真实工作长大」还在，长的是分量。

### 死了之后

墓碑立起来，你有两条路：

- **还魂丹**（150 金币）把它叫回来 —— 金币、收藏、上过的课都保留
- **领养新猪** —— 从新的纸盒开始，旧猪的回忆留在记忆里

两条都不选，一天之后墓碑上会多一个 👻。

## 存档

`$DSH_HOME/dsh-pig/state.json`

**原子写**（临时文件 → fsync → rename）+ 1.5 秒节流。存档版本 **v4**，旧存档自动迁移。

**打工、上课、旅行、疾病、衰减全部基于时间戳惰性结算** —— 没有任何定时器。
所以关掉 DSH 期间猪照样在饿、班照样会打完、病照样会加重，重开时一次性结清并弹公告。

## 配置

```yaml
- id: dsh-pig
  name: dsh-pig
  config:
    command: pig                              # 改斜杠命令名
    statePath: /abs/path/to/state.json        # 改存档位置
```

## HTTP 接口

```
GET  /dsh-pig/state   完整快照
POST /dsh-pig/act     执行操作
```

操作白名单：`hatch` · `feed` · `bathe` · `play` · `pet` · `work` · `study` · `trip` · `calloff` · `buy` · `use`
请求体上限 2 KB。状态响应**不含任务标题**。

> ⚠️ 插件通过 `ctx.webServer.register()` 注册的路由**不走主应用的鉴权围栏**
> （DSH 既有行为，whale-girl 等插件同样如此）。服务只绑 `127.0.0.1`，
> 但本机其他进程能读到这些数字，也能触发操作。

## 命令（不想点鼠标时才用）

```
/pig                                   状态卡
/pig hatch                             孵一只
/pig feed | bathe | play | pet         照顾
/pig study <科目> <小学|大学|研究生>     上课
/pig work <odd|site|office>            打工      /pig trip <suburb|mountain|sea|abroad>  旅行
/pig calloff                           叫回来
/pig shop                              看货架    /pig buy <物品>   /pig use <物品>
/pig weigh | name <名字> | about
```

## 项目结构

```text
dsh-piggy/
├── package.json          插件清单与 build / typecheck / test 脚本
├── cordis.patch.yml      profile 配置层
├── data.js / data/       静态游戏表与常量；data.js 保留导出入口
├── core.js / core/       纯领域函数；时间由 nowMs 参数传入
├── store.js / store/     存档读写、原子写与节流
├── index.js              宿主组装入口
├── snapshot.js           面板快照
├── commands.js           /pig 命令
├── routes.js             HTTP 路由
├── render.js             文案与 ASCII 立绘
├── src/client/           客户端源码：场景、交互、样式与 tabs/*
├── client.js             生成的单文件客户端产物，随仓库提交
├── scripts/
│   ├── build-client.mjs   esbuild 打包入口
│   └── typecheck.mjs      JavaScript 类型检查入口
├── test/                 游戏逻辑、宿主、客户端、存档、构建与规范检查
├── tools/                preview.html / art.html 等浏览器预览台
├── assets/               SVG 立绘
├── docs/                 设计、编码规范、美术需求与开发记录
├── CHANGELOG.md          版本变更历史
├── THIRD-PARTY.md        第三方致谢与许可
└── LICENSE              MIT
```

## 从源码开发

需要 **Node.js ≥20**（自带 npm）、Git 和浏览器。运行已提交的插件产物无需开发工具；
**构建源码和运行完整检查**需要 esbuild、TypeScript 与 Node 类型定义。
仓库的 `package.json` 当前没有声明这些开发依赖，单独克隆时先在本地安装：

```sh
git -c core.autocrlf=false clone https://github.com/CLICGGER-TYPES/dsh-piggy.git
cd dsh-piggy
npm install --no-save --package-lock=false esbuild@0.28.2 typescript@5.9.3 @types/node@20
npm run build
npm run typecheck
node --test
```

准备贡献时，先 Fork，再把 clone 的地址换成自己的 Fork。
`core.autocrlf=false` 让此次克隆保留仓库的 LF 换行；构建产物守卫逐字节比较
`client.js`，Windows 自动转换成 CRLF 会影响这个检查。
`--no-save --package-lock=false` 只安装本地工具，不修改依赖清单、不生成锁文件；
`node_modules/` 已被 Git 忽略。

上面的版本组合已经验证可构建和检查。这里固定 TypeScript 5.9.3：
当前检查脚本没有显式指定 `strict`，而 [TypeScript 6.0 起默认启用 strict](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html#strict-is-now-true-by-default)，
直接安装新版会产生额外类型错误。升级检查工具应另行验证。

- **客户端**：修改 `src/client/`，运行 `npm run build`，提交生成的 `client.js`。
  不要直接编辑 `client.js`；DSH 加载它，`test/bundle.test.js` 检查它与源码一致。
- **游戏逻辑与数据**：修改 `core/` 或 `data/`；存档相关代码在 `store/`。
  领域层保持无 IO，时间必须由参数传入。
- **提交前**：运行 `npm run typecheck` 和 `node --test`。
  UI 改动还要在真实浏览器中确认；约定见 [docs/CONVENTIONS.md](docs/CONVENTIONS.md)。

提示 `esbuild not found` 或 `no tsc found` 时，确认已在仓库根目录执行工具安装命令。
也可通过 `DSH_PIG_ESBUILD`、`DSH_PIG_TSC`、`DSH_PIG_TYPES` 指向已有工具；
具体解析规则见 `scripts/`。

## 看界面（不用连宿主）

直接用浏览器打开 `tools/preview.html` 即可；仓库已包含 `client.js`，
只看现有界面无需安装开发工具。修改客户端源码后，先重新构建再刷新预览页。

Linux：

```sh
xdg-open tools/preview.html
```

Windows 的操作见下一节。预览台伪造 `window.__ModuleLoader__` 和 `fetch`，
不启动 DSH 就能看到面板与六个页签。它使用示例快照：
**预览中的操作不会验证真实宿主的金币扣除、活动结算或存档读写**。

浏览器开发者工具的 Console 中可以使用：

```js
window.pigStub.setOpen(true)   // 展开；false 收起
window.pigStub.tab('study')    // 切到学习页
window.pigStub.state()        // 查看当前布局
window.dshPigDev.on()         // 开启开发者面板；off() 关闭
```

`tools/art.html` 可查看立绘，`tools/stages.html` 可查看生命周期形态示意。
这些预览页使用示例数据，当前阶段与数值以 `data/` 和实际宿主快照为准。

> 假 DOM 没有 CSS 引擎。曾经出现过 JS 正确设置 `hidden = true`、测试通过，
> 浏览器却仍显示图标栏的情况。**断言标志位证明不了元素不可见**，要在真实浏览器确认。

## Windows 入门（PowerShell）

先安装 Git 与 Node.js ≥20，重新打开 PowerShell，在希望保存项目的目录执行：

```powershell
git --version
node --version
npm.cmd --version
git -c core.autocrlf=false clone https://github.com/CLICGGER-TYPES/dsh-piggy.git
Set-Location .\dsh-piggy
```

`npm.cmd` 调用 npm 的 Windows 命令入口，避免 PowerShell 把 `npm` 解析成
`npm.ps1` 后因执行策略被拒绝；无需修改系统执行策略。
如果已按上一节克隆，进入那个目录即可，不用重复 clone。

只看界面，用默认浏览器打开：

```powershell
Start-Process -FilePath (Resolve-Path .\tools\preview.html).Path
Start-Process -FilePath (Resolve-Path .\tools\art.html).Path
```

准备改源码时，在仓库根目录安装开发工具并检查：

```powershell
npm.cmd install --no-save --package-lock=false esbuild@0.28.2 typescript@5.9.3 @types/node@20
npm.cmd run build
npm.cmd run typecheck
node --test
```

如果已安装 DSH CLI，且 `dsh` 在 PATH 中，可把本地仓库加入 **web profile**：

```powershell
dsh plugin --profile web add (Resolve-Path .).Path
```

安装后重启对应的 DSH 宿主，再刷新页面。**web 与 desktop 是不同 profile**；
这里的命令只针对 web，不代表 DSH Desktop 的安装步骤。
源码改完、构建完成后也要重启真实宿主，才能重新组装客户端 bundle；
开发者面板可以查看宿主快照中的构建版本。

## 文档

- [CHANGELOG.md](CHANGELOG.md) —— 版本变更历史
- [docs/CONVENTIONS.md](docs/CONVENTIONS.md) —— 编码、验证与提交规范
- [docs/REFACTOR-PLAN.md](docs/REFACTOR-PLAN.md) —— 源码分层与构建说明
- [docs/DESIGN.md](docs/DESIGN.md) —— 为什么是这样：参考调研、数值映射、架构决策
- [docs/PROCESS.md](docs/PROCESS.md) —— 怎么变成这样：每一轮反馈、每个 bug、每条验证证据

## 许可

MIT。数值与部分名称参考自公开的逆向资料，**未包含任何原版代码或美术资源**；
立绘是作者提供的原创矢量图。QQ 宠物是腾讯的商标，本插件与其无任何关联、
亦未获其授权。第三方致谢与许可见 [THIRD-PARTY.md](THIRD-PARTY.md)。
