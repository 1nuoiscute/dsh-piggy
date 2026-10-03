<p align="center"><img src="assets/piglet.svg" width="128" alt="dsh-piggy 的小猪"></p>

<h1 align="center">dsh-piggy</h1>

<p align="center">一只住在 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> 里，也能独立住在桌面上的猪。</p>

它会长大、上学、打工、旅行、钓鱼、生病，也会跟你搭话。界面采用动森风格的 App 主菜单，全部玩法都能用鼠标完成。

**欢迎一起画猪。** 目前项目还缺形态、动作和皮肤等美术资源；如果你有喜欢的猪猪形象，欢迎提交 [Pull Request](https://github.com/CLICGGER-TYPES/dsh-piggy/pulls)，我会认真看并合并合适的作品。也欢迎 Fork 项目，做一只完全符合自己喜好的猪。自定义皮肤可从[制作教程](docs/guides/creating-skins.md)开始。

- **完整养成**：照顾、成长、学习、工作、旅行、收藏和晋升形态
- **桌面版**：Windows、Linux 和 macOS 可独立运行
- **角色外观**：完成厨师或宇航员工作解锁职业外观，另有免费内置皮肤，也可导入自己的 SVG 皮肤包
- **零 token**：不注册模型工具，不向对话注入宠物状态

<p align="center">
  <img src="docs/screenshots/readme-home.png" width="260" alt="主菜单">
  <img src="docs/screenshots/c4-dex-dashboard.png" width="260" alt="图鉴">
  <img src="docs/screenshots/c6-skins.png" width="260" alt="换肤">
</p>

## 安装

### DSH 插件

```sh
dsh plugin --profile web add dsh-piggy
```

安装后重启 DSH，再刷新页面。

在按 `dsh-plugin-*` 搜索的社区目录中，也可安装 [`dsh-plugin-piggy`](https://www.npmjs.com/package/dsh-plugin-piggy)：`dsh plugin --profile web add dsh-plugin-piggy`。它加载同一个游戏，每个 profile 安装其中一个即可。

如果想直接使用 GitHub 源码，可以克隆本仓库，再执行 `dsh plugin --profile web add /path/to/dsh-piggy`。

### 桌面版

从 [GitHub Releases](https://github.com/CLICGGER-TYPES/dsh-piggy/releases/latest) 下载对应系统的文件：

- Windows：`setup.exe` 安装版或 `portable.exe` 便携版
- Linux：`AppImage`
- macOS：按芯片选择 `arm64.dmg` 或 `x64.dmg`

macOS 包暂未签名，第一次打开请在访达中右键应用并选择“打开”。更多安装与存档说明见[桌面版指南](docs/guides/desktop.md)。

主菜单「更新」会分别显示游戏版本和桌面外壳版本。游戏包可在 App 内更新；桌面外壳从 v0.2.0 起，Windows 安装版和 Linux AppImage 可在 App 内下载并重启安装。Windows 便携版、未签名 macOS 版需到发布页手动替换；旧版外壳需先手动升级一次。详见[更新说明](docs/guides/updates.md)。

v0.27.1 的桌面外壳 v0.2.1 修复了更新依赖的安全问题；已有桌面版需要升级外壳，单独更新游戏包不会替换该依赖。

商店和背包中的「装扮」入口暂时隐藏，已有装扮和穿戴记录会保留；后续会重新设计展示方式。

## 开始玩

右键小猪打开主菜单，左键摸摸它，拖动可以换位置。第一次见到纸盒时连续点三下，把猪接回家。

详细玩法、体型、美术图标设置和命令见[玩法指南](docs/guides/gameplay.md)。换肤可直接阅读[玩家换肤教程](docs/guides/skins.md)，制作皮肤从[自定义皮肤制作教程](docs/guides/creating-skins.md)开始。

## 文档

- [文档中心](docs/README.md)
- [玩法与养成规则](docs/guides/gameplay.md)
- [桌面版安装、存档与更新](docs/guides/desktop.md)
- [游戏包与桌面外壳怎样更新](docs/guides/updates.md)
- [开发与调试](docs/DEVELOPMENT.md)
- [版本记录](CHANGELOG.md)

## 开发

```sh
npm install --no-save --package-lock=false esbuild@0.28.2 typescript@5.9.3 @types/node@20.19.43
npm run build
npm test
npm run typecheck
```

开发环境、桌面打包、HTTP 接口和目录说明见[开发指南](docs/DEVELOPMENT.md)。

## 致谢与许可

特别感谢 @1nuoiscute 贡献猪猪王原型、恶魔猪、肥猪体型与胖胖猪动作立绘。视觉风格参考 [animal-island-ui](https://github.com/guokaigdg/animal-island-ui)，玩法数值参考资料见 [THIRD-PARTY.md](THIRD-PARTY.md)。项目采用 [MIT License](LICENSE)。
