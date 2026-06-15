const express = require('express');
const router = express.Router();
const { User, TrustedContact, Trip } = require('../db');
const twilioService = require('../services/twilioService');
const authMiddleware = require('../middleware/auth');

// POST /api/sos - Trigger emergency SOS alert
router.post('/', authMiddleware, async (req, res) => {
  const { lat, lng, tripId, contacts: reqContacts, userName: reqUserName } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing current GPS coordinates for SOS alert" });
  }

  try {
    let finalContacts = reqContacts;
    if (!finalContacts || finalContacts.length === 0) {
      const dbContacts = await TrustedContact.find({ user_id: req.user._id });
      finalContacts = dbContacts.map(c => c.toObject());
    }

    if (!finalContacts || finalContacts.length === 0) {
      return res.status(400).json({ error: "No emergency contacts found. Please add emergency contacts in your profile." });
    }

    // Fetch trip information if available
    let tripData = null;
    if (tripId) {
      const trip = await Trip.findOne({ _id: tripId, user_id: req.user._id });
      if (trip) {
        tripData = trip.toObject();
      }
    }

    // Trigger Twilio SOS broadcast
    const displayName = reqUserName || req.user.name || "A SafeCommute User";
    
    const alerts = await twilioService.sendSOSAlert(
      displayName,
      { lat, lng },
      finalContacts,
      tripData
    );

    res.json({
      success: true,
      message: `Emergency SOS triggered successfully! Sent alerts to ${finalContacts.length} contacts.`,
      contactsAlerted: alerts
    });

  } catch (err) {
    console.error("SOS Trigger failed:", err.message);
    res.status(500).json({ error: "Failed to dispatch SOS alerts" });
  }
});

module.exports = router;
