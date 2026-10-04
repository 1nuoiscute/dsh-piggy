# 第三方致谢与许可

本插件（`dsh-piggy`）的代码与美术以 MIT 发布。下面列出它参考、依赖或提及的第三方内容。
**没有复制任何第三方代码、文档或游戏原版素材** —— 用到的数值与名称属于事实性数据。

## 设计参考资料

| 项目 | 许可 | 本插件用到了什么 |
|---|---|---|
| [xuemian168/qqpet_automation](https://github.com/xuemian168/qqpet_automation) | MIT（其原创部分） | 只参考**数值与名称**：属性阈值、三条疾病链的名称与分期、九门科目名、部分物品名。其源代码、数据文件结构与本项目不同，未复制 |
| [ice-cream-headache/ice-cream-headache.github.io](https://github.com/ice-cream-headache/ice-cream-headache.github.io) | MIT | 只参考**界面截图**（宠物在上、奶油色图标栏在下、带标签的属性条）。截图未随本包分发 |
| [guokaigdg/animal-island-ui](https://github.com/guokaigdg/animal-island-ui) | MIT | 只参考**设计 token**：颜色、圆角、缓动曲线。按其 `docs/design-system/css-variables.md` 的取值重写为纯 CSS |

## 运行时依赖

| 内容 | 许可 | 说明 |
|---|---|---|
| Nunito / Noto Sans SC | SIL OFL 1.1 | 客户端在浏览器里按需从 Google Fonts 加载；加载失败自动退回系统字体。**字体文件不随本包分发** |
| Noto Color Emoji（子集） | SIL OFL 1.1 | 仅桌面版：`apps/desktop/renderer/piggy-emoji.ttf`，只含游戏里用到的 emoji（`tools/build-emoji-font.py` 生成），许可原文见同目录 `piggy-emoji-LICENSE.txt` |

## 美术

- `assets/piglet.svg`、`assets/elder.svg`：**原创矢量重绘**，由项目作者提供。
  造型取自通用的 🐖 emoji 形象（侧视、卷尾、圆耳），路径、配色与描边为本项目自绘，
  不是任何 emoji 素材集或游戏原版素材的路径拷贝。
- 界面里的其它图形一律用系统 emoji 字体渲染，不附带图形文件。

## 商标

QQ 宠物 / QQ 是腾讯控股有限公司的商标。本插件与腾讯**无任何关联，亦未获其授权**；
文档中提到该名称只为说明玩法与数值的参考来源。若权利人认为本仓库有不妥之处，
请开 issue，作者会立即调整或下架。
