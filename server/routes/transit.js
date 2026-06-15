const express = require('express');
const router = express.Router();
const axios = require('axios');
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

// Helper to fetch real transit stops from Mapbox Geocoding API
async function fetchRealTransitFromMapbox(lat, lng, type, mapboxToken) {
  const queryMap = {
    bus: 'bus stop',
    metro: 'metro station',
    train: 'railway station'
  };

  const searchQuery = queryMap[type] || 'transit';
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json`;

  try {
    const response = await axios.get(url, {
      params: {
        access_token: mapboxToken,
        proximity: `${lng},${lat}`,
        limit: 5
      }
    });

    if (response.data && response.data.features) {
      return response.data.features.map(f => {
        // Extract a clean name from the place_name
        const parts = f.place_name.split(',');
        const name = parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : f.place_name;

        // Generate mock routes for the real stop to keep it interactive
        let routes = [];
        if (type === 'bus') {
          routes = [`${Math.floor(Math.random() * 80) + 10}`, `${Math.floor(Math.random() * 80) + 10}A`].slice(0, 1 + Math.floor(Math.random() * 2));
        } else if (type === 'metro') {
          routes = ['Metro Line 1'];
        } else {
          routes = ['Express', 'Superfast', 'Intercity'].slice(0, 1 + Math.floor(Math.random() * 2));
        }

        return {
          name,
          type,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          routes
        };
      });
    }
  } catch (err) {
    console.warn(`[Transit] Mapbox Geocoding failed for type ${type}:`, err.message);
  }
  return [];
}

// GET /api/transit/nearby - Fetch nearby buses, metro, trains based on current GPS
router.get('/nearby', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing GPS coordinates (lat, lng)" });
  }

  const uLat = Number(lat);
  const uLng = Number(lng);
  const mapboxToken = process.env.VITE_MAPBOX_TOKEN;

  try {
    let finalStops = [];

    // Query Mapbox Geocoding if key is present
    if (mapboxToken && mapboxToken.trim() !== "" && !mapboxToken.includes("xxxx")) {
      const [realBuses, realMetros, realTrains] = await Promise.all([
        fetchRealTransitFromMapbox(uLat, uLng, 'bus', mapboxToken),
        fetchRealTransitFromMapbox(uLat, uLng, 'metro', mapboxToken),
        fetchRealTransitFromMapbox(uLat, uLng, 'train', mapboxToken)
      ]);

      const allRealStops = [...realBuses, ...realMetros, ...realTrains].map(stop => {
        const distance = getDistance(uLat, uLng, stop.lat, stop.lng);
        return { ...stop, distance };
      });

      if (allRealStops.length > 0) {
        finalStops = allRealStops;
      }
    }

    // Fallback to pre-seeded stops if no real stops are found close by
    if (finalStops.length === 0) {
      finalStops = transitStops.map(stop => {
        const distance = getDistance(uLat, uLng, stop.lat, stop.lng);
        return { ...stop, distance };
      });
    }

    // Sort by distance to user
    finalStops.sort((a, b) => a.distance - b.distance);

    const nearbyOptions = [];

    // Take top 8 closest stops and format simulated departures/arrivals
    finalStops.slice(0, 8).forEach((stop, index) => {
      const baseMinutes = 3 + (index * 4) + Math.floor(Math.random() * 3);
      
      if (stop.type === 'bus') {
        stop.routes.forEach((route, routeIndex) => {
          const etaMinutes = baseMinutes + (routeIndex * 5);
          nearbyOptions.push({
            id: `${stop.name}-${route}`,
            type: 'bus',
            name: `Route ${route} — ${stop.name}`,
            info: `Arrives in ${etaMinutes} mins`,
            etaMinutes,
            distance: Math.round(stop.distance)
          });
        });
      } else if (stop.type === 'metro') {
        nearbyOptions.push({
          id: `${stop.name}-m1`,
          type: 'metro',
          name: `${stop.name} — Platform ${index % 2 === 0 ? '1' : '2'}`,
          info: `Next train: ${baseMinutes} mins`,
          etaMinutes: baseMinutes,
          distance: Math.round(stop.distance)
        });
      } else if (stop.type === 'train') {
        const now = new Date();
        stop.routes.forEach((route, routeIndex) => {
          const etaMinutes = baseMinutes + (routeIndex * 15);
          const routeDepTime = new Date(now.getTime() + etaMinutes * 60 * 1000);
          const routeDepStr = routeDepTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          
          nearbyOptions.push({
            id: `${stop.name}-${route}`,
            type: 'train',
            name: `${stop.name} (${route})`,
            info: `Departs at ${routeDepStr}`,
            etaMinutes,
            distance: Math.round(stop.distance)
          });
        });
      }
    });

    // Sort by ETA
    nearbyOptions.sort((a, b) => a.etaMinutes - b.etaMinutes);

    res.json(nearbyOptions);

  } catch (err) {
    console.error("Failed to fetch transit stops:", err.message);
    res.status(500).json({ error: "Failed to generate transit updates" });
  }
});

module.exports = router;
