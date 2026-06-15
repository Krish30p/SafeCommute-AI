require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const db = require('./index');

const incidents = [
  { lat: 22.3144, lng: 73.1932, type: 'dark_street', description: 'No streetlights near Sayajigunj underpass after 9pm' },
  { lat: 22.3072, lng: 73.1812, type: 'harassment', description: 'Reported harassment near Railway Station auto stand' },
  { lat: 22.2960, lng: 73.1723, type: 'broken_light', description: 'Streetlights out on Productivity Road stretch' },
  { lat: 22.3201, lng: 73.1678, type: 'dark_street', description: 'Fatehgunj side lanes poorly lit' },
  { lat: 22.3089, lng: 73.2001, type: 'suspicious', description: 'Isolated stretch near Sama road after 10pm' },
  { lat: 22.2905, lng: 73.1820, type: 'harassment', description: 'Eve-teasing reported near Manjalpur sports complex' },
  { lat: 22.3112, lng: 73.1590, type: 'broken_light', description: 'Dim lighting near Alkapuri main commercial street side lanes' },
  { lat: 22.2985, lng: 73.1650, type: 'suspicious', description: 'Poorly patrolled road near Akota bridge underpass' },
  { lat: 22.3245, lng: 73.1880, type: 'dark_street', description: 'Unlit stretch near Nizampura housing boards' },
  { lat: 22.2850, lng: 73.1950, type: 'broken_light', description: 'Broken streetlights along Makarpura GIDC highway connector' }
];

const transitStops = [
  { name: 'Vadodara Railway Station', type: 'train', lat: 22.3072, lng: 73.1812, routes: ['Western Railway', 'Jan Shatabdi', 'Rajdhani'] },
  { name: 'Alkapuri Bus Stop', type: 'bus', lat: 22.3144, lng: 73.1689, routes: ['47', '23', '8A'] },
  { name: 'Akota Garden Stop', type: 'bus', lat: 22.2978, lng: 73.1723, routes: ['12', '31'] },
  { name: 'Manjalpur Naka Bus Stop', type: 'bus', lat: 22.2900, lng: 73.1850, routes: ['15', '22A'] },
  { name: 'Sayajigunj Metro Station', type: 'metro', lat: 22.3120, lng: 73.1900, routes: ['Metro Line 1'] },
  { name: 'Fatehgunj Bus Stop', type: 'bus', lat: 22.3210, lng: 73.1790, routes: ['34', '10'] },
  { name: 'Nizampura Metro Station', type: 'metro', lat: 22.3300, lng: 73.1850, routes: ['Metro Line 1'] },
  { name: 'Gotri Road Stop', type: 'bus', lat: 22.3100, lng: 73.1450, routes: ['9A', '55'] },
  { name: 'Akota Bridge Stop', type: 'bus', lat: 22.3000, lng: 73.1680, routes: ['12', '45'] },
  { name: 'Vadodara Central Bus Terminal', type: 'bus', lat: 22.3090, lng: 73.1850, routes: ['Express', 'Intercity', 'Local'] }
];

async function seed() {
  console.log('🌱 Seeding MongoDB database...');
  try {
    if (mongoose.connection.readyState === 0) {
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not set in environment variables');
      }
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('🔌 Connected to MongoDB for seeding');
    }

    // Clear existing collections
    await db.User.deleteMany({});
    await db.TrustedContact.deleteMany({});
    await db.Incident.deleteMany({});
    await db.SafetyScoresCache.deleteMany({});
    await db.Trip.deleteMany({});

    // Seed default user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const defaultUser = await db.User.create({
      _id: "d83fb22c-a0e1-45df-a337-b4d4de46cb51",
      email: "aditi@example.com",
      password: hashedPassword,
      name: "Aditi Sharma",
      phone: "+919876543210",
      created_at: new Date()
    });

    // Seed trusted contacts
    await db.TrustedContact.create([
      {
        user_id: defaultUser._id,
        name: "Mom",
        phone: "+919876543211"
      },
      {
        user_id: defaultUser._id,
        name: "Rohan (Partner)",
        phone: "+919876543212"
      }
    ]);

    // Seed incidents
    for (const inc of incidents) {
      await db.Incident.create({
        lat: inc.lat,
        lng: inc.lng,
        type: inc.type,
        description: inc.description,
        reported_at: new Date(Date.now() - Math.random() * 24 * 3600 * 1000),
        weight: 1.0
      });
    }

    console.log(`✅ Successfully seeded MongoDB database with default User, Trusted Contacts, and ${incidents.length} Incidents.`);
  } catch (err) {
    console.error("❌ Seeding MongoDB failed:", err.message);
  } finally {
    // If run as standalone script, close connection
    if (require.main === module && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, transitStops };
