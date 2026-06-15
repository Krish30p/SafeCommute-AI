let ioInstance = null;

function setSocketIo(io) {
  ioInstance = io;
}

/**
 * Sends an SMS message, falling back to WebSocket simulation if keys are missing.
 * @param {string} to Phone number
 * @param {string} body Message content
 */
async function sendSMS(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE;

  console.log(`\n--- 📱 SIMULATED SMS OUTGOING ---`);
  console.log(`To:   ${to}`);
  console.log(`From: ${from || 'SafeCommute AI (SIMULATED)'}`);
  console.log(`Body:\n${body}`);
  console.log(`---------------------------------\n`);

  if (sid && token && from) {
    try {
      // Require twilio dynamically so it doesn't crash if it's not installed or missing
      const twilio = require('twilio');
      const client = twilio(sid, token);
      await client.messages.create({
        body: body,
        from: from,
        to: to
      });
      console.log(`✅ [SMS SENT VIA TWILIO] successfully dispatched to ${to}`);
      return { success: true, mode: 'TWILIO' };
    } catch (err) {
      console.error("❌ Twilio API call failed, falling back to simulation:", err.message);
    }
  }

  // WebSocket fallback: emit to active socket connections so the client UI can display it
  if (ioInstance) {
    ioInstance.emit('sms-notification', {
      to,
      body,
      timestamp: new Date().toLocaleTimeString('en-IN')
    });
  }

  return { success: true, mode: 'SIMULATED', body };
}

async function sendWhatsApp(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE;

  console.log(`\n--- 🟢 SIMULATED WHATSAPP OUTGOING ---`);
  console.log(`To:   whatsapp:${to}`);
  console.log(`From: whatsapp:${from || 'SafeCommute AI (SIMULATED)'}`);
  console.log(`Body:\n${body}`);
  console.log(`---------------------------------\n`);

  if (sid && token && from) {
    try {
      const twilio = require('twilio');
      const client = twilio(sid, token);
      await client.messages.create({
        body: body,
        from: `whatsapp:${from}`,
        to: `whatsapp:${to}`
      });
      console.log(`✅ [WHATSAPP SENT VIA TWILIO] successfully dispatched to ${to}`);
      return { success: true, mode: 'TWILIO_WHATSAPP' };
    } catch (err) {
      console.error("❌ Twilio WhatsApp API call failed, falling back to simulation:", err.message);
    }
  }

  // WebSocket fallback
  if (ioInstance) {
    ioInstance.emit('sms-notification', {
      to: `whatsapp:${to}`,
      body,
      timestamp: new Date().toLocaleTimeString('en-IN')
    });
  }

  return { success: true, mode: 'SIMULATED_WHATSAPP', body };
}

/**
 * Dispatches an emergency SOS WhatsApp alert to all trusted contacts.
 */
async function sendSOSAlert(userName, location, contacts, tripData) {
  const mapUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const timestamp = new Date().toLocaleString('en-IN');
  
  const body = `🚨 SOS ALERT: Emergency triggered by ${userName}\n` +
    `Exact Coordinates: Latitude ${location.lat}, Longitude ${location.lng}\n` +
    `Google Maps Link: ${mapUrl}\n` +
    `Time: ${timestamp}\n\n` +
    `Please check on them immediately.`;

  const results = [];
  for (const contact of contacts) {
    const res = await sendWhatsApp(contact.phone, body);
    results.push({ name: contact.name, phone: contact.phone, status: res.mode });
  }
  return results;
}

/**
 * Dispatches a trip starting SMS alert to all trusted contacts.
 */
async function sendTripStartAlert(userName, originName, destinationName, etaStr, shareToken, contacts) {
  const trackingUrl = `${process.env.VITE_APP_URL || 'http://localhost:5173'}/track/${shareToken}`;
  const body = `SafeCommute AI: ${userName} has started a trip.\n\n` +
    `📍 From: ${originName}\n` +
    `🏠 To: ${destinationName}\n` +
    `⏱ ETA: ${etaStr}\n\n` +
    `Track their live location:\n` +
    `${trackingUrl}\n\n` +
    `Powered by SafeCommute AI`;

  const results = [];
  for (const contact of contacts) {
    const res = await sendSMS(contact.phone, body);
    results.push({ name: contact.name, phone: contact.phone, status: res.mode });
  }
  return results;
}

/**
 * Dispatches a check-in reminder SMS to the user.
 */
async function sendCheckInPrompt(userPhone, destinationName, etaPlusFiveStr) {
  const body = `SafeCommute AI: Have you arrived safely at ${destinationName}?\n\n` +
    `Please click check-in inside the app or reply SAFE to confirm.\n` +
    `If we do not hear from you by ${etaPlusFiveStr}, your emergency contacts will be alerted.`;

  return await sendSMS(userPhone, body);
}

/**
 * Dispatches an alert to emergency contacts if user fails to check-in.
 */
async function sendMissedCheckInAlert(userName, destinationName, contacts) {
  const body = `🚨 SafeCommute AI: MISSED CHECK-IN ALERT\n\n` +
    `${userName} was expected to arrive at ${destinationName} but has failed to confirm their safety.\n\n` +
    `Please attempt to call them immediately.`;

  const results = [];
  for (const contact of contacts) {
    const res = await sendSMS(contact.phone, body);
    results.push({ name: contact.name, phone: contact.phone, status: res.mode });
  }
  return results;
}

module.exports = {
  setSocketIo,
  sendSMS,
  sendSOSAlert,
  sendTripStartAlert,
  sendCheckInPrompt,
  sendMissedCheckInAlert
};
