# 任务卡

总规划：复刻 QQ 宠物 70-80% 的单机玩法，社区以后做。分工：

| 谁 | 做什么 |
|---|---|
| Claude | 框架（批次 0）、任务卡、数值确认单、每批验收 review |
| DSH agent | 按卡执行：修 bug、填数据表、写页签 UI、补测试 |
| 用户 | 确认每批的数值单，在真实 DSH 里体验 |

## 批次一览

| 卡 | 内容 | 前置 | 状态 |
|---|---|---|---|
| B0 | 框架：pet-core 库、分段结算、随机数种子、存档逐级升级、台词框架 | — | ✅ Claude（已合入 main） |
| [B1](B1-stability.md) | 稳定：修审查出的 bug | — | 可以开工 |
| B2 | 成长：成长值 + 照顾系数、60 级、幼年/青年/成年、性别、去掉老年和老死 | [数值单](numbers/B2-growth.md)确认 | 等用户确认 |
| B3 | 疾病：5 条链、吃错药加重、药分档、撑多了得肠胃病 | [数值单](numbers/B3-illness.md)确认 | 等用户确认 |
| B4 | 学习→职业：9 门课课时、33 种职业、掉落 | [数值单](numbers/B4-study-jobs.md)确认 | 等用户确认 |
| B5 | 日常：签到 12 天、在线礼包（每小时）、宠物日记 | [数值单](numbers/B5-daily.md)确认 | 等用户确认 |
| B6 | 表现：台词全量、心情动画、右键菜单、免打扰/暂停成长 | 文案用户审 | 等文案 |

**数值单没确认的批次不开工。** 数值单由 Claude 写在 `docs/tasks/numbers/`，用户确认后在卡里标 ✅。

## 协作规则

1. 开工前 `git log --oneline -10` 看对方最近在动什么；**不同时改同一个文件**。
2. 一张卡一段连续提交，提交信息 `fix(pig)` / `feat(pig)` 开头，写清改了什么、为什么。
3. 每修一个 bug 先写一条**会红的测试**，再改代码让它变绿。
4. 每张卡完成时，在卡末尾「验证记录」写：`npm test` 结果、`npm run typecheck` 结果、截图路径。
5. 不改用户确认过的数字；觉得不合理就在卡里写出来，等用户定。

## 框架约定（B0 之后）

| 要做的事 | 用什么 |
|---|---|
| 领域逻辑 | `packages/pet-core/src/core/`，根目录 `core.js` 只是再导出 |
| 数值表 | `packages/pet-core/src/data/`，新表记得加进 `data.js` barrel |
| 随机 | `core/random.js` 的 `roll(state)` / `chance(next, p)` / `pickOne(next, list)`。**禁止 `Math.random()`**（`test/core-boundary.test.js` 会拦） |
| 时间推进 | `decay()` 分段分步（5 分钟一步）；新的「随时间变化」的系统挂在 `settlement.js` 的 `step()` 里 |
| 改存档结构 | `core/upgrades.js` 表尾加一级 + `STATE_VERSION` +1 + 迁移测试（样本在 `test/fixtures/`） |
| 猪说话 | `say(state, scene, nowMs)`；新场景加在 `data/lines.js` |
| 消息 | `announce()` 返回带递增 `id` 的消息；客户端按 id 去重 |

## 验收（每张卡通用）

```sh
npm run build && npm test && npm run typecheck
```

真实界面：起一个**隔离实例**，不碰正在养的猪：

```sh
H=/tmp/dsh-home-test; mkdir -p $H
cd ~/.dsh && cp -a profiles llm-deepseek storages dsh-pig $H/
cd /zyx/DSH/deepseek-harness
DSH_HOME=$H pnpm dsh web --no-open --port 3082
```

逐个页签截图，存到 `docs/screenshots/`。
