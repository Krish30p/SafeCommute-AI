const { transitStops } = require('../db/seed');

// Haversine formula for distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = (lat2-lat1) * Math.PI / 180;
  const dLon = (lon2-lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculates a transit coverage score (0-100) along a route.
 * Evaluates the percentage of route checkpoints that are within 300 meters of a transit stop.
 * @param {Array<[number, number]>} routeCoords Array of [lng, lat]
 */
async function getTransitCoverageScore(routeCoords) {
  if (!routeCoords || routeCoords.length === 0) return 50;

  // Sample the route to 15-20 points max to save computation time
  const sampleInterval = Math.max(1, Math.floor(routeCoords.length / 15));
  const samplePoints = [];
  for (let i = 0; i < routeCoords.length; i += sampleInterval) {
    samplePoints.push(routeCoords[i]);
  }
  // Ensure the last point is included
  if (routeCoords.length > 1 && samplePoints[samplePoints.length - 1] !== routeCoords[routeCoords.length - 1]) {
    samplePoints.push(routeCoords[routeCoords.length - 1]);
  }

  let coveredCount = 0;

  samplePoints.forEach(([lng, lat]) => {
    // Check if there is any transit stop within 300 meters of this sample point
    const hasTransitNearby = transitStops.some(stop => {
      const dist = getDistance(lat, lng, stop.lat, stop.lng);
      return dist <= 300; // 300 meters threshold
    });

    if (hasTransitNearby) {
      coveredCount++;
    }
  });

  // Calculate percentage of coverage
  const ratio = coveredCount / samplePoints.length;
  
  // Scale the score. We'll give it a baseline of 30 if no transit, up to 100 for full coverage.
  const score = Math.round(30 + (ratio * 70));
  return Math.max(0, Math.min(100, score));
}

module.exports = { getTransitCoverageScore };
