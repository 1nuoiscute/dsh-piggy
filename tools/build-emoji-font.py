"""桌面版内置 emoji 字体：把游戏源码里用到的 emoji 从 Noto Color Emoji 里抽出来，
生成 apps/desktop/renderer/piggy-emoji.ttf，并把字符清单写进 renderer/index.html 的 unicode-range。

用法（需要本机装了 Noto Color Emoji，Arch: noto-fonts-emoji）：
    uv run --with fonttools --with emoji python tools/build-emoji-font.py [NotoColorEmoji.ttf]

加了新 emoji 之后重跑一次；test/desktop-emoji-font.test.js 会检查源码里的 emoji 都在字体里。
"""
import glob, re, sys
from pathlib import Path
import emoji
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = sys.argv[1] if len(sys.argv) > 1 else '/usr/share/fonts/noto/NotoColorEmoji.ttf'
files = [*glob.glob(str(ROOT / 'src/client/**/*.js'), recursive=True),
         *glob.glob(str(ROOT / 'packages/pet-core/src/**/*.js'), recursive=True)]
cps = set()
for f in files:
    for m in emoji.emoji_list(Path(f).read_text(encoding='utf8')):
        cps.update(ord(c) for c in m['emoji'])
# 变体选择符、零宽连接符、组合键帽要进字体（拼序列用），但不进 unicode-range 以外的普通文字。
cps -= {0xFE0F, 0x200D, 0x20E3}
# ASCII（数字、#、*）和 ©® 不交给 emoji 字体，否则普通数字也会变成 emoji 字体里的样子。
cps = sorted(c for c in cps if c > 0xFF)
# 默认按文字显示的符号（♀ ♂ ↩ ⚙ 之类，单独出现时不是彩色 emoji）也不交给 emoji 字体：
# 名牌「猪猪 ♀」里的 ♀ 要保持文字样子。它们都是老字符，各系统本来就显示得了。
cps = [c for c in cps if emoji.EMOJI_DATA.get(chr(c), {}).get('status') == emoji.STATUS['fully_qualified']]
font = TTFont(SRC)
cmap = font.getBestCmap()
missing = [c for c in cps if c not in cmap]
if missing:
    sys.exit('字体里没有：' + ' '.join(chr(c) for c in missing))
opt = subset.Options()
opt.layout_features = ['*']
opt.name_IDs = ['*']
opt.notdef_outline = True
sub = subset.Subsetter(opt)
sub.populate(unicodes=cps + [0xFE0F, 0x200D, 0x20E3])
sub.subset(font)
out = ROOT / 'apps/desktop/renderer/piggy-emoji.ttf'
font.save(out)
rng = ','.join('U+%X' % c for c in cps)
html = ROOT / 'apps/desktop/renderer/index.html'
text = html.read_text(encoding='utf8')
text, n = re.subn(r'unicode-range:[^}]*}', 'unicode-range:' + rng + '}', text, count=1)
assert n == 1, 'index.html 里没找到 unicode-range'
html.write_text(text, encoding='utf8')
print(f'{len(cps)} 个字符，{out.stat().st_size // 1024} KB')
