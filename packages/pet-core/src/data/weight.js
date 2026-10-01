// @ts-check
/** Body-weight tuning, separate from life stages and earned forms. */
export const WEIGHT_RULES = Object.freeze({
  baseG: 1360,
  // 90g per meal / 22 satiety, 4.8 satiety lost hourly, 100 growth hourly.
  growthGPerXp: 90 * 4.8 / 22 / 100,
  fatRatio: 1.6,
  restoreRatio: 1.35,
  sizeMultiplier: 1.5,
  playLoss: 0.03,
  playsPerDay: 10,
  workLossPerHour: 0.03,
  dailyLoss: 0.02,
})
