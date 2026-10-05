// @ts-check
/**
 * 发布渠道：Gitee。用这个渠道打出来的游戏包和桌面外壳，检查更新、下载游戏包、
 * 在线扩展都只走 gitee.com（Gitee 发行版附件单文件 ≤100MB、单仓库附件总量 ≤1GB）。
 * @module dsh-piggy/channel
 */
export const CHANNEL = {
  name: 'gitee',
  repoPage: 'https://gitee.com/clicgger/dsh-piggy',
  releasesList: 'https://gitee.com/api/v5/repos/clicgger/dsh-piggy/releases?per_page=20&page=1&direction=desc',
  latestRelease: 'https://gitee.com/api/v5/repos/clicgger/dsh-piggy/releases/latest',
  releasesPage: 'https://gitee.com/clicgger/dsh-piggy/releases',
  downloadBase: 'https://gitee.com/clicgger/dsh-piggy/releases/download',
  rawBase: 'https://gitee.com/clicgger/dsh-piggy/raw/main',
  blobBase: 'https://gitee.com/clicgger/dsh-piggy/blob/main',
  registry: 'https://gitee.com/clicgger/dsh-piggy/raw/main/extensions/registry-gitee.json',
}
