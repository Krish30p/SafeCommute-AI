const express = require('express');
const router = express.Router();
const { Incident, SafetyScoresCache } = require('../db');

// GET /api/incidents - Get all incidents for map display
router.get('/', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      // Check if we already have incidents near this location (approx 10km bounds)
      const existingNearby = await Incident.countDocuments({
        lat: { $gte: latNum - 0.1, $lte: latNum + 0.1 },
        lng: { $gte: lngNum - 0.1, $lte: lngNum + 0.1 }
      });

      if (existingNearby < 5) {
        console.log(`🌱 Auto-generating mock incidents for region [${latNum}, ${lngNum}]...`);
        const types = ['harassment', 'poor_lighting', 'suspicious_activity', 'accident', 'theft'];
        const mocks = [];
        for(let i=0; i<15; i++) {
           const type = types[Math.floor(Math.random() * types.length)];
           const offsetLat = (Math.random() - 0.5) * 0.1; // ~5km radius
           const offsetLng = (Math.random() - 0.5) * 0.1;
           mocks.push({
             lat: latNum + offsetLat,
             lng: lngNum + offsetLng,
             location: {
               type: 'Point',
               coordinates: [lngNum + offsetLng, latNum + offsetLat]
             },
             type,
             description: `System generated report for ${type.replace('_', ' ')} in this area.`,
             weight: 1.0,
             reported_at: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 48)
           });
        }
        await Incident.insertMany(mocks);
        
        // Invalidate safety score cache so routes calculated immediately after use these incidents
        await SafetyScoresCache.deleteMany({});
      }
    }

    // Now fetch incidents. If lat/lng provided, restrict to a 50km box to avoid massive payloads
    let query = {};
    if (lat && lng) {
       const latNum = parseFloat(lat);
       const lngNum = parseFloat(lng);
       query = {
         lat: { $gte: latNum - 0.5, $lte: latNum + 0.5 },
         lng: { $gte: lngNum - 0.5, $lte: lngNum + 0.5 }
       };
    }

    const incidents = await Incident.find(query).sort({ reported_at: -1 });
    const now = new Date();
    
    // Map response structure including virtual 'id' and computed 'hours_ago'
    const mapped = incidents.map(inc => {
      const hoursAgo = Math.max(0, (now - new Date(inc.reported_at)) / (1000 * 60 * 60));
      return {
        ...inc.toObject(),
        hours_ago: hoursAgo
      };
    });
    
    res.json(mapped);
  } catch (err) {
    console.error("Failed to fetch incidents:", err.message);
    res.status(500).json({ error: "Failed to load incidents list" });
  }
});

// GET /api/incidents/nearby - Alternative naming for map display
router.get('/nearby', async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ reported_at: -1 });
    const now = new Date();
    
    const mapped = incidents.map(inc => {
      const hoursAgo = Math.max(0, (now - new Date(inc.reported_at)) / (1000 * 60 * 60));
      return {
        ...inc.toObject(),
        hours_ago: hoursAgo
      };
    });
    
    res.json(mapped);
  } catch (err) {
    console.error("Failed to fetch nearby incidents:", err.message);
    res.status(500).json({ error: "Failed to load nearby incidents" });
  }
});

// POST /api/incidents - Submit incident report
router.post('/', async (req, res) => {
  const { lat, lng, type, description } = req.body;

  if (!lat || !lng || !type) {
    return res.status(400).json({ error: "Missing required fields (lat, lng, type)" });
  }

  try {
    const newIncident = await Incident.create({
      lat: Number(lat),
      lng: Number(lng),
      type,
      description: description || '',
      weight: 1.0
    });

    // Invalidate safety score cache so routes are recalculated
    await SafetyScoresCache.deleteMany({});
    console.log("🧹 Invalidated safety scores cache due to new incident report.");

    // Broadcast the new incident to all connected WebSocket clients
    const io = req.app.get('io');
    if (io) {
      io.emit('new-incident', {
        ...newIncident.toObject(),
        hours_ago: 0
      });
      console.log(`📢 Broadcasted new incident to active sockets: ${type}`);
    }

    res.json({
      success: true,
      message: 'Report submitted. Thank you for keeping the community safe.',
      incident: newIncident
    });

  } catch (err) {
    console.error("Failed to submit incident:", err.message);
    res.status(500).json({ error: "Failed to report incident" });
  }
});

module.exports = router;
