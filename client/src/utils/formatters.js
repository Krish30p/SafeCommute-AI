/**
 * Formats distance in meters to standard km or m format.
 * @param {number} meters 
 */
export function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Formats seconds into human-readable duration strings.
 * @param {number} seconds 
 */
export function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs} h ${remainingMins} min` : `${hrs} h`;
  }
  return `${mins} min`;
}

/**
 * Formats timestamp to local HH:MM AM/PM representation.
 * @param {string|Date} dateStr 
 */
export function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
