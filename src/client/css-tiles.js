// @ts-check
/**
 * 方块页（学习 / 商店 / 背包）的样式 —— B8，照动森手机主屏：
 * 3 列彩色圆角大方块、大图标、方块下面一行小字；点进去整屏换成同色浅一档的小方块。
 *
 * 配色取 animal-island-ui 的 app 方块色（docs/design-system/design-tokens.md），
 * 声明在组件根节点上，不碰宿主页面的 :root。
 * @module dsh-pig/client/css-tiles
 */

export const CSS_TILES = [
  '[data-dsh-pig]{--tile-pink:#f8a6b2;--tile-purple:#b77dee;--tile-blue:#889df0;',
  '--tile-yellow:#f7cd67;--tile-orange:#e59266;--tile-teal:#82d5bb;--tile-green:#8ac68a;',
  '--tile-red:#fc736d;--tile-lime:#d1da49;--tile-peach:#e18c6f;--tile-brown:#9a835a}',
  '.dp-tile[data-color="pink"]{--tile-c:var(--tile-pink)}',
  '.dp-tile[data-color="purple"]{--tile-c:var(--tile-purple)}',
  '.dp-tile[data-color="blue"]{--tile-c:var(--tile-blue)}',
  '.dp-tile[data-color="yellow"]{--tile-c:var(--tile-yellow)}',
  '.dp-tile[data-color="orange"]{--tile-c:var(--tile-orange)}',
  '.dp-tile[data-color="teal"]{--tile-c:var(--tile-teal)}',
  '.dp-tile[data-color="green"]{--tile-c:var(--tile-green)}',
  '.dp-tile[data-color="red"]{--tile-c:var(--tile-red)}',
  '.dp-tile[data-color="lime"]{--tile-c:var(--tile-lime)}',
  '.dp-tile[data-color="peach"]{--tile-c:var(--tile-peach)}',
  '.dp-tile[data-color="brown"]{--tile-c:var(--tile-brown)}',

  // The grid: three columns that can never be widened by their content.
  '.dp-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 8px;padding:4px 2px 2px}',

  // A tile is a column: the coloured square, then its name, then a note.
  '.dp-tile{font:inherit;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;',
  'padding:0;margin:0;border:0;background:none;cursor:pointer;color:var(--ac-text)}',
  '.dp-tile-icon{position:relative;display:flex;align-items:center;justify-content:center;',
  'width:62px;height:62px;border-radius:18px;background:var(--tile-c,var(--ac-bg-content));',
  'box-shadow:0 3px 0 rgba(61,52,40,.16);transition:transform .15s var(--ac-ease),box-shadow .15s var(--ac-ease)}',
  '.dp-tile-e{font-size:30px;line-height:1;filter:drop-shadow(0 1px 1px rgba(61,52,40,.18))}',
  '.dp-tile:hover:not(:disabled) .dp-tile-icon{transform:translateY(-2px);box-shadow:0 5px 0 rgba(61,52,40,.16)}',
  '.dp-tile:active:not(:disabled) .dp-tile-icon{transform:translateY(2px);box-shadow:0 1px 0 rgba(61,52,40,.16)}',
  '.dp-tile:focus-visible{outline:none}',
  '.dp-tile:focus-visible .dp-tile-icon{outline:2px solid var(--ac-primary);outline-offset:2px}',
  // One line each, never wrapping: every tile in a row stays the same height.
  '.dp-tile-n,.dp-tile-note{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.25}',
  '.dp-tile-n{font-size:10.5px;font-weight:700}',
  '.dp-tile-note{font-size:9.5px;font-weight:600;color:var(--ac-text-2);margin-top:-2px}',
  // Corner marks on the square: a count top-right, a word top-left.
  '.dp-tile-badge,.dp-tile-tag{position:absolute;top:-5px;font-size:9px;font-weight:800;line-height:1;',
  'padding:3px 5px;border-radius:var(--ac-pill);white-space:nowrap;border:2px solid var(--ac-bg)}',
  '.dp-tile-badge{right:-6px;background:var(--ac-primary);color:#fff}',
  '.dp-tile-tag{left:-6px;background:var(--ac-warning);color:var(--ac-text)}',
  // Second layer: the same colour, a shade paler and a little smaller.
  '.dp-tile-soft .dp-tile-icon{width:54px;height:54px;border-radius:16px;',
  'background:color-mix(in srgb,var(--tile-c) 42%,#fffbe7)}',
  '.dp-tile-soft .dp-tile-e{font-size:26px}',
  // Locked: greyed but still openable (a stage can be looked into before it opens).
  '.dp-tile[data-locked="true"] .dp-tile-icon{filter:grayscale(.75);opacity:.6}',
  '.dp-tile[data-dim="true"] .dp-tile-icon,.dp-tile:disabled .dp-tile-icon{opacity:.45;box-shadow:none}',
  '.dp-tile[data-dim="true"] .dp-tile-n,.dp-tile:disabled .dp-tile-n{color:var(--ac-text-2)}',
  '.dp-tile:disabled{cursor:default}',
  '.dp-tile[data-active="true"] .dp-tile-icon{outline:3px solid var(--ac-active);outline-offset:2px}',

  // The second layer's top row: back, title, one grey line.
  '.dp-drill{display:flex;align-items:center;gap:7px;margin:0 0 10px}',
  '.dp-drill-back{font:inherit;font-size:16px;font-weight:800;line-height:1;width:26px;height:26px;',
  'flex:none;cursor:pointer;color:var(--ac-text);border-radius:50%;',
  'border:2px solid var(--ac-border-light);background:var(--ac-bg-input)}',
  '.dp-drill-back:hover{border-color:var(--ac-border-hover)}',
  '.dp-drill-title{font-size:12px;font-weight:800;color:var(--ac-text);white-space:nowrap}',
  '.dp-drill-info{flex:1;min-width:0;text-align:right;font-size:10px;font-weight:600;',
  'color:var(--ac-text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  // A picked tile's details (a diary page, a souvenir's story) sit under the grid.
  '.dp-tile-card{margin-top:12px}',
].join('')
