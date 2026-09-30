# B1 稳定：修审查出的 bug

**前置**：`b0-framework` 已合入 main。**不涉及数值调整**，可以直接开工。
**编号**沿用 2026-09-30 代码审查清单。B0 已顺手修掉 #1（纸盒重启自己孵化）、#6（短工后整晚按在外算）、#8（同一时刻多条消息只显示一条），不在本卡。

每一条：先写会红的测试 → 改 → 变绿。

## 会丢数据的（先做）

- [ ] **#4 兴趣课重启后消失，钱不退**
  - `core/migrate.js` 的 `sanitizeActivity` 只认 `work/study/trip`，加上 `interest`（校验 key 用 `interestByKey`）
  - `core/constants.js` 的 `AWAY_MOODS` 加 `interest`（现在显示「在打工」）；CSS 补 `data-away="interest"`
  - 测试：开一节兴趣课 → `migrate(JSON 往返)` → activity 还在
- [ ] **#5 纪念品超过 40 个被删**
  - `core/migrate.js:~180` 的 `slice(-40)` 去掉（或改成很大的上限并在卖出时提示）；`snapshot.js:~283` 同理，不然超过 40 个后旧的卖不掉
  - 测试：41 个纪念品往返 migrate 后还是 41 个，snapshot 里也是 41 个

## 玩法错误

- [ ] **#2 纸盒能被喂、能打工上学旅行、能生病死亡**
  - `startWork/startStudy/startTrip/startInterest/act` 开头加 `hatched !== true → { ok: false, reason: 'box' }`
  - `decay()` 里没孵化的纸盒不掉属性、不生病（在 `settlement.js` 的 `decay` 开头判断）
  - `feed()`（被动吃真实工作）对纸盒：只记 stats，不加 xp/属性
  - `snapshot` 对纸盒 `canGoOut: false`；客户端 `io.js` 的 reasons 加 `box: '先把纸盒拆开'`
- [ ] **#7 病自己好了之后健康一直回不来**
  - 病愈（自愈或吃药）后健康回满 `MAX.health`，或者按时间每天回 1 格。**选前者，改动最小**；在卡里写明选择
- [ ] **疑似 #7：召回活动前没先结算**：`callOffActivity` 开头先 `decay(state, nowMs)`，已经结束的活动应该照常发工资而不是退款/作废

## 前端丢字段（#10，五处）

- [ ] `normalize.js` 保留商店条目的 `worn`（`tabs/shop.js` 的「穿着」标签现在永远不显示）
- [ ] `tabs/shop.js` 读的 `item.count` 不存在，改成快照里实际的字段名（查 `snapshot.js` 的 shop 部分）
- [ ] `panel.js:~157` 每次渲染把 `data-dev` 设回 false，冲掉了调试图标高亮
- [ ] `panel.js:~239` 学习图标提醒是 `? 'false' : 'false'`，永远亮不起来 —— 定一个真实条件（比如「空闲且有能上的课」），或者删掉这行
- [ ] `panel.js:~105` 生病提醒报的是最便宜的药，改成 `currentIllness().cure` 对应的那味药

## 客户端 / 路由健壮性

- [ ] **#11 Ctrl+Shift+D 监听泄漏**：`src/client/index.js` 的 `dispose()` 同时移除 `keydown`，并删掉 `window.dshPigDev`
- [ ] **路由没兜底**：`routes.js:~134` 包 try/catch，异常返回 `{ ok: false, reason: 'error' }` 且状态码 500，日志带 action 名
- [ ] **mutate 半路抛错也会保存**：`store.js` 的 `mutate` 在 core 抛异常时不保存、把内存状态回滚到调用前（`structuredClone` 快照）
- [ ] **轮询覆盖刚做的动作**：`io.js` 的 `refresh` 加 in-flight 序号，比最近一次 `send` 早发出的轮询结果直接丢弃
- [ ] **面板每 4 秒整页重建**：`panel.js:~65` 渲染前记下内容区 `scrollTop`，渲染后还原（最小改动，不做 diff）
- [ ] **`/dsh-pig/act` 没有鉴权**：任何网页都能 POST `reset/dev/giveAll`。先查 DSH 宿主有没有给插件路由的 token 校验钩子（`/zyx/DSH/deepseek-harness` 里搜 web-server 的 route 注册）；没有的话至少校验 `content-type: application/json` + `Origin`/`Sec-Fetch-Site` 同源。**做之前把方案写在这里给 Claude 看一眼**

## 小缺口（有空就做）

- [ ] 学习页默认停在锁住的学段（`src/client/index.js:~103`），改成默认第一个已解锁的
- [ ] `/pig` 斜杠命令补 `interest` / `sell` / `wear` / `adopt` / `reply`
- [ ] `io.js` 的 reasons 补 `weak`、`box`、`stale-line`（最后一个静默即可）
- [ ] 调试页 `health: 0` 补一条死亡公告，而不是悄悄变成死猪

## 不在本卡

- #3 复活后立刻老死、#9 调试页年龄按钮对不上 —— B2 去掉老死后一起改
- 药名和疾病链对不上 —— B3

## 验证记录

（完成后填：`npm test` 通过数、typecheck 结果、截图路径）
