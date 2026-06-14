const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const schedule = require('node-schedule');
const db = require('../db');
const twilioService = require('../services/twilioService');

// In-memory registry to cancel scheduled node-schedule jobs upon arrival
const scheduledJobs = new Map(); // tripId -> { promptJob, alertJob }

/**
 * Schedules the check-in timer checks.
 */
function scheduleCheckInAlerts(tripId, userId, destinationName, eta) {
  const etaTime = new Date(eta);
  
  // Set alert time at ETA + 5 minutes
  const alertTime = new Date(etaTime.getTime() + 5 * 60 * 1000);
  
  // 1. Schedule Check-in SMS Prompt at ETA
  const promptJob = schedule.scheduleJob(etaTime, async () => {
    try {
      const tripQuery = await db.query('SELECT * FROM trips WHERE id = $1', [tripId]);
      const trip = tripQuery.rows[0];
      
      if (trip && trip.status === 'active') {
        const userQuery = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userQuery.rows[0];
        
        const etaPlusFiveStr = new Date(alertTime).toLocaleTimeString('en-IN');
        
        await twilioService.sendCheckInPrompt(
          user ? user.phone : "+919876543210", 
          destinationName, 
          etaPlusFiveStr
        );
      }
    } catch (err) {
      console.error("Error running scheduled check-in prompt:", err.message);
    }
  });

  // 2. Schedule Emergency Contacts Alert at ETA + 5 minutes
  const alertJob = schedule.scheduleJob(alertTime, async () => {
    try {
      const tripQuery = await db.query('SELECT * FROM trips WHERE id = $1', [tripId]);
      const trip = tripQuery.rows[0];
      
      if (trip && trip.status === 'active') {
        const userQuery = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userQuery.rows[0];
        
        const contactsQuery = await db.query('SELECT * FROM trusted_contacts WHERE user_id = $1', [userId]);
        const contacts = contactsQuery.rows;
        
        console.log(`🚨 ETA + 5 minutes expired without check-in. Alerting emergency contacts for trip ${tripId}!`);
        
        await twilioService.sendMissedCheckInAlert(
          user ? user.name : "Aditi Sharma",
          destinationName,
          contacts
        );
        
        // Update status to expired
        await db.query(
          "UPDATE trips SET status = $1, ended_at = $2 WHERE id = $3",
          ['expired-alert', new Date().toISOString(), tripId]
        );
      }
    } catch (err) {
      console.error("Error running scheduled emergency contact alerts:", err.message);
    }
  });

  // Register jobs
  scheduledJobs.set(tripId, { promptJob, alertJob, eta: etaTime, alert: alertTime, destinationName, userId });
}

/**
 * Helper to cancel scheduled jobs for a trip.
 */
function cancelTripJobs(tripId) {
  const jobs = scheduledJobs.get(tripId);
  if (jobs) {
    if (jobs.promptJob) jobs.promptJob.cancel();
    if (jobs.alertJob) jobs.alertJob.cancel();
    scheduledJobs.delete(tripId);
    console.log(`🧹 Cancelled check-in schedule jobs for trip ${tripId}`);
  }
}

