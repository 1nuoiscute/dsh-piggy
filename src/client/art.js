// @ts-check
/**
 * 选立绘：有动作立绘的形态（加冕后的猪猪王等，见 data/evolution.js）在喂食、
 * 打工、上学、旅行时换成对应那张，照顾的反应盖过外出的样子，反应结束换回来。
 * 立绘来自 PR #2（作者 1nuoiscute）。
 * @module dsh-pig/client/art
 */
import { ART_URL } from './constants.js'

var REACTION_ART = { feed: 'eat', bathe: 'bathe', play: 'play', pet: 'pet', cure: 'relaxed', levelup: 'relaxed' }
var ACTIVITY_ART = { work: 'work', study: 'study', interest: 'study', trip: 'trip' }

/**
 * Point the pig's <img> at the sprite its attributes call for. Only touches
 * `src` when it changes, so polling never refetches the image.
 * @param {object} pig   the .dp-pig node (data-art / data-art-actions / data-react / data-activity)
 * @param {object} image the <img> inside it
 */
export function syncPigArt(pig, image) {
  var base = pig.getAttribute('data-art')
  if (!base) return
  var art = base
  if (pig.getAttribute('data-art-actions') === 'true') {
    var action = REACTION_ART[pig.getAttribute('data-react')] || ACTIVITY_ART[pig.getAttribute('data-activity')]
    if (action) art += '-' + action
  }
  var src = ART_URL + art + '.svg'
  if (image.getAttribute('src') !== src) image.src = src
}
