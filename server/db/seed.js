require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('./index');
const { v4: uuidv4 } = require('uuid');

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
  console.log(`🌱 Seeding SafeCommute AI database (Mode: ${db.getMode()})...`);
  
  if (db.getMode() === 'MOCK') {
    const mock = db.getMockData();
    // clear incidents and refill
    mock.incidents = incidents.map(inc => ({
      id: uuidv4(),
      lat: inc.lat,
      lng: inc.lng,
      type: inc.type,
      description: inc.description,
      reported_at: new Date(Date.now() - Math.random() * 24 * 3600 * 1000).toISOString(), // random time in last 24h
      weight: 1.0
    }));
    
    // Save transitStops directly in the mock DB for easy loading (we can also write to a json file or keep them as static data)
    mock.transitStops = transitStops.map(stop => ({
      id: uuidv4(),
      ...stop
    }));
    
    db.saveMockData();
    console.log(`✅ Successfully seeded mock DB with ${mock.incidents.length} incidents and ${mock.transitStops.length} transit stops!`);
  } else {
    try {
      // Create tables first just in case
      const schemaSql = require('fs').readFileSync(require('path').join(__dirname, 'schema.sql'), 'utf8');
      await db.query(schemaSql);
      
      // Clear tables
      await db.query('DELETE FROM incidents');
      
      for (const inc of incidents) {
        await db.query(
          'INSERT INTO incidents (lat, lng, type, description, reported_at) VALUES ($1, $2, $3, $4, $5)',
          [inc.lat, inc.lng, inc.type, inc.description, new Date(Date.now() - Math.random() * 24 * 3600 * 1000)]
        );
      }
      
      console.log(`✅ Successfully seeded Postgres database with ${incidents.length} incidents.`);
    } catch (err) {
      console.error("❌ Seeding Postgres failed, fallback to mock DB seeding:", err.message);
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, transitStops };
