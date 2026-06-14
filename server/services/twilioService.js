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

/**
 * Dispatches an emergency SOS SMS alert to all trusted contacts.
 */
async function sendSOSAlert(userName, location, contacts, tripData) {
  const mapUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const origin = tripData?.origin_name || 'Origin';
  const destination = tripData?.destination_name || 'Destination';
  
  const body = `🚨 SOS ALERT from SafeCommute AI\n\n` +
    `${userName} has triggered an emergency alert.\n\n` +
    `📍 Last known location:\n` +
    `${mapUrl}\n\n` +
    `🕐 Time: ${new Date().toLocaleTimeString('en-IN')}\n` +
    `🗺 Route: ${origin} → ${destination}\n\n` +
    `Please check on them immediately.`;

  const results = [];
  for (const contact of contacts) {
    const res = await sendSMS(contact.phone, body);
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
