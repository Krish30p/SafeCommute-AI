const db = require('../db');
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

  // Convert route coordinates to WKT LINESTRING
  const wktLineString = `LINESTRING(${routeCoords.map(c => `${c[0]} ${c[1]}`).join(', ')})`;

  // Query incidents within 500m of route line (using Geography types)
  let incidents;
  try {
    // Check database mode to optimize Postgres specific GIS functions vs simulated query
    if (db.getMode() === 'POSTGRES') {
      incidents = await db.query(`
        SELECT *, 
          EXTRACT(EPOCH FROM (NOW() - reported_at))/3600 AS hours_ago
        FROM incidents
        WHERE ST_DWithin(
          ST_MakePoint(lng, lat)::geography,
          ST_GeomFromText($1, 4326)::geography,
          500
        )
      `, [wktLineString]);
    } else {
      // In Mock mode, we pass the WKT to runMockQuery which parses it out
      incidents = await db.query(`
        SELECT * FROM incidents WHERE ST_DWithin($1)
      `, [wktLineString]);
    }
  } catch (err) {
    console.error("Failed querying incidents for score, returning default 100:", err.message);
    return 100;
  }

  const rows = incidents.rows || [];
  if (rows.length === 0) return 100;

  const decayedWeight = rows.reduce((sum, inc) => {
    // Time decay: incidents older than 48 hours receive a reduction.
    // Exponential decay: e^(-0.03 * hours_ago). At 48 hours, e^(-0.03*48) = e^(-1.44) ≈ 0.23 (less than half).
    // Let's use the decay formula:
    const hours = Number(inc.hours_ago) || 0;
    const decay = Math.exp(-0.015 * hours); // e^(-0.015 * 48) = e^(-0.72) ≈ 0.48 (~half weight at 48 hours)
    return sum + ((inc.weight || 1.0) * decay);
  }, 0);

  // Score decreases as decayed weight increases. Max penalty: decayedWeight * 20.
  // 1 major incident with full weight (1.0) decays to 0.5 after 2 days.
  // A weight sum of 5.0 reduces score to 0.
  const incidentScoreVal = Math.round(100 - (decayedWeight * 20));
  return Math.max(0, Math.min(100, incidentScoreVal));
}

module.exports = { calculateSafetyScore };
