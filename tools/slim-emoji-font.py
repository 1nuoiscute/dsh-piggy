"""Gitee 渠道专用：把桌面版内置 emoji 字体瘦成「游戏里用到的 + 常用表情」。

Gitee 发行版附件单个不能超过 100MB，整套 Noto Color Emoji（约 10.7MB）会把安装包撑过线，
所以只在打 Gitee 包的 CI 里原地替换 apps/desktop/renderer/piggy-emoji.ttf（GitHub 包不跑这一步，仍带整套）。
renderer/index.html 的 unicode-range 不用改：字体里没有的字，浏览器会自动交给下一个字体（系统 emoji）。

收哪些字：src/client、packages/pet-core/src、store、extensions 和 data/core/snapshot 里出现的所有 emoji，
再加常用笑脸（U+1F600–1F64F）和爱心，以及组合用的 ZWJ / 变体选择符 / 键帽。
用法：python tools/slim-emoji-font.py   （需要 fonttools；本机用 uv run --with fonttools python ...）
"""
import re
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / 'apps/desktop/renderer/piggy-emoji.ttf'
SOURCES = ['src/client', 'packages/pet-core/src', 'store', 'extensions', 'data.js', 'core.js', 'snapshot.js']
PICTO = re.compile(r'[\U0001F000-\U0001FAFF←-⯿⌀-⏿〰〽㊗㊙]')

codes = set()
for rel in SOURCES:
    path = ROOT / rel
    files = [path] if path.is_file() else [p for p in path.rglob('*') if p.suffix in ('.js', '.json', '.mjs')]
    for file in files:
        for ch in PICTO.findall(file.read_text(encoding='utf-8')):
            codes.add(ord(ch))
codes |= set(range(0x1F600, 0x1F650)) | set(range(0x1F493, 0x1F4A0)) | {0x2764, 0x2763, 0xFE0F, 0x200D, 0x20E3}

before = FONT.stat().st_size
font = TTFont(FONT)
have = set(font.getBestCmap() or {})
keep = sorted(c for c in codes if c in have)
options = subset.Options()
options.layout_features = ['*']
options.drop_tables = []
sub = subset.Subsetter(options)
sub.populate(unicodes=keep)
sub.subset(font)
font.save(FONT)
print(f'emoji font: {before / 1048576:.2f}MB -> {FONT.stat().st_size / 1048576:.2f}MB, {len(keep)} code points')
