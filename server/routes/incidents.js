const express = require('express');
const router = express.Router();
const { Incident, SafetyScoresCache } = require('../db');

// GET /api/incidents - Get all incidents for map display
router.get('/', async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ reported_at: -1 });
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
