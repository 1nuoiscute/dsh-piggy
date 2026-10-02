# 自定义皮肤导入教程

主菜单打开 **🎨 换肤**，可直接切换内置皮肤，也可在页面底部选择一个 ZIP 导入。导入成功后会自动使用；以后可从换肤 App 或 **📖 图鉴 → 皮肤** 切换。皮肤不是商店道具，不花金币，也不进入背包。

## 最快的制作方法

1. 下载 [完整示例 ZIP](examples/skin-pack-example.zip)，或复制 [示例目录](examples/skin-pack/)。
2. 保留根目录的 `skin.json`，用自己的 SVG 替换各场景文件。
3. 把 `skin.json` 和 SVG 直接压在 ZIP 根目录，不能再套一层文件夹。
4. 在主菜单 **🎨 换肤 → 导入自己的皮肤** 选择 ZIP。

最少需要 5 张图：`idle.svg`、`eat.svg`、`bathe.svg`、`play.svg`、`pet.svg`。推荐补齐 `relaxed.svg`、`work.svg`、`study.svg`、`trip.svg`、`fish.svg`，一共 10 张。可选场景缺失时会显示 `idle.svg`。

## skin.json

```json
{
  "key": "my-blue-pig",
  "label": "蓝莓猪",
  "author": "你的名字",
  "description": "关于这套皮肤的一句话。",
  "emoji": "🫐"
}
```

`key` 必填，只能用小写英文字母、数字和短横线，最长 24 位；同一个 `key` 再次导入会更新该皮肤。`label` 必填；`author`、`description`、`emoji` 可选。

## SVG 规范

- 每张图使用 `viewBox="0 0 64 64"`，透明背景，并与 `assets/piglet.svg` 的身体中心和脚底对齐。
- 使用简单平涂路径。不能嵌入位图、字体、外链、脚本、事件、渐变或滤镜。
- 单个文件不超过 96 KB，整个 ZIP 不超过 2 MB，根目录最多 20 个文件。
- 导入会先检查整包；任何文件不合格都会列出原因，并且不会写入半套皮肤。

晋升形态的立绘始终优先于皮肤。变成猪猪王或恶魔猪时，当前皮肤仍会保存在存档中；恢复普通形态后会自动重新显示。
