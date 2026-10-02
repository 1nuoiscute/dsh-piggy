# 制作自己的皮肤

[文档中心](../README.md) · [玩家换肤教程](skins.md) · [完整格式规范](skin-pack-format.md)

最快的方法是下载[完整示例 ZIP](../examples/skin-pack-example.zip)，解压后逐张替换 SVG，再重新压缩。也可以复制[示例目录](../examples/skin-pack/)从头修改。

## 需要准备哪些图片

每张图片都是透明背景、`64 × 64` 画布的 SVG。

| 文件 | 是否必需 | 出现时机 |
|---|---:|---|
| `idle.svg` | 必需 | 待机，也是缺少可选动作时的备用图 |
| `eat.svg` | 必需 | 吃东西 |
| `bathe.svg` | 必需 | 洗澡 |
| `play.svg` | 必需 | 玩耍 |
| `pet.svg` | 必需 | 被摸摸 |
| `relaxed.svg` | 可选 | 放松、番茄钟陪伴 |
| `work.svg` | 可选 | 打工 |
| `study.svg` | 可选 | 学习 |
| `trip.svg` | 可选 | 旅行 |
| `fish.svg` | 可选 | 钓鱼 |

只做五张必需图片也能使用。可选图片缺失时会显示 `idle.svg`。

## 画布与对齐

- SVG 根元素必须写 `viewBox="0 0 64 64"`。
- 使用透明背景，不要画一整块白色底图。
- 参考 [`assets/piglet.svg`](../../assets/piglet.svg) 对齐身体中心和脚底，切换动作时才不会跳动。
- 建议使用简单平涂路径，并把编辑器中的文字转换成路径。
- 不要嵌入图片、字体、脚本、外链、渐变或滤镜。

## 编写 skin.json

在图片旁边新建 `skin.json`：

```json
{
  "key": "my-blue-pig",
  "label": "蓝莓猪",
  "author": "你的名字",
  "description": "关于这套皮肤的一句话。",
  "emoji": "🫐"
}
```

- `key` 是皮肤的稳定编号，只能使用小写英文字母、数字和短横线，最长 24 位。
- `label` 是玩家看到的皮肤名称。
- `author`、`description` 和 `emoji` 可以省略。
- 发布更新时保持同一个 `key`，玩家再次导入就能更新原皮肤。

## 正确的 ZIP 结构

打开 ZIP 后应该直接看到这些文件：

```text
my-skin.zip
├── skin.json
├── idle.svg
├── eat.svg
├── bathe.svg
├── play.svg
├── pet.svg
├── relaxed.svg     可选
├── work.svg        可选
├── study.svg       可选
├── trip.svg        可选
└── fish.svg        可选
```

不要出现 `my-skin/skin.json` 这样的额外外层文件夹。

### Windows

进入皮肤文件夹，选中 `skin.json` 和所有 SVG，右键选择“压缩到 ZIP 文件”或“发送到 → 压缩文件夹”。不要在文件夹外面对整个文件夹执行压缩。

### macOS

进入皮肤文件夹，选中 `skin.json` 和所有 SVG，按住 Control 点击后选择“压缩”。不要只选外层文件夹。

### Linux

在皮肤文件夹里运行：

```sh
zip -j my-skin.zip skin.json *.svg
```

`-j` 会确保 ZIP 根目录里没有额外路径。

## 导入前检查

- 五张必需图片都在。
- 文件名全部使用小写英文，并与表格一致。
- 每张 SVG 都是 `viewBox="0 0 64 64"`。
- ZIP 根目录直接放 `skin.json` 和 SVG。
- 单个文件不超过 96 KB，整个 ZIP 不超过 2 MB。
- `skin.json` 是有效 JSON，最后一项后面没有多余逗号。

完成后按[玩家换肤教程](skins.md)导入。导入器会先检查整个包；有任何一项不合格都不会写入半套皮肤。
