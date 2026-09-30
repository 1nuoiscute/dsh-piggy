// @ts-check
/**
 * 面板内部样式：页签、列表、格子、装扮点位与调试页。
 *
 * @module dsh-pig/client/css-tabs
 */


import { button, meter } from './dom.js'

export const CSS_TABS = [
  'background:var(--ac-bg);cursor:pointer;font-family:inherit;text-align:center;',
  'transition:transform .12s var(--ac-ease),box-shadow .12s var(--ac-ease)}',
  '.dp-cell:hover{transform:translateY(-1px);box-shadow:0 3px 0 rgba(61,52,40,.14)}',
  '.dp-cell:active{transform:translateY(1px)}',
  '.dp-cell-e{font-size:22px;line-height:1.15}',
  '.dp-cell-n{font-size:10px;font-weight:700;color:var(--ac-text);line-height:1.2;',
  'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}',
  '.dp-cell-p{font-size:9.5px;font-weight:600;color:var(--ac-text-2)}',
  // Owned count and the "needed" flag are badges so they cost no extra row.
  '.dp-cell-c{position:absolute;top:3px;right:4px;font-size:9px;font-weight:800;',
  'color:#fff;background:var(--ac-primary);border-radius:var(--ac-pill);padding:0 4px;line-height:13px}',
  '.dp-cell-tag{position:absolute;top:3px;left:4px;font-size:8px;font-weight:800;',
  'color:#7a5a12;background:var(--ac-warning);border-radius:var(--ac-pill);padding:0 4px;line-height:13px}',
  // Affordable is colour; unaffordable is faded but still clickable, so a
  // tap can explain how much is missing instead of doing nothing.
  '.dp-cell.dp-poor{opacity:.45}',
  // 家当 already owned: not for sale, but not "unaffordable" either.
  '.dp-cell.dp-owned{opacity:.6;border-style:dashed}',
  '.dp-cell.dp-wanted{background:#fdf7e2;border-color:var(--ac-warning)}',

  /* ---------- developer tab ---------- */
  '.dp-dev-note{font-size:10px;color:var(--ac-text-2);margin:4px 0 2px;line-height:1.5}',
  '.dp-dev-row{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 2px}',
  '.dp-dev-btn{flex:0 0 auto;font-size:10px;padding:3px 8px}',
  '.dp-on{background:var(--ac-primary);color:#fff;border-color:var(--ac-primary)}',
  '[data-dsh-pig][data-dev="true"] .dp-ico[data-tab="dev"]{color:var(--ac-primary)}',

  /* ---------- the soul that settles on an unclaimed grave ---------- */
  '.dp-soul{position:absolute;left:50%;transform:translateX(-50%);top:-4px;font-size:22px;',
  'line-height:1;opacity:.9;pointer-events:none;z-index:1;',
  'animation:dp-haunt 3.4s ease-in-out infinite}',
  '@keyframes dp-haunt{0%,100%{transform:translate(-50%,0) scale(1);opacity:.75}',
  '50%{transform:translate(-50%,-9px) scale(1.08);opacity:1}}',
  // A grave does not bob about like a living pig.
  '.dp-pig[data-stage="grave"]{animation:none;filter:grayscale(.35) drop-shadow(0 4px 6px rgba(61,52,40,.3))}',
  '.dp-pig[data-stage="box"]{animation:dp-box-wobble 3.2s ease-in-out infinite}',
  '@keyframes dp-box-wobble{0%,100%{transform:rotate(0)}30%{transform:rotate(-4deg)}',
  '45%{transform:rotate(3deg)}60%{transform:rotate(-2deg)}}',

  // Patting squashes the pig flat. Short, so rapid clicking keeps up.
  '[data-dsh-pig] .dp-pig[data-react="pet"]{animation-name:dp-squash;animation-duration:.42s}',
  '@keyframes dp-squash{0%{transform:scale(1,1)}35%{transform:scale(1.16,.74) translateY(2px)}',
  '60%{transform:scale(.94,1.08) translateY(-3px)}100%{transform:scale(1,1)}}',

  /* ---------- speech bubble ---------- */
  // `z-index` matters: the pig comes later in the DOM, so without it the pig
  // paints over the bubble whenever the two boxes overlap — which is exactly
  // what happened when collapsed and the scene was only as wide as the pig.
  '.dp-bubble{position:absolute;right:8px;top:7px;z-index:2;max-width:162px;padding:6px 10px;',
  'border-radius:var(--ac-radius-sm);font-size:10.5px;font-weight:600;line-height:1.45;',
  'color:var(--ac-text-body);background:var(--ac-bg-input);',
  'border:2px solid var(--ac-border-light);box-shadow:var(--ac-shadow-sm)}',
  // Tail drawn as a small rotated square so the 2px border stays continuous.
  '.dp-bubble::after{content:"";position:absolute;left:14px;bottom:-6px;width:8px;height:8px;',
  'background:var(--ac-bg-input);border-right:2px solid var(--ac-border-light);',
  'border-bottom:2px solid var(--ac-border-light);transform:rotate(45deg)}',
  // Reply buttons under a line: small pills, the mint of the primary colour
  // without the 3D base, which the spec keeps for real primary buttons.
  '.dp-bubble-replies{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}',
  // 猪头上的日常气泡（签到 / 礼包）：不用新颜色，沿用主色与卡片底色。
  '.dp-daily{position:absolute;top:-6px;left:50%;transform:translateX(-50%);',
  'font:inherit;font-size:15px;line-height:1;padding:3px 7px;cursor:pointer;',
  'border:2px solid var(--ac-border);border-radius:50px;background:var(--ac-bg-card);',
  'box-shadow:0 3px 0 rgba(61,52,40,.14);animation:dp-bob 2.4s var(--ac-ease) infinite}',
  '.dp-daily:hover{border-color:var(--ac-border-hover)}',
  '.dp-daily:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}',
  '@keyframes dp-bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-3px)}}',
  // 日记：折叠时只有首句，展开是全文。
  '.dp-diary{cursor:pointer}',
  '.dp-diary[data-open="true"] .dp-diary-full{display:block}',
  '.dp-diary-full{margin-top:4px;line-height:1.5}',
  '.dp-reply{font:inherit;font-size:10px;font-weight:700;padding:2px 9px;cursor:pointer;',
  'border-radius:var(--ac-pill);border:2px solid var(--ac-border-light);background:var(--ac-bg);',
  'color:var(--ac-text);transition:border-color .15s var(--ac-ease)}',
  '.dp-reply:hover{border-color:var(--ac-border-hover)}',
  '.dp-reply:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}',
  // Collapsed, the scene is exactly the pig, so a bubble drawn inside it
  // would sit on the pig's face. Float it above the head with the tail
  // pointing down, anchored to the right edge so it can never run off the
  // window. The hearts rise from behind it.
  '[data-dsh-pig][data-open="false"] .dp-bubble{top:auto;bottom:calc(100% + 8px);',
  'left:auto;right:0;max-width:230px}',
  '[data-dsh-pig][data-open="false"] .dp-bubble::after{left:auto;right:26px;',
  'top:100%;bottom:auto;margin:0;transform:rotate(45deg);',
  'border:0;border-right:2px solid var(--ac-border-light);',
  'border-bottom:2px solid var(--ac-border-light)}',

  /* ---------- icon bar: the library sidebar, laid on its side ---------- */
  '.dp-bar{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:8px;',
  'background:var(--ac-bg-content);border-top:2px solid var(--ac-border-light);',
  'border-bottom:2px solid var(--ac-border-light)}',
  '.dp-ico{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;',
  'font:inherit;font-size:9.5px;font-weight:600;color:var(--ac-text-muted);background:none;',
  'border:2px solid transparent;border-radius:var(--ac-radius-sm);padding:5px 1px;',
  'transition:all .2s var(--ac-ease)}',
  '.dp-ico span.dp-ico-e{font-size:18px;line-height:1}',
  '.dp-ico:hover{background:var(--ac-hover)}',
  '.dp-ico[data-active="true"]{background:var(--ac-active);border-color:#9db0d6;',
  'color:var(--ac-text);font-weight:700}',
  '.dp-ico:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}',
  '@keyframes dp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}',
  '.dp-ico[data-alert="true"] span.dp-ico-e{animation:dp-pulse 1.4s ease-in-out infinite}',

  /* ---------- content ---------- */
  '.dp-content{padding:12px 13px 13px;overflow-y:auto;flex:1 1 auto;min-height:0}',
  '.dp-content::-webkit-scrollbar{width:8px}',
  '.dp-content::-webkit-scrollbar-thumb{background:var(--ac-border-light);border-radius:4px}',
  '.dp-content::-webkit-scrollbar-track{background:transparent}',
  '.dp-title{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;',
  'margin-bottom:8px}',
  '.dp-title b{font-weight:700;color:var(--ac-text)}',
  '.dp-title span{color:var(--ac-text-2);font-size:10.5px;font-weight:600}',
  '.dp-row{display:flex;justify-content:space-between;font-size:11px;font-weight:600;',
  'color:var(--ac-text-body);margin:2px 0}',
  '.dp-row b{font-weight:700;color:var(--ac-text)}',

  /* ---------- attribute bars: pill track with an inset well ---------- */
  '.dp-meter{height:9px;border-radius:var(--ac-pill);background:var(--ac-bg-disabled);',
  'box-shadow:var(--ac-inset);overflow:hidden;margin:3px 0 8px}',
  '.dp-meter i{display:block;height:100%;border-radius:var(--ac-pill);',
  'background:var(--ac-warning);transition:width .35s var(--ac-ease)}',
  '.dp-meter.dp-mood i{background:#f8a6b2}',
  '.dp-meter.dp-clean i{background:#82d5bb}',
  '.dp-meter.dp-health i{background:#8ac68a}',
  '.dp-traits{display:flex;gap:10px;font-size:10.5px;font-weight:600;color:var(--ac-text-2);',
  'margin:8px 0 3px}',

  /* ---------- banners ---------- */
  '.dp-alert{margin:0 0 9px;padding:8px 10px;border-radius:var(--ac-radius-sm);',
  'font-size:10.5px;font-weight:600;line-height:1.55;border:2px solid}',
  '.dp-alert b{font-weight:700;color:var(--ac-text)}',
  '.dp-alert.dp-sick{background:#fdeeee;border-color:#f2c2c2}',
  '.dp-alert.dp-work{background:#eef1fb;border-color:#c3cdf0}',
  '.dp-alert.dp-dead{background:var(--ac-bg-disabled);border-color:var(--ac-border-light)}',
  '.dp-alert.dp-legacy{background:#fdf7e2;border-color:#f0dfa8}',

  /* ---------- buttons: secondary is a cream pill with soft elevation ---- */
  '.dp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
  '.dp-btn{display:flex;align-items:center;justify-content:center;gap:5px;font:inherit;',
  'font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--ac-text-body);',
  'cursor:pointer;padding:8px 6px;border-radius:var(--ac-pill);',
  'border:2px solid var(--ac-border);background:var(--ac-bg-input);',
  'box-shadow:var(--ac-shadow-sm);transition:all .2s var(--ac-ease)}',
  '.dp-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:var(--ac-shadow);',
  'border-color:var(--ac-border-hover)}',
  '.dp-btn:active:not(:disabled){transform:translateY(2px);box-shadow:var(--ac-shadow-sm)}',
  '.dp-btn:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}',
  '.dp-btn:disabled{background:var(--ac-bg-disabled);color:var(--ac-text-disabled);',
  'border-color:var(--ac-border-light);box-shadow:none;cursor:not-allowed}',
  '.dp-btn-wide{grid-column:1/-1}',
  '.dp-btn .dp-wait{color:var(--ac-text-2);font-size:10px;font-weight:600}',

  /* ---------- segmented control ---------- */
  '.dp-seg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:9px}',
  '.dp-seg button{font:inherit;font-size:10.5px;font-weight:600;color:var(--ac-text-muted);',
  'cursor:pointer;padding:6px 2px;border-radius:var(--ac-pill);',
  'border:2px solid var(--ac-border-light);background:var(--ac-bg-input);',
  'transition:all .2s var(--ac-ease)}',
  '.dp-seg button:hover{background:var(--ac-hover)}',
  '.dp-seg button[data-active="true"]{background:var(--ac-active);border-color:#9db0d6;',
  'color:var(--ac-text);font-weight:700}',

  /* ---------- list rows ---------- */
  // minmax(0,1fr): a long nowrap line must ellipsize, not widen the panel.
  '.dp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
  '.dp-list{display:flex;flex-direction:column;gap:7px}',
  '.dp-shelf{margin:9px 0 1px;font-size:10px;font-weight:700;color:var(--ac-text-2);',
  'letter-spacing:.04em}',
  '.dp-shelf:first-child{margin-top:0}',
  '.dp-item{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;',
  'color:var(--ac-text-body);padding:7px 9px;border-radius:var(--ac-radius-sm);',
  'background:var(--ac-bg-content);border:2px solid var(--ac-border-light)}',
  '.dp-item .dp-grow{flex:1;min-width:0}',
  '.dp-item .dp-dim{color:var(--ac-text-2);font-size:10px;font-weight:500;overflow:hidden;',
  'text-overflow:ellipsis;white-space:nowrap}',
  '.dp-item.dp-wanted{background:#fdf7e2;border-color:var(--ac-warning)}',
  // B6 talk row: name + 改 + 免打扰, and the inline name input.
  '.dp-talk{gap:6px;margin-top:8px}',
  '.dp-talk>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dp-mini-plain{background:var(--ac-bg-input);color:var(--ac-text);border:2px solid var(--ac-border-light);box-shadow:none}',
  '.dp-mini-plain:hover:not(:disabled){background:var(--ac-hover)}',
  '.dp-input{flex:1;min-width:0;font:inherit;font-size:11px;padding:3px 8px;border-radius:var(--ac-pill);',
  'border:2px solid var(--ac-border);background:var(--ac-bg-input);color:var(--ac-text)}',
  '.dp-input:focus{outline:2px solid var(--ac-primary);outline-offset:1px}',

  /* ---------- primary buttons: teal pill with the game 3D bottom edge --- */
  '.dp-mini{font:inherit;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:#fff;',
  'cursor:pointer;padding:6px 13px;border-radius:var(--ac-pill);',
  'border:2px solid var(--ac-primary-active);background:var(--ac-primary);',
  'box-shadow:0 3px 0 0 var(--ac-primary-active);transition:all .15s var(--ac-ease)}',
  '.dp-mini:hover:not(:disabled){background:var(--ac-primary-hover);transform:translateY(-1px);',
  'box-shadow:0 4px 0 0 var(--ac-primary-active)}',
  '.dp-mini:active:not(:disabled){transform:translateY(2px);',
  'box-shadow:0 1px 0 0 var(--ac-primary-active)}',
  '.dp-mini:focus-visible{outline:2px solid var(--ac-primary);outline-offset:2px}',
  '.dp-mini:disabled{background:var(--ac-bg-disabled);color:var(--ac-text-disabled);',
  'border-color:var(--ac-border-light);box-shadow:none;cursor:not-allowed}',

  /* ---------- the care item picker ---------- */
  '.dp-pick{margin-top:9px;padding:9px 10px;border-radius:var(--ac-radius-sm);',
  'background:var(--ac-bg-content);border:2px solid var(--ac-border-light)}',
  '.dp-pick-head{font-size:10.5px;font-weight:700;color:var(--ac-text);margin-bottom:7px}',
  '.dp-cancel{display:block;width:100%;margin-top:8px;font:inherit;font-size:10.5px;',
  'font-weight:600;color:var(--ac-text-2);cursor:pointer;padding:5px;',
  'border-radius:var(--ac-pill);border:2px solid var(--ac-border-light);',
  'background:var(--ac-bg-input);transition:all .2s var(--ac-ease)}',
  '.dp-cancel:hover{background:var(--ac-hover);color:var(--ac-text)}',
  '.dp-count{margin-left:2px;font-size:9px;font-weight:700;color:var(--ac-text-2);',
  'background:var(--ac-bg-content);border-radius:var(--ac-pill);padding:0 5px}',
  '.dp-btn[data-open-picker="true"]{background:var(--ac-active);border-color:#9db0d6}',
  '.dp-seg button[data-locked="true"]{color:var(--ac-text-disabled);',
  'border-style:dashed;background:var(--ac-bg-disabled)}',
  '.dp-seg button[data-locked="true"]:hover{background:var(--ac-bg-disabled)}',
  '.dp-locked{margin:0 0 8px;font-size:10.5px;font-weight:600;line-height:1.5;',
  'color:var(--ac-text-body);background:#fdf7e2;border:2px solid #f0dfa8;',
  'border-radius:var(--ac-radius-sm);padding:6px 9px}',
  // The per-job gate reads as a lock, not as another grey stat line: a
  // threshold the pig cannot see is indistinguishable from a broken button.
  '.dp-lock{font-size:10px;font-weight:700;line-height:1.5;color:#9a6b1f}',

  '.dp-empty{color:var(--ac-text-2);font-size:10.5px;font-weight:500;line-height:1.65;',
  'margin-top:4px}',
  '.dp-memo{margin-top:9px;padding-top:8px;border-top:2px solid var(--ac-border-light);',
  'color:var(--ac-text-muted);font-size:10px;font-weight:500;line-height:1.55;',
  'white-space:pre-wrap;word-break:break-word}',

  /* ---------- particles and toast ---------- */
  '.dp-fx{position:absolute;z-index:1;pointer-events:none;font-size:17px;',
  'animation:dp-rise 1.1s ease-out forwards}',
  '@keyframes dp-rise{0%{opacity:0;transform:translate(var(--dx0,0),4px) scale(.5)}18%{opacity:1}',
  '100%{opacity:0;transform:translate(var(--dx,0),-56px) scale(1.15)}}',
  '.dp-toast{position:absolute;left:9px;right:9px;top:8px;padding:8px 11px;',
  'border-radius:var(--ac-radius-sm);font-size:10.5px;font-weight:600;line-height:1.5;',
  'color:var(--ac-text);background:var(--ac-bg-input);border:2px solid var(--ac-border);',
  'box-shadow:var(--ac-shadow);pointer-events:none;white-space:normal;',
  'animation:dp-toast 4.6s var(--ac-ease) forwards}',
  '@keyframes dp-toast{0%{opacity:0;transform:translateY(-8px)}8%{opacity:1;transform:translateY(0)}',
  '82%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}',
].join('')
