const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const schedule = require('node-schedule');
const { User, TrustedContact, Trip } = require('../db');
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
      const trip = await Trip.findById(tripId);
      
      if (trip && trip.status === 'active') {
        const user = await User.findById(userId);
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
      const trip = await Trip.findById(tripId);
      
      if (trip && trip.status === 'active') {
        const user = await User.findById(userId);
        const contacts = await TrustedContact.find({ user_id: userId });
        
        console.log(`🚨 ETA + 5 minutes expired without check-in. Alerting emergency contacts for trip ${tripId}!`);
        
        await twilioService.sendMissedCheckInAlert(
          user ? user.name : "A SafeCommute User",
          destinationName,
          contacts.map(c => c.toObject())
        );
        
        // Update status to expired
        await Trip.findByIdAndUpdate(tripId, {
          status: 'expired-alert',
          ended_at: new Date()
        });
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
    durationSeconds,
    userName: reqUserName,
    contacts: reqContacts
  } = req.body;

  try {
    // Default to seeded user if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      const defaultUser = await User.findOne();
      if (defaultUser) {
        finalUserId = defaultUser._id;
      }
    }

    const shareToken = uuidv4();
    
    // Calculate ETA based on duration
    const now = new Date();
    const eta = new Date(now.getTime() + (durationSeconds || 14 * 60) * 1000);

    const newTrip = await Trip.create({
      user_id: finalUserId,
      origin_lat: originLat,
      origin_lng: originLng,
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      origin_name: originName,
      destination_name: destinationName,
      selected_route: selectedRoute,
      safety_score: safetyScore,
      status: 'active',
      eta: eta,
      share_token: shareToken
    });

    // Use Firebase Auth userName from frontend if available, otherwise fallback to MongoDB
    let displayName = reqUserName;
    if (!displayName) {
      const user = await User.findById(finalUserId);
      displayName = user ? user.name : "A SafeCommute User";
    }

    // Use Firestore contacts from frontend if available, otherwise fallback to MongoDB
    let alertContacts = reqContacts;
    if (!alertContacts || alertContacts.length === 0) {
      const dbContacts = await TrustedContact.find({ user_id: finalUserId });
      alertContacts = dbContacts.map(c => c.toObject());
    }

    const etaStr = eta.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Send SMS alerts (will fallback to socket logs if Twilio not configured)
    await twilioService.sendTripStartAlert(
      displayName,
      originName,
      destinationName,
      etaStr,
      shareToken,
      alertContacts
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
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      { status: 'completed', ended_at: new Date() },
      { new: true }
    );

    // Cancel scheduled cron jobs
    cancelTripJobs(tripId);

    res.json({ success: true, trip: updatedTrip });
  } catch (err) {
    console.error("Failed to end trip:", err.message);
    res.status(500).json({ error: "Internal server error ending trip" });
  }
});

// POST /api/trips/:id/checkin - Confirm safe arrival
router.post('/:id/checkin', async (req, res) => {
  const tripId = req.params.id;

  try {
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      { status: 'checked-in', ended_at: new Date() },
      { new: true }
    );

    // Cancel scheduled cron jobs
    cancelTripJobs(tripId);

    res.json({ success: true, message: "Safety checked in. Trip closed.", trip: updatedTrip });
  } catch (err) {
    console.error("Failed to check in trip:", err.message);
    res.status(500).json({ error: "Failed to verify safety check-in" });
  }
});

// GET /api/trips/track/:token - Get trip status for sharing link
router.get('/track/:token', async (req, res) => {
  const token = req.params.token;

  try {
    const trip = await Trip.findOne({ share_token: token });

    if (!trip) {
      return res.status(404).json({ error: "Active trip not found or link has expired" });
    }

    // Fetch user details
    const user = await User.findById(trip.user_id);

    res.json({
      trip,
      userName: user ? user.name : "A SafeCommute User"
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
    const user = await User.findById(jobs.userId);
    const contacts = await TrustedContact.find({ user_id: jobs.userId });

    console.log(`[DEMO FORCE] Simulating immediate ETA expiration and safety missed alert for ${tripId}`);

    // Send check-in prompt immediately
    await twilioService.sendCheckInPrompt(
      user ? user.phone : "+919876543210", 
      jobs.destinationName, 
      new Date().toLocaleTimeString('en-IN')
    );

    // Send missed check-in alert immediately
    await twilioService.sendMissedCheckInAlert(
      user ? user.name : "A SafeCommute User",
      jobs.destinationName,
      contacts.map(c => c.toObject())
    );

    // Update status to expired
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      { status: 'expired-alert', ended_at: new Date() },
      { new: true }
    );

    cancelTripJobs(tripId);

    res.json({ 
      success: true, 
      message: "Check-in expired simulator executed. SOS notifications broadcasted to contacts.",
      trip: updatedTrip
    });
  } catch (err) {
    console.error("Error simulating check-in expiry:", err.message);
    res.status(500).json({ error: "Failed to force timer trigger" });
  }
});

module.exports = router;
