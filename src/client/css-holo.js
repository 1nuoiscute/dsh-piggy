// @ts-check
/** 盲盒寻访与扩展图鉴共用的闪卡样式。 */
export const CSS_HOLO = [
  '.dp-holo{--c:#aeb9c4;box-sizing:border-box;position:relative;display:block;width:100%;min-width:0;aspect-ratio:3/4;padding:4px;border:0;border-radius:14px;background:linear-gradient(145deg,var(--c),var(--cl,#eef2f5));box-shadow:0 0 12px color-mix(in srgb,var(--c) 70%,transparent),0 5px 10px rgba(61,52,40,.14);font:inherit;cursor:pointer;transform:perspective(500px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .15s ease-out;transform-style:preserve-3d}',
  '.dp-holo[data-s="4"]{--c:#b48cf2;--cl:#f3ecff}.dp-holo[data-s="5"]{--c:#f2b632;--cl:#fff4d6}.dp-holo[data-s="6"]{--c:#ff7a2f;--cl:#ffe6d6}.dp-holo[data-missing="true"]{box-shadow:0 3px 8px rgba(61,52,40,.1);filter:saturate(.55)}',
  '.dp-holo-face{position:relative;box-sizing:border-box;display:grid;grid-template-rows:1fr auto auto;justify-items:center;width:100%;height:100%;padding:6px 3px 5px;overflow:hidden;border-radius:10px;background:radial-gradient(circle at 50% 38%,#fff 0 34%,var(--cl,#f3f0e8) 100%)}.dp-holo-face::before{content:"";position:absolute;left:50%;top:60%;width:52%;height:7%;transform:translateX(-50%);border-radius:50%;background:rgba(120,90,60,.16)}',
  '.dp-holo-face::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 25%,rgba(255,140,210,.3) 40%,rgba(130,220,255,.32) 50%,rgba(255,240,150,.32) 60%,transparent 75%);background-size:260% 260%;opacity:.9;animation:dp-holo-shine 2.4s linear infinite}',
  '.dp-holo:hover .dp-holo-face::after{animation:none;background-position:var(--hx,50%) var(--hy,50%)}',
  '.dp-holo-doll{position:relative;z-index:1;align-self:center;font-size:30px;line-height:1;transform:translateZ(26px);filter:drop-shadow(0 4px 3px rgba(80,60,40,.25))}',
  '.dp-holo-name{z-index:1;max-width:100%;font-size:10px;font-weight:900;color:#6b4a2a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dp-holo-stars{z-index:1;font-size:8px;letter-spacing:-1px;color:var(--c)}',
  '.dp-holo[data-missing="true"] .dp-holo-doll{filter:brightness(0) opacity(.14)}.dp-holo[data-missing="true"] .dp-holo-face::after{opacity:0}.dp-holo[data-missing="true"] .dp-holo-name{color:var(--ac-text-2,#9f927d)}',
  '.dp-holo-large{width:110px;flex:none}.dp-holo-large .dp-holo-doll{font-size:46px}.dp-holo-large .dp-holo-name{font-size:11px}',
  '.dp-holo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.dp-holo-tier{font-size:12px;color:var(--ac-text);margin:12px 2px 8px}',
  '.dp-holo-detail{display:flex;gap:12px;align-items:center;padding:10px;margin:10px 0;border-radius:18px;background:var(--ac-bg-input);border:2px solid var(--ac-border-light)}',
  '.dp-holo-copy{min-width:0;display:grid;gap:5px;color:var(--ac-text)}.dp-holo-copy b{font-size:14px}.dp-holo-rating{color:#ff7a2f}.dp-holo-copy p{margin:0;font-size:11px;line-height:1.5}',
  '.dp-holo-potential{display:flex;gap:3px}.dp-holo-potential i{width:13px;height:8px;border-radius:3px;background:#e9dfca}.dp-holo-potential i[data-on="true"]{background:#ff9a58}',
  '@keyframes dp-holo-shine{from{background-position:100% 100%}to{background-position:0 0}}',
  '@media (prefers-reduced-motion:reduce){.dp-holo,.dp-holo-face::after{animation:none!important;transition:none!important;transform:none!important}}',
].join('')
