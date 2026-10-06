// @ts-check
import { str } from './values.js'
/** These milestones deserve the pig's bubble, without replacing the action's own line. */
export function showMilestoneNotice(ctx, event) {
  if (event.kind === 'achievement') {
    ctx.showBubble(str(event.text, '获得小猪徽章'), 4500)
    return true
  }
  if (event.kind === 'interest') {
    ctx.showBubble(str(event.text, '兴趣课学完啦'), 4000)
    ctx.react('away', 900)
    return true
  }
  return false
}
