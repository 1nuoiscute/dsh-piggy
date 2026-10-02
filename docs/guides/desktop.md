# 桌面版指南

桌面版不需要安装 DSH，玩法和插件版相同，但不会读取真实工作量。

## 安装

在 [GitHub Releases](https://github.com/CLICGGER-TYPES/dsh-piggy/releases/latest) 下载：

- Windows 安装版：运行 `dsh-piggy-setup-*.exe`。升级时可直接覆盖安装。
- Windows 便携版：运行 `dsh-piggy-portable-*.exe`。升级外壳时替换旧 EXE。
- Linux：给 AppImage 执行权限后运行；升级外壳时替换旧 AppImage。
- macOS：按芯片选 arm64 或 x64 DMG，拖入“应用程序”。未签名版本第一次需右键选择“打开”。

Linux GNOME 默认可能不显示托盘图标，可安装 AppIndicator 扩展，也可从主菜单点击“退出”。

## 存档与 DSH 导入

桌面版和 DSH 插件各自保存一只猪。桌面托盘菜单的“从 DSH 导入猪…”可以选择 DSH 的 `state.json`。导入、更新游戏包和覆盖安装桌面外壳都不会主动删除现有桌面存档。

## 更新

主菜单的“更新”App 会检查 GitHub Releases。有新版本时，主菜单显示红色感叹号，小猪也会提示一次。打开更新 App 后，本次提醒立即标为已读；即使暂时不安装，也不会一直显示。同一个版本不会反复冒泡，之后发布更新版本才会再次提醒。

游戏包更新可以在 App 内下载、校验并切换，更新前自动备份存档，也可以回到上一个版本。若页面提示“下载新安装包”，说明这次更新改到了 Electron 桌面外壳，需要覆盖安装或替换应用文件。详细原因见[更新机制](updates.md)。
