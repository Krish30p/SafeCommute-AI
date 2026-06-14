require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const db = require('./db');
const twilioService = require('./services/twilioService');
const initTripSocket = require('./socket/tripSocket');

const routingRouter = require('./routes/routing');
const tripsRouter = require('./routes/trips');
const sosRouter = require('./routes/sos');
const incidentsRouter = require('./routes/incidents');
const transitRouter = require('./routes/transit');

const app = express();
const server = http.createServer(app);

// Configure CORS to support frontend dev server connection
const corsOptions = {
  origin: process.env.VITE_APP_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io initialization
const io = socketIo(server, {
  cors: corsOptions
});

// Store socket instance in app context and register it in Twilio service
app.set('io', io);
twilioService.setSocketIo(io);

// Initialize Socket.io events handler
initTripSocket(io);

// Mount API routes
app.use('/api/routes', routingRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/sos', sosRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/transit', transitRouter);

// Health check and db mode check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    dbMode: db.getMode(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`🚀 SafeCommute AI backend listening on port ${PORT}`);
  console.log(`🔌 Database Mode: ${db.getMode()}`);
  
  // Auto-seed if mock mode is active to ensure instant data availability
  if (db.getMode() === 'MOCK') {
    try {
      const { seed } = require('./db/seed');
      await seed();
    } catch (e) {
      console.error("⚠️ Failed to auto-seed mock database:", e.message);
    }
  }
});