// POST /api/trips/start - Start a safe trip
router.post('/start', async (req, res) => {
  const { 
    userId, 
    originLat, originLng, 
    destinationLat, destinationLng,
    originName, destinationName,
    selectedRoute, safetyScore,
    durationSeconds
  } = req.body;

  // Default to seeded user if not provided
  let finalUserId = userId;
  if (!finalUserId) {
    const defaultUserQuery = await db.query('SELECT id FROM users LIMIT 1');
    if (defaultUserQuery.rows.length > 0) {
      finalUserId = defaultUserQuery.rows[0].id;
    }
  }

  const shareToken = uuidv4();
  
  // Calculate ETA based on duration
  const now = new Date();
  const eta = new Date(now.getTime() + (durationSeconds || 14 * 60) * 1000);

  try {
    const insertQuery = await db.query(`
      INSERT INTO trips (
        user_id, origin_lat, origin_lng, destination_lat, destination_lng,
        origin_name, destination_name, selected_route, safety_score, status, eta, share_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      finalUserId, originLat, originLng, destinationLat, destinationLng,
      originName, destinationName, JSON.stringify(selectedRoute), safetyScore,
      'active', eta, shareToken
    ]);

    const newTrip = insertQuery.rows[0];

    // Get user and contacts details to trigger start SMS
    const userQuery = await db.query('SELECT * FROM users WHERE id = $1', [finalUserId]);
    const user = userQuery.rows[0];

    const contactsQuery = await db.query('SELECT * FROM trusted_contacts WHERE user_id = $1', [finalUserId]);
    const contacts = contactsQuery.rows;

    const etaStr = eta.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Send SMS alerts (will fallback to socket logs if Twilio not configured)
    await twilioService.sendTripStartAlert(
      user ? user.name : "Aditi Sharma",
      originName,
      destinationName,
      etaStr,
      shareToken,
      contacts
    );

    // Schedule check-in jobs
    scheduleCheckInAlerts(newTrip.id, finalUserId, destinationName, eta);

    res.json({
      success: true,
      trip: newTrip,
      contactsAlerted: contacts.map(c => c.name)
    });

  } catch (err) {
    console.error("Failed to start trip:", err.message);
    res.status(500).json({ error: "Failed to record and initiate trip" });
  }
});

// POST /api/trips/:id/end - End trip successfully
router.post('/:id/end', async (req, res) => {
  const tripId = req.params.id;

  try {
    const updated = await db.query(
      "UPDATE trips SET status = $1, ended_at = $2 WHERE id = $3",
      ['completed', new Date().toISOString(), tripId]
    );

    // Cancel scheduled cron jobs
    cancelTripJobs(tripId);

    res.json({ success: true, trip: updated.rows[0] });
  } catch (err) {
    console.error("Failed to end trip:", err.message);
    res.status(500).json({ error: "Internal server error ending trip" });
  }
});

// POST /api/trips/:id/checkin - Confirm safe arrival
router.post('/:id/checkin', async (req, res) => {
  const tripId = req.params.id;

  try {
    const updated = await db.query(
      "UPDATE trips SET status = $1, ended_at = $2 WHERE id = $3",
      ['checked-in', new Date().toISOString(), tripId]
    );

    // Cancel scheduled cron jobs
    cancelTripJobs(tripId);

    res.json({ success: true, message: "Safety checked in. Trip closed.", trip: updated.rows[0] });
  } catch (err) {
    console.error("Failed to check in trip:", err.message);
    res.status(500).json({ error: "Failed to verify safety check-in" });
  }
});

// GET /api/trips/track/:token - Get trip status for sharing link
router.get('/track/:token', async (req, res) => {
  const token = req.params.token;

  try {
    const tripQuery = await db.query(
      "SELECT * FROM trips WHERE share_token = $1",
      [token]
    );

    if (tripQuery.rows.length === 0) {
      return res.status(404).json({ error: "Active trip not found or link has expired" });
    }

    const trip = tripQuery.rows[0];

    // Fetch user details
    const userQuery = await db.query(
      "SELECT name FROM users WHERE id = $1",
      [trip.user_id]
    );

    res.json({
      trip,
      userName: userQuery.rows[0] ? userQuery.rows[0].name : "Aditi Sharma"
    });
  } catch (err) {
    console.error("Error loading tracking trip:", err.message);
    res.status(500).json({ error: "Error retrieving live trip data" });
  }
});

// POST /api/trips/:id/simulate-expiry - Demo-only API to trigger alerts immediately
router.post('/:id/simulate-expiry', async (req, res) => {
  const tripId = req.params.id;
  const jobs = scheduledJobs.get(tripId);

  if (!jobs) {
    return res.status(400).json({ error: "No active scheduler jobs found for this trip." });
  }

  try {
    const userQuery = await db.query('SELECT * FROM users WHERE id = $1', [jobs.userId]);
    const user = userQuery.rows[0];
    
    const contactsQuery = await db.query('SELECT * FROM trusted_contacts WHERE user_id = $1', [jobs.userId]);
    const contacts = contactsQuery.rows;

    console.log(`[DEMO FORCE] Simulating immediate ETA expiration and safety missed alert for ${tripId}`);

    // Send check-in prompt immediately
    await twilioService.sendCheckInPrompt(
      user ? user.phone : "+919876543210", 
      jobs.destinationName, 
      new Date().toLocaleTimeString('en-IN')
    );

    // Send missed check-in alert immediately
    await twilioService.sendMissedCheckInAlert(
      user ? user.name : "Aditi Sharma",
      jobs.destinationName,
      contacts
    );

    // Update status to expired
    const updated = await db.query(
      "UPDATE trips SET status = $1, ended_at = $2 WHERE id = $3",
      ['expired-alert', new Date().toISOString(), tripId]
    );

    cancelTripJobs(tripId);

    res.json({ 
      success: true, 
      message: "Check-in expired simulator executed. SOS notifications broadcasted to contacts.",
      trip: updated.rows[0]
    });
  } catch (err) {
    console.error("Error simulating check-in expiry:", err.message);
    res.status(500).json({ error: "Failed to force timer trigger" });
  }
});

module.exports = router;
