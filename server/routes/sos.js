const express = require('express');
const router = express.Router();
const { User, TrustedContact, Trip } = require('../db');
const twilioService = require('../services/twilioService');

// POST /api/sos - Trigger emergency SOS alert
router.post('/', async (req, res) => {
  const { lat, lng, tripId, contacts, userName } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing current GPS coordinates for SOS alert" });
  }

  try {
    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ error: "No emergency contacts provided in request." });
    }

    // Fetch trip information if available
    let tripData = null;
    if (tripId) {
      const trip = await Trip.findById(tripId);
      if (trip) {
        tripData = trip.toObject();
      }
    }

    // Trigger Twilio SOS broadcast using the name provided by the frontend
    const displayName = userName || "A SafeCommute User";
    
    const alerts = await twilioService.sendSOSAlert(
      displayName,
      { lat, lng },
      contacts,
      tripData
    );

    res.json({
      success: true,
      message: `Emergency SOS triggered successfully! Sent alerts to ${contacts.length} contacts.`,
      contactsAlerted: alerts
    });

  } catch (err) {
    console.error("SOS Trigger failed:", err.message);
    res.status(500).json({ error: "Failed to dispatch SOS alerts" });
  }
});

module.exports = router;
