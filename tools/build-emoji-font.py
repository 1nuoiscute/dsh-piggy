"""桌面版内置 emoji 字体：整套 Noto Color Emoji 原样复制到 apps/desktop/renderer/piggy-emoji.ttf，
并把它覆盖的字符写进 renderer/index.html 的 unicode-range。

默认用这套，设置里可以切回系统自带。整套都带上，以后游戏里加新 emoji 不用再重新生成。
用法（需要本机装了 Noto Color Emoji，Arch: noto-fonts-emoji）：
    uv run --with fonttools python tools/build-emoji-font.py [NotoColorEmoji.ttf]
"""
import re, shutil, sys
from pathlib import Path
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = sys.argv[1] if len(sys.argv) > 1 else '/usr/share/fonts/noto/NotoColorEmoji.ttf'
# 这三个在游戏里当文字用：名牌里的性别 ♀ ♂，钓鱼剩余机会 ♥♥♡（要和空心 ♡ 一个样子）。
TEXT_SYMBOLS = {0x2640, 0x2642, 0x2665}

cps = sorted(c for c in TTFont(SRC).getBestCmap() if c > 0xFF and c not in TEXT_SYMBOLS)

def ranges(codes):
    out, start, prev = [], codes[0], codes[0]
    for c in codes[1:]:
        if c == prev + 1:
            prev = c
            continue
        out.append((start, prev))
        start = prev = c
    out.append((start, prev))
    return ','.join('U+%X' % a if a == b else 'U+%X-%X' % (a, b) for a, b in out)

out = ROOT / 'apps/desktop/renderer/piggy-emoji.ttf'
shutil.copyfile(SRC, out)
html = ROOT / 'apps/desktop/renderer/index.html'
text = html.read_text(encoding='utf8')
text, n = re.subn(r'unicode-range:[^}]*}', 'unicode-range:' + ranges(cps) + '}', text, count=1)
assert n == 1, 'index.html 里没找到 unicode-range'
html.write_text(text, encoding='utf8')
print(f'{len(cps)} 个字符，{out.stat().st_size // 1024} KB')
