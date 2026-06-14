const express = require('express');
const router = express.Router();
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

// GET /api/transit/nearby - Fetch nearby buses, metro, trains based on current GPS
router.get('/nearby', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing GPS coordinates (lat, lng)" });
  }

  const uLat = Number(lat);
  const uLng = Number(lng);

  try {
    // Sort transit stops by distance to user
    const stopsWithDistance = transitStops.map(stop => {
      const distance = getDistance(uLat, uLng, stop.lat, stop.lng);
      return { ...stop, distance };
    });

    stopsWithDistance.sort((a, b) => a.distance - b.distance);

    // Take top 5 closest stops and format simulated departures/arrivals
    const nearbyOptions = [];

    // Let's create unique schedules for each stop based on its type
    stopsWithDistance.slice(0, 5).forEach((stop, index) => {
      const baseMinutes = 3 + (index * 4) + Math.floor(Math.random() * 3);
      
      if (stop.type === 'bus') {
        // Generate simulated bus arrival schedules
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
        // Generate simulated metro schedules
        nearbyOptions.push({
          id: `${stop.name}-m1`,
          type: 'metro',
          name: `${stop.name} — Platform ${index % 2 === 0 ? '1' : '2'}`,
          info: `Next train: ${baseMinutes} mins`,
          etaMinutes: baseMinutes,
          distance: Math.round(stop.distance)
        });
      } else if (stop.type === 'train') {
        // Generate train departure times
        const now = new Date();
        const departureTime = new Date(now.getTime() + baseMinutes * 60 * 1000);
        const depStr = departureTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        stop.routes.forEach((route, routeIndex) => {
          const etaMinutes = baseMinutes + (routeIndex * 15);
          const routeDepTime = new Date(now.getTime() + etaMinutes * 60 * 1000);
          const routeDepStr = routeDepTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          
          nearbyOptions.push({
            id: `${stop.name}-${route}`,
            type: 'train',
            name: `${route} (Central)`,
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
