# 编码规范（项目版）

这份是通用规范在本项目的落地版。**通用规范是参考，这里才是执行标准**；两者冲突时以本文件为准。

项目的性质决定了三处偏离通用规范，都写明了理由：

| 通用规范 | 本项目 | 为什么 |
|---|---|---|
| 文件 ≤ 约 400 行 | 源码遵守；**构建产物豁免** | `client.js` 是 esbuild 产物，行数由源码决定 |
| 注释/标识符/日志不用 emoji | 代码里不用；**游戏数据、界面文案、CHANGELOG、README 保留** | 这个项目就是用 emoji 做的，`data/` 里的 emoji 是内容不是装饰 |
| 不引入构建步骤 | **允许**，且只用于客户端插件 | DSH 的客户端插件按 classic `<script src>` 加载，不打包就没法拆文件 |

## 分层

依赖只能从外向内：`data/` → `core/` → `store/` → 组装层 → `src/client/`。

| 目录 | 职责 | 禁止 |
|---|---|---|
| `data/` | 静态数值表、常量 | 逻辑、IO、`Date.now()` |
| `core/` | 纯领域函数：`(state, ..., nowMs) => result` | 读写文件、发请求、操作 DOM、自己取时间 |
| `store/` | 存档读写、原子写、迁移 | 业务规则 |
| `index.js` `snapshot.js` `commands.js` `routes.js` | 组装：注册路由/命令、把状态序列化成面板用的形状 | 堆积业务规则 |
| `src/client/` | 渲染与交互 | 自己重算业务规则（只读快照字段） |

- 时间是外部输入，**必须作为参数传进 `core/`**；随机数同理。
- 数值集中在 `data/`，不许在逻辑里写裸数字。
- 文件超过 400 行、或开始承担第二种职责，就拆。

## 命名

- 变量/函数 `camelCase`，类/类型 `PascalCase`，常量 `UPPER_SNAKE_CASE`，**新文件名 kebab-case**。
- 布尔值 `is`/`has`/`can`/`should` 开头；函数名用动词短语。
- 同一概念全项目同一个词：一律用 `fetch`，不要混 `get`/`retrieve`。
- 不用单字母变量（循环下标除外）；不用自造缩写（`id`/`url` 除外）。

## 函数

- ≤ 40 行、≤ 3 个参数（超出改对象参数）、嵌套 ≤ 3 层，优先 early return。
- 纯函数优先：返回新对象，不改入参。
- 有副作用的函数名字里体现：`writeStateFile`、`registerRoutes`。
- 数值计算处理边界：不留负数、`NaN`、越界。

## 类型

- Node 侧与客户端源码**每个文件开头 `// @ts-check`**，导出函数写 JSDoc（参数 + 返回）。
- 核心数据结构用 `@typedef` 统一定义，优先放 `core/types.js`。
- 外部输入（`state.json`、请求体、DOM 快照）先当 `unknown`，校验后再用。
- **不引入 TypeScript 编译**；用 `npm run typecheck`（`tsc --noEmit --allowJs --checkJs`）检查，源码首行写 `// @ts-check`。
- 当前 `noImplicitAny` 关着：先抓"属性不存在、参数类型不对"这类真错误，等 JSDoc 补齐再逐级收紧（脚本里有注释说明）。

## 错误处理

- 禁止空 `catch`，禁止 `catch { return false }` 这种吞错。
- 错误信息带上下文与关键参数：`buy failed: item="apple" coins=3 price=6`。
- 分开两类：
  - **业务拒绝**（余额不足、条件不满足）：返回 `{ ok: false, reason }`，不抛异常。
  - **系统异常**（文件损坏、写入失败）：记录日志 + **保留现场**（`.bak`），绝不静默覆盖或丢弃用户数据。

## 数据与兼容性

- 持久化数据带 `STATE_VERSION`；结构一变就加迁移函数 + 迁移测试。
- 旧存档必须能自动迁移，不丢数据。
- 写文件原子化：临时文件 → `fsync` → `rename`（`store/state-file.js`）。
- **产物新鲜度**：`client.js` 必须与 `src/client/` 一致，由 `test/bundle.test.js` 守住。

## 测试

- 修 bug 先写能复现的失败测试，再修代码。
- 新逻辑覆盖正常路径 + 边界（空值、0、上限、极端时间跨度）。
- 测试不依赖真实时钟、网络、执行顺序。
- **UI 改动必须在真实浏览器确认**（`tools/preview.html` + `dshPigDev.on()`），测试通过 ≠ 显示正确。
- 提交前 `node --test` 全绿。

## 注释

- 只解释"为什么"，不重复"是什么"；公共函数写文档注释。
- 代码标识符、注释、日志、提交信息不用 emoji；界面文案与 `data/` 游戏数据不受限。
- `TODO` / `FIXME` 带日期和原因。

## Git

- Conventional Commits：`<type>(<scope>): <描述>`，type 用 `feat|fix|refactor|test|docs|style|perf|chore`，scope 固定 `pig`。
- **每个提交只做一件事**，重构与功能不混提。
- 版本号与 CHANGELOG 更新放在 `chore(pig): 发布 x.y.z` 或对应功能提交的 body 里，不再写进标题。
- 用户能感知的变化必须更新 `CHANGELOG.md`。
- 不提交本机绝对路径、临时文件、无关文件。
