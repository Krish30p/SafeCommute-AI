const { Incident } = require('../db');
const osmService = require('./osmService');
const gtfsService = require('./gtfsService');

/**
 * Calculates safety score based on route coordinates and options.
 * @param {Array<[number, number]>} routeCoordinates Array of [lng, lat]
 * @param {object} options { timeOfDay: Date, womenSafetyMode: boolean }
 */
async function calculateSafetyScore(routeCoordinates, options = {}) {
  const timeOfDay = options.timeOfDay ? new Date(options.timeOfDay) : new Date();
  const womenSafetyMode = !!options.womenSafetyMode;

  const hour = timeOfDay.getHours();

  // --- Base weights ---
  const weights = {
    lighting: womenSafetyMode ? 0.30 : 0.25,
    transitCoverage: womenSafetyMode ? 0.25 : 0.20,
    incidentDensity: 0.25,
    timeOfDay: womenSafetyMode ? 0.15 : 0.20,
    crowdDensity: womenSafetyMode ? 0.05 : 0.10,
  };

  // --- Time of day score (0–100) ---
  // 6am–8pm = safe, degrades after 8pm, worst at midnight
  const timeScore = hour >= 6 && hour <= 20
    ? 100
    : hour > 20 && hour <= 22
    ? 70
    : hour > 22 || hour < 4
    ? 30
    : 50;

  // --- Lighting score: query OSM Overpass for lit=yes tags along route ---
  let lightingScore = 70;
  try {
    lightingScore = await osmService.getLightingScore(routeCoordinates);
  } catch (err) {
    console.error("Error in osmService.getLightingScore:", err.message);
  }

  // --- Transit coverage: check GTFS stops within 300m of route ---
  let transitScore = 50;
  try {
    transitScore = await gtfsService.getTransitCoverageScore(routeCoordinates);
  } catch (err) {
    console.error("Error in gtfsService.getTransitCoverageScore:", err.message);
  }

  // --- Incident density: query incidents table within 500m of route ---
  let incidentScore = 100;
  try {
    incidentScore = await getIncidentScore(routeCoordinates);
  } catch (err) {
    console.error("Error in getIncidentScore:", err.message);
  }

  // --- Crowd density: approximated from transit coverage + time ---
  const crowdScore = Math.min(100, Math.round((transitScore * 0.6) + (timeScore * 0.4)));

  // --- Weighted final score ---
  const finalScore = Math.round(
    (lightingScore * weights.lighting) +
    (transitScore * weights.transitCoverage) +
    (incidentScore * weights.incidentDensity) +
    (timeScore * weights.timeOfDay) +
    (crowdScore * weights.crowdDensity)
  );

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    breakdown: {
      lighting: { score: lightingScore, weight: weights.lighting },
      transitCoverage: { score: transitScore, weight: weights.transitCoverage },
      incidentDensity: { score: incidentScore, weight: weights.incidentDensity },
      timeOfDay: { score: timeScore, weight: weights.timeOfDay },
      crowdDensity: { score: crowdScore, weight: weights.crowdDensity },
    }
  };
}

/**
 * Calculates incident density score.
 * Queries incidents within 500m of any route coordinate.
 * Applies time-decay: incidents older than 48hrs = half weight.
 * More incidents = lower score.
 */
async function getIncidentScore(routeCoords) {
  if (!routeCoords || routeCoords.length === 0) return 100;

  let incidents;
  try {
    // Query MongoDB using $geoWithin and $centerSphere with 500 meters (in radians = 500 / 6378100)
    // We check if an incident's location is within 500m of any route coordinate using $or.
    incidents = await Incident.find({
      $or: routeCoords.map(([lng, lat]) => ({
        location: {
          $geoWithin: {
            $centerSphere: [ [lng, lat], 500 / 6378100 ]
          }
        }
      }))
    });
  } catch (err) {
    console.error("Failed querying incidents for score, returning default 100:", err.message);
    return 100;
  }

  const rows = incidents || [];
  if (rows.length === 0) return 100;

  const now = new Date();
  const decayedWeight = rows.reduce((sum, inc) => {
    const reported = new Date(inc.reported_at);
    const hours = Math.max(0, (now - reported) / (1000 * 60 * 60));
    
    // Ensure weight is a valid number (guard against corrupted data)
    const weight = typeof inc.weight === 'number' ? inc.weight : 1.0;
    const decay = Math.exp(-0.015 * hours);
    return sum + (weight * decay);
  }, 0);

  const incidentScoreVal = Math.round(100 - (decayedWeight * 20));
  return Math.max(0, Math.min(100, incidentScoreVal));
}

module.exports = { calculateSafetyScore };
