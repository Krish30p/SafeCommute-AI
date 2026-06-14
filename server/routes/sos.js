const express = require('express');
const router = express.Router();
const { User, TrustedContact, Trip } = require('../db');
const twilioService = require('../services/twilioService');

// POST /api/sos - Trigger emergency SOS alert
router.post('/', async (req, res) => {
  const { lat, lng, tripId } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing current GPS coordinates for SOS alert" });
  }

  try {
    // Determine active user (fallback to first user)
    const user = await User.findOne();

    if (!user) {
      return res.status(404).json({ error: "No user found to associate SOS with" });
    }

    // Get trusted contacts
    const contacts = await TrustedContact.find({ user_id: user._id });

    if (contacts.length === 0) {
      return res.status(400).json({ error: "No emergency contacts configured for this user" });
    }

    // Fetch trip information if available
    let tripData = null;
    if (tripId) {
      const trip = await Trip.findById(tripId);
      if (trip) {
        tripData = trip.toObject();
      }
    }

    // Trigger Twilio SOS broadcast
    const alerts = await twilioService.sendSOSAlert(
      user.name,
      { lat, lng },
      contacts.map(c => c.toObject()),
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
