// Gitee 渠道的打包配置：在 package.json 的 build 上覆盖几项（GitHub 包不用这个文件，照旧）。
// Gitee 发行版附件单个 ≤100MB：最大压缩、只留中英文语言包（另有 tools/slim-emoji-font.py 瘦 emoji 字体）。
// 外壳更新清单：Gitee 没有「最新版」固定地址，运行时 lib/shell-update.js 会按 tag 改 feed，这里只给个占位。
const base = require('./package.json').build
module.exports = {
  ...base,
  compression: 'maximum',
  electronLanguages: ['zh-CN', 'en-US'],
  publish: [{ provider: 'generic', url: 'https://gitee.com/clicgger/dsh-piggy/releases/download/latest' }],
}
