const { Trip } = require('../db');

function initTripSocket(io) {
  // Store active trip locations in-memory for fast tracking retrieval
  const activeTrips = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a tracking room (for sharing link view or active trip display)
    socket.on('join-trip', ({ token }) => {
      if (!token) return;
      socket.join(`trip:${token}`);
      console.log(`👁️ Client ${socket.id} joined tracking room trip:${token}`);
      
      // If we have cached location for this trip, emit it immediately
      if (activeTrips.has(token)) {
        socket.emit('location-updated', activeTrips.get(token));
      }
    });

    // Leave a tracking room
    socket.on('leave-trip', ({ token }) => {
      if (!token) return;
      socket.leave(`trip:${token}`);
      console.log(`👁️ Client ${socket.id} left tracking room trip:${token}`);
    });

    // Live trip coordinate updates from driver/commuter
    socket.on('update-location', async ({ token, lat, lng, eta, speed, heading }) => {
      if (!token) return;
      
      const payload = {
        lat,
        lng,
        eta,
        speed: speed || 0,
        heading: heading || 0,
        updatedAt: new Date().toISOString()
      };

      // Cache the last location
      activeTrips.set(token, payload);

      // Broadcast to all clients viewing the live tracker room
      io.to(`trip:${token}`).emit('location-updated', payload);
      
      // Also write coordinates update to database if necessary (e.g. updating ETA)
      try {
        if (eta) {
          await Trip.findOneAndUpdate(
            { share_token: token },
            { eta: new Date(eta) }
          );
        }
      } catch (err) {
        console.error("Failed to update trip ETA in database on socket event:", err.message);
      }
    });

    // Stop tracking when trip is completed
    socket.on('end-trip', ({ token }) => {
      if (!token) return;
      activeTrips.delete(token);
      io.to(`trip:${token}`).emit('trip-ended', { timestamp: new Date().toISOString() });
      console.log(`🏁 Live stream ended for trip: ${token}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // Export a function to broadcast new incidents globally
  return {
    broadcastNewIncident: (incident) => {
      io.emit('new-incident', incident);
      console.log(`📢 Broadcasted incident to all clients: ${incident.type}`);
    }
  };
}

module.exports = initTripSocket;
