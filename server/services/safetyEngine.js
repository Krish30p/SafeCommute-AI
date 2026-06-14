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

  // Query incidents within 500m of route line
  let incidents;
  try {
    if (db.getMode() === 'POSTGRES') {
      // Try PostGIS spatial query first
      try {
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
      } catch (postgisErr) {
        // PostGIS not installed — fall back to fetching all incidents
        // and filtering by distance in JS (same logic as mock mode)
        console.warn("PostGIS unavailable, using JS distance filter for incidents:", postgisErr.message);
        incidents = await db.query(
          'SELECT *, EXTRACT(EPOCH FROM (NOW() - reported_at))/3600 AS hours_ago FROM incidents'
        );
        // Filter by distance to route in JS
        const allRows = incidents.rows || [];
        incidents = {
          rows: allRows.filter(inc => {
            return routeCoords.some(([lng, lat]) => {
              const dist = haversineDistance(inc.lat, inc.lng, lat, lng);
              return dist <= 500;
            });
          })
        };
      }
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
    const hours = Number(inc.hours_ago) || 0;
    // Ensure weight is a valid number (guard against corrupted data)
    const weight = typeof inc.weight === 'number' ? inc.weight : 1.0;
    const decay = Math.exp(-0.015 * hours);
    return sum + (weight * decay);
  }, 0);

  const incidentScoreVal = Math.round(100 - (decayedWeight * 20));
  return Math.max(0, Math.min(100, incidentScoreVal));
}

// Haversine distance helper (meters)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { calculateSafetyScore };
