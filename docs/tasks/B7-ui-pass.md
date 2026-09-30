# B7 界面：折叠列表与体验修复

**谁做**：DSH agent（2026-10-01）。**状态**：已做完并合入 main（`0a767af`）。**来源**：用户在真机上体验后给的七条反馈，不是规划内的批次。
**前置**：B1、B5 已合入 main（`5bd4d68`）。

**给 Claude 的交接要点（先看这个）**

1. **客户端现在只有一个上下文对象**：原来 `ui`（给页签）和 `ctx`（给 panel/layout/io）是两份
   几乎相同的 getter/setter。`index.js` 因为新状态涨到 401 行触发行数守卫，顺势把 `ui` 并进了
   `ctx` —— 页签收到的就是 `ctx`，**参数名仍叫 `ui`，所以页签里的 `ui.xxx` 一行都没改**。
   如果你手上有基于 `ctx.ui` 的改动，改成 `ctx` 即可。
2. **客户端导航状态**（都是 `ctx` 上的 getter/setter）：学习 `stage`(null=学段层) / `studyCourse`(第三层)、
   商店 `shopKind`、背包 `bagSection` / `bagEntry`、改名 `ownerEdit` / `pigNameEdit`。
   **`stagePicked` 已删**：学段不再有「自动归位」，第一层本来就是学段方块，没有"默认停在锁住学段"这回事了。
3. **本卡没有动 `packages/pet-core/`**（一行都没动），只动客户端、`routes.js` 和测试 ——
   和 B2/B3/B4 的核心规则不会冲突。
4. `test/host.test.js` 里那条「忽略两天会生病」原本是随机游走（病会自愈再复发），约 40% 的
   运行是红的；我给它加了固定 `seed`。如果你在改疾病概率，记得同步这条。
5. 新的复用组件：`src/client/widgets.js` 的 `tile(spec)` / `tileGrid()` / `backRow(text, onBack)` ——
   两级方块导航就用这三个，以后加页签别再手写网格和返回。
6. 旧的 `.dp-cell*` / `.dp-shopgrid` / `.dp-section*` 样式已全部删除。注意：`.dp-cell` 原来
   **横跨两个文件**（`css-base.js` 数组的结尾 + `css-tabs.js` 数组的开头拼成一条规则），改样式时
   别只删一半，否则整张表会不平衡。

---

## 1. 点猪会"切换位置再回去"（自己埋的雷）

- **现象**：左键点猪，猪横着跳半个身位，动画结束跳回来。
- **根因**：B5 给签到气泡起的 `@keyframes dp-bob` 和猪的待机动画（`css-base.js`）**重名**；
  `css-tabs.js` 排在后面，于是猪的待机 `transform` 被换成 `translateX(-50%)`。反应动画
  （`dp-squash` 等）一覆盖 transform，猪就"归位"，播完又回偏移位。
- [x] 气泡动画改名 `dp-daily-bob`
- [x] 合并重复的 `dp-squash`（基础里那份被覆盖，删掉）
- [x] 守卫：整张样式表里 `@keyframes` 不许重名；猪的待机动画不许 `translateX`
- 文件：`src/client/css-base.js`、`src/client/css-tabs.js`、`test/client.test.js`

## 2. 打工详情字体比周围大一倍

- **现象**：详情框里的字明显大于面板其它文字，看着不统一。
- **根因**：`.dp-card` / `.dp-content` 都没设 `font-size`，没写字号的容器（`.dp-pick`：
  打工详情、道具选择器）继承了宿主页面的 **16px**，周围是 10–11px。
- [x] `.dp-card` 钉住基准：`font-family:var(--ac-font)` + `font-size:11px`
- [x] `.dp-pick` 明确 `10.5px`
- [x] 守卫：面板根必须有 1x px 的基准字号，`.dp-pick` 必须显式写字号
- 文件：`src/client/css-base.js`、`src/client/css-tabs.js`
- 浏览器实测：`.dp-card` 11px、详情框 10.5px、列表行 11px

## 3.（+#7）学习 / 商店 / 背包：动森手游那种方块网格

- **用户原话**：像动森的手机那样，一块一块的小方块，点开里面有不同内容；小学中学大学研究生
  就是那些小块，点开看到更多小方块；商店背包同理。
- **第一版做错了**：我做成了「一行文字标题 + 折叠展开」，用户指出不是这个意思。现在是**整屏替换**
  的两三层方块导航，左上角「← 返回」。
- [x] 共用组件：`tile(spec)`（emoji + 名字 + 右上角角标 + 左上角标签 + note 一行）、
      `tileGrid()`（3 列）、`backRow(text, onBack)`
- [x] 学习三层：学段方块（角标=课时区间如 `10-20`，note=学费；锁住的加 🔒 与进度）
      → 课程方块（角标=本段已上节数 / ✓ / 🔒，note=属性）→ 课程详情卡（课时/学费/加成 + 「去上课」）
- [x] 商店两层：货架方块（角标=件数，note=N 件可买）→ 货物方块（角标=×数量，note=价格或「已拥有」，
      需要/穿着走左上角标签）；点货物方块就是买
