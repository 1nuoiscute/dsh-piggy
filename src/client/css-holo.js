// @ts-check
/** 盲盒寻访与扩展图鉴共用的闪卡样式。 */
export const CSS_HOLO = [
  '.dp-holo{--c:#aeb9c4;box-sizing:border-box;position:relative;display:block;width:100%;min-width:0;aspect-ratio:3/4;padding:4px;border:0;border-radius:14px;background:linear-gradient(145deg,var(--c),color-mix(in srgb,var(--c) 55%,#fff));box-shadow:0 4px 0 color-mix(in srgb,var(--c) 70%,#6b5a40),0 8px 14px rgba(61,52,40,.18);font:inherit;cursor:pointer;transform:perspective(500px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .15s ease-out;transform-style:preserve-3d}',
  '.dp-holo[data-s="4"]{--c:#b48cf2}.dp-holo[data-s="5"]{--c:#f2b632}.dp-holo[data-s="6"]{--c:#ff7a2f}',
  '.dp-holo-face{position:relative;box-sizing:border-box;display:grid;grid-template-rows:1fr auto auto;justify-items:center;width:100%;height:100%;padding:6px 3px 5px;overflow:hidden;border-radius:10px;background:radial-gradient(circle at 50% 35%,#fff 0 30%,color-mix(in srgb,var(--c) 25%,#fff8e8) 100%)}',
  '.dp-holo-face::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 20%,rgba(255,120,200,.28) 35%,rgba(120,220,255,.3) 45%,rgba(255,240,140,.3) 55%,transparent 70%);background-size:250% 250%;mix-blend-mode:screen;opacity:.7;animation:dp-holo-shine 6s linear infinite}',
  '.dp-holo:hover .dp-holo-face::after{animation:none;background-position:var(--hx,50%) var(--hy,50%)}',
  '.dp-holo-doll{position:relative;z-index:1;align-self:center;font-size:30px;line-height:1;transform:translateZ(26px);filter:drop-shadow(0 6px 0 rgba(0,0,0,.08)) drop-shadow(0 7px 5px rgba(61,52,40,.28))}',
  '.dp-holo-name{z-index:1;max-width:100%;font-size:10px;color:var(--ac-text,#794f27);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dp-holo-stars{z-index:1;font-size:8px;letter-spacing:-1px;color:var(--c)}',
  '.dp-holo[data-missing="true"] .dp-holo-doll{filter:brightness(0) opacity(.14)}.dp-holo[data-missing="true"] .dp-holo-face::after{opacity:0}.dp-holo[data-missing="true"] .dp-holo-name{color:var(--ac-text-2,#9f927d)}',
  '.dp-holo-large{width:110px;flex:none}.dp-holo-large .dp-holo-doll{font-size:46px}.dp-holo-large .dp-holo-name{font-size:11px}',
  '.dp-holo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.dp-holo-tier{font-size:12px;color:var(--ac-text);margin:12px 2px 8px}',
  '.dp-holo-detail{display:flex;gap:12px;align-items:center;padding:10px;margin:10px 0;border-radius:18px;background:var(--ac-bg-input);border:2px solid var(--ac-border-light)}',
  '.dp-holo-copy{min-width:0;display:grid;gap:5px;color:var(--ac-text)}.dp-holo-copy b{font-size:14px}.dp-holo-rating{color:#ff7a2f}.dp-holo-copy p{margin:0;font-size:11px;line-height:1.5}',
  '.dp-holo-potential{display:flex;gap:3px}.dp-holo-potential i{width:13px;height:8px;border-radius:3px;background:#e9dfca}.dp-holo-potential i[data-on="true"]{background:#ff9a58}',
  '@keyframes dp-holo-shine{from{background-position:150% 50%}to{background-position:-100% 50%}}',
  '@media (prefers-reduced-motion:reduce){.dp-holo,.dp-holo-face::after{animation:none!important;transition:none!important;transform:none!important}}',
].join('')
