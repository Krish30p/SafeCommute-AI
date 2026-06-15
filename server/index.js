require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

// Connect to MongoDB function with fallback to MongoMemoryServer
const connectDB = async () => {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI environment variable is missing!");
    process.exit(1);
  }

  const startMemoryServer = async () => {
    console.log('⚠️ Starting in-memory MongoDB...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      console.log(`✨ Started mongodb-memory-server at: ${uri}`);
      await mongoose.connect(uri);
      console.log('🔌 Connected to In-Memory MongoDB');
    } catch (memErr) {
      console.error('❌ Failed to start mongodb-memory-server:', memErr.message);
      process.exit(1);
    }
  };

  if (uri.includes('127.0.0.1:27017') || uri.includes('localhost:27017')) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log('🔌 Connected to local MongoDB');
    } catch (err) {
      console.log('⚠️ Local MongoDB not running.');
      await startMemoryServer();
    }
  } else {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log('🔌 Connected to MongoDB Atlas / Remote Cluster');
    } catch (err) {
      console.error('❌ Remote MongoDB connection error:', err.message);
      await startMemoryServer();
    }
  }
};

const db = require('./db');
const twilioService = require('./services/twilioService');
const initTripSocket = require('./socket/tripSocket');

const routingRouter = require('./routes/routing');
const tripsRouter = require('./routes/trips');
const sosRouter = require('./routes/sos');
const incidentsRouter = require('./routes/incidents');
const transitRouter = require('./routes/transit');
const forecastRouter = require('./routes/forecast');
const contactsRouter = require('./routes/contacts');
const authRouter = require('./routes/auth');

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
app.use('/api/auth', authRouter);
app.use('/api/routes', routingRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/sos', sosRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/transit', transitRouter);
app.use('/api/forecast', forecastRouter);
app.use('/api/contacts', contactsRouter);

// Health check and db mode check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    dbMode: 'MONGODB',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, async () => {
  console.log(`🚀 SafeCommute AI backend listening on port ${PORT}`);
  
  // Establish database connection
  await connectDB();
  
  // Auto-seed if MongoDB is empty to ensure instant data availability
  try {
    const userCount = await db.User.countDocuments();
    if (userCount === 0) {
      console.log("🌱 MongoDB is empty. Seeding default data...");
      const { seed } = require('./db/seed');
      await seed();
    }
  } catch (e) {
    console.error("⚠️ Failed to auto-seed MongoDB database:", e.message);
  }
});
