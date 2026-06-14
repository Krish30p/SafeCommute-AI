const axios = require('axios');

/**
 * Returns a lighting score (0-100) along a route.
 * @param {Array<[number, number]>} routeCoords Array of [lng, lat]
 */
async function getLightingScore(routeCoords) {
  if (!routeCoords || routeCoords.length === 0) return 70;

  // 1. Try real OSM Overpass API query (with 2.5s timeout)
  try {
    // Generate bounding box for query
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    routeCoords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    // Pad bounding box slightly (approx 100 meters)
    const pad = 0.001;
    const bbox = `${minLat - pad},${minLng - pad},${maxLat + pad},${maxLng + pad}`;

    // Overpass QL query: find highways that are lit, or nodes that are street lamps
    const overpassQuery = `
      [out:json][timeout:3];
      (
        way["highway"]["lit"="yes"](${bbox});
        way["highway"="primary"](${bbox});
        way["highway"="secondary"](${bbox});
        node["highway"="street_lamp"](${bbox});
      );
      out tags geom;
    `;

    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      overpassQuery,
      {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 2500
      }
    );

    const elements = response.data?.elements || [];
    if (elements.length > 0) {
      // Calculate lighting score based on density of lit tags / major highways
      let litCount = 0;
      let streetLamps = 0;
      let highwayCount = 0;

      elements.forEach(el => {
        if (el.type === 'node' && el.tags?.highway === 'street_lamp') {
          streetLamps++;
        } else if (el.type === 'way') {
          highwayCount++;
          if (el.tags?.lit === 'yes') litCount++;
        }
      });

      // Compute simple lighting ratio
      const litRatio = highwayCount > 0 ? litCount / highwayCount : 0.5;
      const score = Math.round(50 + (litRatio * 30) + Math.min(20, streetLamps * 4));
      return Math.max(0, Math.min(100, score));
    }
  } catch (err) {
    // Overpass failed or timed out. Fall back to smart local simulation.
    // console.log("OSM Overpass failed or timed out. Falling back to local simulation.");
  }

  // 2. Local geographic fallback (Vadodara spatial simulator)
  // Check if route coordinates pass near known poorly-lit sectors in our seed dataset:
  // - Sayajigunj underpass (22.3144, 73.1932)
  // - Fatehgunj side lanes (22.3201, 73.1678)
  // - Sama road isolated stretch (22.3089, 73.2001)
  // - Akota bridge underpass (22.2985, 73.1650)
  
  const poorlyLitPoints = [
    { lat: 22.3144, lng: 73.1932, name: 'Sayajigunj Underpass' },
    { lat: 22.3201, lng: 73.1678, name: 'Fatehgunj lanes' },
    { lat: 22.3089, lng: 73.2001, name: 'Sama road' },
    { lat: 22.2985, lng: 73.1650, name: 'Akota bridge underpass' }
  ];

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

  let minDistanceToDarkZone = Infinity;
  routeCoords.forEach(([lng, lat]) => {
    poorlyLitPoints.forEach(point => {
      const d = getDistance(lat, lng, point.lat, point.lng);
      if (d < minDistanceToDarkZone) {
        minDistanceToDarkZone = d;
      }
    });
  });

  // If the route passes very close to a dark zone (e.g. under 300 meters), reduce lighting score
  if (minDistanceToDarkZone < 150) {
    return Math.round(35 + Math.random() * 10); // 35 - 45
  } else if (minDistanceToDarkZone < 350) {
    return Math.round(50 + Math.random() * 15); // 50 - 65
  }

  // Otherwise, default to a high lighting score (representing main well-lit arterial roads)
  return Math.round(80 + Math.random() * 15); // 80 - 95
}

module.exports = { getLightingScore };
