/**
 * Returns the HEX color for safety score thresholds.
 * @param {number} score Safety score from 0 to 100
 */
export function getScoreColorHex(score) {
  if (score >= 80) return '#1D9E75'; // safe Green
  if (score >= 50) return '#F59E0B'; // warn Amber
  return '#EF4444'; // danger Red
}

/**
 * Returns Tailwind text color classes for safety score thresholds.
 * @param {number} score
 */
export function getScoreTextColorClass(score) {
  if (score >= 80) return 'text-safeGreen';
  if (score >= 50) return 'text-warnAmber';
  return 'text-dangerRed';
}

/**
 * Returns Tailwind background color classes for safety score thresholds.
 * @param {number} score
 */
export function getScoreBgColorClass(score) {
  if (score >= 80) return 'bg-safeGreen';
  if (score >= 50) return 'bg-warnAmber';
  return 'bg-dangerRed';
}

/**
 * Returns text evaluation/label for scores.
 * @param {number} score
 */
export function getScoreLabel(score) {
  if (score >= 80) return 'Highly Safe';
  if (score >= 50) return 'Moderate Risk';
  return 'High Risk';
}
