# 开发指南

## 环境与校验

需要 Node.js 20 或更高版本。仓库不把构建工具列为运行时依赖，首次开发先安装已验证的本地工具版本：

```sh
npm install --no-save --package-lock=false esbuild@0.28.2 typescript@5.9.3 @types/node@20.19.43
npm run build
npm test
npm run typecheck
```

`--no-save --package-lock=false` 不修改依赖清单。`npm run build` 把 `src/client/` 生成到根目录 `client.js`；修改客户端源码后必须重新生成并提交该文件。

## 调试模式

在主菜单底部版本号上 3 秒内连续点击 7 次，会出现“调试”App。它可以调整数值、体型和形态，给予物品与每一种鱼，并快进时间。调试状态只保存在内存中，刷新或重启后关闭；页面顶部也有关闭按钮。

## DSH 配置

```yaml
- id: dsh-piggy
  name: dsh-piggy
  config:
    command: pig
    statePath: /abs/path/to/state.json
```

插件提供 `GET /dsh-piggy/state` 和 `POST /dsh-piggy/act`。操作表位于 `routes.js`，请求体上限 2 KB。路由只绑定本机地址。

## 桌面版

```sh
cd apps/desktop
npm install
npm start
npm run dist:linux
npm run dist:win
npm run dist:mac
```

`npm start` 会先把根项目打进 `apps/desktop/game/`。各平台安装包输出到 `apps/desktop/dist/`。macOS 包需在 macOS 构建；正式发布由 GitHub Actions 完成。

## 发布

游戏版本来自根 `package.json`，桌面外壳版本来自 `apps/desktop/package.json`。npm 目前由维护者在本机手动发布，不由标签工作流执行：

1. 修改根包和别名包的版本号，把 `packages/dsh-plugin-piggy/package.json` 的 `dependencies.dsh-piggy` 同步到同一版本；在 CHANGELOG 写该版本小节，运行 `npm run build && npm test && npm run typecheck` 并提交。
2. 打对应的 `v*` 标签并推送，等 `.github/workflows/release.yml` 的游戏包和三个桌面构建 job 完成，确认 GitHub Release 的安装包与游戏包齐全。
3. 在发布提交的根目录执行 `npm publish --access public`，按 npm 提示完成本机身份验证；不要把凭据写进仓库。
4. 执行 `npm view dsh-piggy version`，确认公开版本与标签相同。
5. 进入 `packages/dsh-plugin-piggy/`，执行 `npm publish --access public` 发布别名包，再用 `npm view dsh-plugin-piggy version` 核对。

社区目录使用的 `dsh-plugin-piggy` 是 `packages/dsh-plugin-piggy/` 里的独立 npm 包。它作为 DSH bundle 加载原始 `dsh-piggy` 依赖，不复制游戏代码；发布后在隔离 profile 验证别名能解析到原插件，每个 profile 只安装其中一个包。

## 主要目录

```text
src/client/                 浏览器界面源码
packages/pet-core/src/      跨 DSH/桌面共用的养成规则
apps/desktop/               Electron 外壳
assets/                     内置立绘
test/                       插件与客户端测试
docs/                       玩家、制作者和开发文档
```

编码约定见 [CONVENTIONS.md](CONVENTIONS.md)，美术规格见 [ART-SPEC.md](ART-SPEC.md)。
