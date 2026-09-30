// @ts-check
/**
 * 客户端常量：接口地址、面板尺寸、页签与游戏文案。
 *
 * 数值与文案集中在这里，渲染代码只引用名字（见 docs/CONVENTIONS.md）。
 * @module dsh-pig/client/constants
 */


export const STATE_URL = '/dsh-pig/state'
// Hand-drawn stages are served from the plugin's own /art route.
export const ART_URL = '/dsh-pig/art/'
export const ACT_URL = '/dsh-pig/act'
export const POLL_MS = 4000

/** How often the pig speaks up unprompted, in minutes (mirrors data/lines.js IDLE_CHAT_MINUTES). */
export const IDLE_CHAT_MINUTES = { min: 20, max: 40 }

/** Wait this long after the page opens before the pig says hello. */
export const GREET_DELAY_MS = 1500
export const MOUNTED = 'data-dsh-pig'
export const OPEN_KEY = 'dsh-pig:open'
export const POSITION_KEY = 'dsh-pig:position'
// Must match `.dp-card{width}` — used to keep the panel inside the window.
export const PANEL_WIDTH = 292
export const PANEL_GAP = 8
export const PANEL_MARGIN = 10
export const PANEL_MIN_HEIGHT = 120
// Must match `--scene-open` in the CSS (a test keeps them honest). The pig
// is clamped against this rather than its collapsed height, so opening the
// panel can never shove the hud off the top of the window.
export const SCENE_RESERVE = 132
// Must match `.dp-scene{padding-inline}`. The pig's on-screen footprint is
// the glyph plus this padding; clamping by the glyph alone leaves it a few
// pixels over the edge.
export const PIG_PADDING_X = 6

export const TABS = [
  { key: 'status', label: '状态', emoji: '📋' },
  { key: 'study', label: '学习', emoji: '📚' },
  { key: 'work', label: '打工', emoji: '💼' },
  { key: 'shop', label: '商店', emoji: '🛒' },
  { key: 'travel', label: '旅行', emoji: '🧳' },
  { key: 'bag', label: '背包', emoji: '🎒' },
]

/** Developer mode: off unless asked for, and remembered across reloads. */
export const DEV_KEY = 'dsh-pig:dev'
export const DEV_TAB = { key: 'dev', label: '调试', emoji: '🔧' }

/** What the pig says when you pat it. A single line got old immediately. */
export const PET_LINES = [
  '好舒服…', '再摸摸～', '嘿嘿', '呼噜呼噜…', '这里这里！',
  '（眯起眼睛）', '今天心情不错', '唔…好痒', '你在忙什么呀', '再多待一会儿',
]

export const MODES = ['feed', 'bathe', 'play', 'pet']
export const CARE_LABEL = { feed: ['喂食', '🍎'], bathe: ['洗澡', '🛁'], play: ['玩耍', '🎾'], pet: ['摸摸', '❤️'] }
// What the pig says when the shelf it needs is bare. Being told plainly
// beats a generic "that did not work".
/** A new pig arrives in a box and has to be poked out of it. */
export const BOX_POKES_TO_OPEN = 3
export const BOX_POKE_LINES = [
  '里面好像有东西…',
  '动了！再戳一下！',
]

export const NO_ITEM_LINE = {
  food: '没有吃的啦，快去买一点 🍎',
  bath: '没有洗浴用品了，去买点吧 🧼',
  toy: '没有玩具了，去商店看看 🪀',
}
export const KIND_TITLE = { food: '🍎 食物', bath: '🧼 洗浴', toy: '🪀 玩具', dress: '👕 装扮', medicine: '💊 药品', revive: '✨ 复活' }
export const KIND_ORDER = ['food', 'bath', 'toy', 'dress', 'medicine', 'revive']
export const STAGES = [
  { key: 'preschool', label: '幼儿园' },
  { key: 'extracurricular', label: '课外' },
  { key: 'primary', label: '小学' },
  { key: 'middle', label: '中学' },
  { key: 'high', label: '高中' },
  { key: 'college', label: '大学' },
  { key: 'graduate', label: '研究生' },
]