- [x] 背包两层：大类方块（道具按种类 + 家当 + 日记 + 纪念品）→ 里面的方块；
      **点道具方块=使用、点家当方块=穿上/脱下**；日记→日期方块→整篇；纪念品→收藏方块→故事卡
- [x] 删掉第一版的 `.dp-section` 折叠样式与 `openSection` 状态
- 文件：`src/client/widgets.js`、`src/client/tabs/{study,shop,bag}.js`、`src/client/css-tabs.js`、
  `src/client/css-base.js`、`src/client/index.js`
- 浏览器实测（`tools/preview.html`）：学习 `1-3 🧸幼儿园 20🪙 … 96-120 🔒🔬研究生 0/9` →
  点小学出 23 个课程方块 → 点「认字」出详情与「去上课」；商店 6 个货架 → 点食物出 10 个货物方块；
  背包 6 个大类 → 点食物出道具方块

## 4. 签到气泡贴着猪

- **现象**：折叠状态下 📅 压在猪身上。
- **根因**：`top:-6px` 是相对**场景**顶边，而折叠时场景就是猪本身 —— 实测重叠 24px。
- [x] 改成挂在场景上方：`bottom:calc(100% + 7px)`；折叠态再多让 16px（猪自己浮动 ±7px）
- [x] 守卫：不许用 `top` 定位、间距 ≥4px（折叠 ≥12px）
- 浏览器实测：折叠时间距 9–16px（原来 -24px）
- 文件：`src/client/css-tabs.js`

## 5. 学习页选中的学段被轮询顶回小学

- **现象**：点一个还没解锁的学段，往下滑，几秒后自己跳回小学。
- **根因**：B1 的「默认学段防呆」写在每次 `render()` 里，4 秒一次的轮询会替用户改选择。
- [x] 新增 `stagePicked`：用户点过学段/兴趣之后，防呆不再生效（仍保留"从没选过时"的兜底）
- [x] 测试顺手补了假 DOM 的 `textContent` 语义（赋值要替换子节点），否则重绘后旧节点还在
  树上，断言会读到陈旧的那个
- 文件：`src/client/index.js`、`src/client/panel.js`、`src/client/tabs/study.js`

## 6. 面板里能改猪的名字；昵称不再印出来

- **现象**：状态页一行「🙋 叫你『大爹』」加一个「改」；只能改主人称呼，不能改猪名。
- [x] 改成两个按钮：「✏️ 称呼」（`owner` 动作）与「✏️ 名字」（新的 `name` 动作，
  和斜杠命令 `/pig name` 同一条路）
- [x] 编辑期间冻结轮询（和原来改称呼一样），输入框不丢焦点；`pigNameEdit` 与 `ownerEdit` 共用一个输入行
- [x] 昵称不再出现在面板上，改为按钮 `title` 里的提示
- 文件：`src/client/tabs/status.js`、`src/client/panel.js`、`src/client/index.js`、`routes.js`

## 7. 删掉解释性废话

- [x] 纸盒：「拆开就会蹦出一只小猪 —— 不用敲命令」整行删掉（按钮已经说明）
- [x] 生病：两段长说明压成「带病出门报酬减半、病情更快」与「还差 N 🪙 买「药」，先去打工」
      （保留了药名 —— 报对药是 B3 的硬要求）
- [x] 墓碑：「用还魂丹可以把它叫回来，也可以领养新的」/「背包里的还魂丹就能救回来」
- [x] 背包/家当空态只说一句
- 文件：`src/client/panel.js`、`src/client/tabs/bag.js`

## 顺带

- [x] 修一条随机测试：`test/host.test.js` 的「忽略两天会生病」加固定 `seed`（原来 ~40% 会红）
- [x] `CHANGELOG.md` 新增一节「界面：折叠列表与体验修复」

## 不在本卡

- 学段方块现在是第一层入口（原来顶部那一排文字按钮已经去掉）。
- 日记接 DeepSeek（B5 卡里写明以后单独加开关）。

## 验证记录

**2026-10-01 · DSH agent**

- `npm run build && npm test`：**283 / 283 通过**（本卡开工前 277；新增 6 条守卫与流程测试，
  方块重构改写了 12 条老测试的导航方式）
- `npm run typecheck`：**0 错误**
- 提交：`b84a481` 点猪横跳 · `c2707ea` 固定种子 · `142d52d` 学段不被抢 ·
  `4d18224` 字号统一 · `3d59d6d` 气泡位置 · `e8c75c4` 折叠列表（**已被方块版取代**） ·
  `03b02a3` 改名与删废话 · `0a767af` CHANGELOG · 方块重构见本轮提交
- 界面验证：全部在 `tools/preview.html` 里点过（商店/学习/背包展开收起、改名输入框、
  气泡位置、字号），气泡与猪的位置用 `getBoundingClientRect()` 量过
- **截图仍然存不下来**：chrome-devtools MCP 的 `take_screenshot(filePath)` 拒绝所有目标路径
  （和 B1/B5 卡同一个限制），只能给内联图
