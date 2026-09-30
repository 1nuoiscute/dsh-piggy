// @ts-check
/** Select sprites for the active activity or transient reaction. */
import { ART_URL } from './constants.js'

const REACTION_ART = { feed: 'eat', bathe: 'bathe', play: 'play', pet: 'pet', cure: 'relaxed', levelup: 'relaxed' }
const ACTIVITY_ART = { work: 'work', study: 'study', interest: 'study', trip: 'trip' }

/** @param {object} pig
 * @param {object} image
 * @returns {void}
 */
export function syncPigArt(pig, image) {
  var base = pig.getAttribute('data-art')
  if (!base) return
  var art = base
  if (base === 'pig-king') {
    var action = REACTION_ART[pig.getAttribute('data-react')]
      || ACTIVITY_ART[pig.getAttribute('data-activity')]
    if (action) art += '-' + action
  }
  var src = ART_URL + art + '.svg'
  if (image.src !== src) image.src = src
}
