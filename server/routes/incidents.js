const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/incidents - Get all incidents for map display
router.get('/', async (req, res) => {
  try {
    const queryResult = await db.query(
      'SELECT *, EXTRACT(EPOCH FROM (NOW() - reported_at))/3600 AS hours_ago FROM incidents ORDER BY reported_at DESC'
    );
    res.json(queryResult.rows);
  } catch (err) {
    console.error("Failed to fetch incidents:", err.message);
    res.status(500).json({ error: "Failed to load incidents list" });
  }
});

// GET /api/incidents/nearby - Alternative naming for map display
router.get('/nearby', async (req, res) => {
  try {
    const queryResult = await db.query(
      'SELECT *, EXTRACT(EPOCH FROM (NOW() - reported_at))/3600 AS hours_ago FROM incidents ORDER BY reported_at DESC'
    );
    res.json(queryResult.rows);
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
    const insertResult = await db.query(
      'INSERT INTO incidents (lat, lng, type, description, weight) VALUES ($1, $2, $3, $4, 1.0) RETURNING *',
      [Number(lat), Number(lng), type, description || '']
    );

    const newIncident = insertResult.rows[0];

    // Invalidate safety score cache so routes are recalculated
    await db.query('DELETE FROM safety_scores_cache');
    console.log("🧹 Invalidated safety scores cache due to new incident report.");

    // Broadcast the new incident to all connected WebSocket clients
    const io = req.app.get('io');
    if (io) {
      // Map hours_ago for client mapping compatibility
      io.emit('new-incident', {
        ...newIncident,
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
