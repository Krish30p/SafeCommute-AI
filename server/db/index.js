const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MOCK_DB_FILE = path.join(__dirname, 'mockDb.json');
let useMock = false;
let pool = null;

// Initialize connection
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Add a small connection timeout so we fall back quickly if Postgres is not running
      connectionTimeoutMillis: 2000,
    });
  } catch (err) {
    console.warn("⚠️ Database URL set but pool creation failed. Using mock file database.", err.message);
    useMock = true;
  }
} else {
  console.log("ℹ️ No DATABASE_URL found. Using mock file database (mockDb.json).");
  useMock = true;
}

// In-Memory/JSON database structure
let mockData = {
  users: [],
  trusted_contacts: [],
  trips: [],
  incidents: [],
  transitStops: [],
  safety_scores_cache: []
};

// Load mock data from file if exists
function loadMockData() {
  if (fs.existsSync(MOCK_DB_FILE)) {
    try {
      const data = fs.readFileSync(MOCK_DB_FILE, 'utf8');
      mockData = JSON.parse(data);
    } catch (e) {
      console.error("Error reading mockDb.json:", e);
    }
  } else {
    saveMockData();
  }
}

function saveMockData() {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(mockData, null, 2), 'utf8');
  } catch (e) {
    console.error("Error writing to mockDb.json:", e);
  }
}

// Seed default user and contacts if mock DB is empty
function seedMockDefaults() {
  let modified = false;
  if (!mockData.users) mockData.users = [];
  if (!mockData.trusted_contacts) mockData.trusted_contacts = [];
  if (!mockData.incidents) mockData.incidents = [];
  if (!mockData.transitStops) mockData.transitStops = [];
  if (!mockData.trips) mockData.trips = [];
  if (!mockData.safety_scores_cache) mockData.safety_scores_cache = [];

  if (mockData.users.length === 0) {
    const defaultUser = {
      id: "d83fb22c-a0e1-45df-a337-b4d4de46cb51",
      name: "Aditi Sharma",
      phone: "+919876543210",
      created_at: new Date().toISOString()
    };
    mockData.users.push(defaultUser);
    
    mockData.trusted_contacts.push({
      id: uuidv4(),
      user_id: defaultUser.id,
      name: "Mom",
      phone: "+919876543211"
    });
    mockData.trusted_contacts.push({
      id: uuidv4(),
      user_id: defaultUser.id,
      name: "Rohan (Partner)",
      phone: "+919876543212"
    });
    modified = true;
    console.log("✨ Seeded default user and trusted contacts in mock database.");
  }

  if (mockData.incidents.length === 0) {
    const defaultIncidents = [
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
    mockData.incidents = defaultIncidents.map(inc => ({
      id: uuidv4(),
      lat: inc.lat,
      lng: inc.lng,
      type: inc.type,
      description: inc.description,
      reported_at: new Date(Date.now() - Math.random() * 24 * 3600 * 1000).toISOString(),
      weight: 1.0
    }));
    modified = true;
    console.log("✨ Seeded default incidents in mock database.");
  }

  if (mockData.transitStops.length === 0) {
    const defaultTransitStops = [
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
    mockData.transitStops = defaultTransitStops.map(stop => ({
      id: uuidv4(),
      ...stop
    }));
    modified = true;
    console.log("✨ Seeded default transit stops in mock database.");
  }
  
  if (modified) {
    saveMockData();
  }
}

if (useMock) {
  loadMockData();
  seedMockDefaults();
}

// Simple query engine simulator for JSON Mock DB
function runMockQuery(text, params = []) {
  const query = text.replace(/\s+/g, ' ').trim();
  const lowerQuery = query.toLowerCase();

  // Helper for ST_DWithin mock (Haversine distance)
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in meters
  }

  // Helper for checking proximity of points to a line (represented by array of points)
  function pointToLineDistance(pt, line) {
    if (!line || line.length === 0) return Infinity;
    let minDistance = Infinity;
    for (let i = 0; i < line.length; i++) {
      const dist = getDistance(pt.lat, pt.lng, line[i][1], line[i][0]); // route coordinates are [lng, lat]
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    return minDistance;
  }

  // --- 1. INSERT INTO USERS ---
  if (lowerQuery.startsWith('insert into users')) {
    const name = params[1] || 'Anonymous';
    const phone = params[0] || '';
    const newUser = {
      id: uuidv4(),
      name,
      phone,
      created_at: new Date().toISOString()
    };
    mockData.users.push(newUser);
    saveMockData();
    return { rows: [newUser] };
  }

  // --- 2. SELECT FROM USERS ---
  if (lowerQuery.startsWith('select') && lowerQuery.includes('from users')) {
    if (lowerQuery.includes('where phone =')) {
      const phoneVal = params[0];
      const match = mockData.users.filter(u => u.phone === phoneVal);
      return { rows: match };
    }
    if (lowerQuery.includes('limit 1')) {
      return { rows: mockData.users.slice(0, 1) };
    }
    return { rows: mockData.users };
  }

  // --- 3. SELECT FROM TRUSTED_CONTACTS ---
  if (lowerQuery.startsWith('select') && lowerQuery.includes('from trusted_contacts')) {
    if (lowerQuery.includes('where user_id =')) {
      const userIdVal = params[0];
      const match = mockData.trusted_contacts.filter(c => c.user_id === userIdVal);
      return { rows: match };
    }
    return { rows: mockData.trusted_contacts };
  }

  // --- 4. INSERT INTO TRUSTED_CONTACTS ---
  if (lowerQuery.startsWith('insert into trusted_contacts')) {
    const newContact = {
      id: uuidv4(),
      user_id: params[0],
      name: params[1],
      phone: params[2]
    };
    mockData.trusted_contacts.push(newContact);
    saveMockData();
    return { rows: [newContact] };
  }

  // --- 5. INSERT INTO TRIPS ---
  if (lowerQuery.startsWith('insert into trips')) {
    // fields: user_id, origin_lat, origin_lng, destination_lat, destination_lng, origin_name, destination_name, selected_route, safety_score, status, eta, share_token
    const newTrip = {
      id: uuidv4(),
      user_id: params[0],
      origin_lat: params[1],
      origin_lng: params[2],
      destination_lat: params[3],
      destination_lng: params[4],
      origin_name: params[5],
      destination_name: params[6],
      selected_route: typeof params[7] === 'string' ? JSON.parse(params[7]) : params[7],
      safety_score: params[8],
      status: params[9] || 'active',
      eta: params[10],
      started_at: new Date().toISOString(),
      ended_at: null,
      share_token: params[11] || uuidv4()
    };
    mockData.trips.push(newTrip);
    saveMockData();
    return { rows: [newTrip] };
  }

  // --- 6. SELECT FROM TRIPS ---
  if (lowerQuery.startsWith('select') && lowerQuery.includes('from trips')) {
    if (lowerQuery.includes('where id =')) {
      const match = mockData.trips.find(t => t.id === params[0]);
      return { rows: match ? [match] : [] };
    }
    if (lowerQuery.includes('where share_token =')) {
      const match = mockData.trips.find(t => t.share_token === params[0]);
      return { rows: match ? [match] : [] };
    }
    return { rows: mockData.trips };
  }

  // --- 7. UPDATE TRIPS ---
  if (lowerQuery.startsWith('update trips')) {
    if (lowerQuery.includes('set status = $1, ended_at = $2 where id = $3')) {
      const trip = mockData.trips.find(t => t.id === params[2]);
      if (trip) {
        trip.status = params[0];
        trip.ended_at = params[1];
        saveMockData();
        return { rows: [trip], rowCount: 1 };
      }
    }
    if (lowerQuery.includes('set status = $1, ended_at = $2 where share_token = $3')) {
      const trip = mockData.trips.find(t => t.share_token === params[2]);
      if (trip) {
        trip.status = params[0];
        trip.ended_at = params[1];
        saveMockData();
        return { rows: [trip], rowCount: 1 };
      }
    }
  }

  // --- 8. INSERT INTO INCIDENTS ---
  if (lowerQuery.startsWith('insert into incidents')) {
    const columnsMatch = query.match(/insert into incidents\s*\(([^)]+)\)/i);
    const columns = columnsMatch ? columnsMatch[1].split(',').map(c => c.trim().toLowerCase()) : [];
    
    const newIncident = {
      id: uuidv4(),
      lat: params[0],
      lng: params[1],
      type: params[2],
      description: params[3],
      reported_at: new Date().toISOString(),
      weight: 1.0
    };

    columns.forEach((col, idx) => {
      if (col === 'reported_at') {
        newIncident.reported_at = params[idx] instanceof Date ? params[idx].toISOString() : (params[idx] || newIncident.reported_at);
      } else if (col === 'weight') {
        newIncident.weight = typeof params[idx] === 'number' ? params[idx] : (Number(params[idx]) || 1.0);
      }
    });

    mockData.incidents.push(newIncident);
    saveMockData();
    return { rows: [newIncident] };
  }

  // --- 9. SELECT FROM INCIDENTS (including ST_DWithin simulations) ---
  if (lowerQuery.startsWith('select') && lowerQuery.includes('from incidents')) {
    // Check if we are doing spatial matching
    if (lowerQuery.includes('st_dwithin')) {
      let routeCoordinates = params[0];
      if (typeof routeCoordinates === 'string' && routeCoordinates.startsWith('LINESTRING')) {
        try {
          const coordsStr = routeCoordinates.replace('LINESTRING(', '').replace(')', '');
          routeCoordinates = coordsStr.split(',').map(pair => {
            const [lng, lat] = pair.trim().split(' ').map(Number);
            return [lng, lat];
          });
        } catch (e) {
          console.error("Error parsing WKT in mock query:", e);
          routeCoordinates = [];
        }
      }
      
      const filtered = mockData.incidents.filter(inc => {
        if (!routeCoordinates || !Array.isArray(routeCoordinates)) return true;
        const dist = pointToLineDistance({ lat: inc.lat, lng: inc.lng }, routeCoordinates);
        return dist <= 500; // 500 meters
      });

      // Map dynamic hours_ago calculation
      const now = new Date();
      const mapped = filtered.map(inc => {
        const reported = new Date(inc.reported_at);
        const hoursAgo = Math.max(0, (now - reported) / (1000 * 60 * 60));
        return { ...inc, hours_ago: hoursAgo };
      });
      return { rows: mapped };
    }

    // Standard SELECT * FROM incidents
    const now = new Date();
    const mapped = mockData.incidents.map(inc => {
      const reported = new Date(inc.reported_at);
      const hoursAgo = Math.max(0, (now - reported) / (1000 * 60 * 60));
      return { ...inc, hours_ago: hoursAgo };
    });
    return { rows: mapped };
  }

  // --- 10. SAFETY SCORE CACHE ---
  if (lowerQuery.startsWith('select') && lowerQuery.includes('from safety_scores_cache')) {
    const hash = params[0];
    const match = mockData.safety_scores_cache.find(c => c.route_hash === hash);
    return { rows: match ? [match] : [] };
  }

  if (lowerQuery.startsWith('insert into safety_scores_cache')) {
    const hash = params[0];
    const score = params[1];
    const breakdown = typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2];
    
    // remove existing if conflicting
    mockData.safety_scores_cache = mockData.safety_scores_cache.filter(c => c.route_hash !== hash);
    const newCache = {
      route_hash: hash,
      score,
      breakdown,
      cached_at: new Date().toISOString()
    };
    mockData.safety_scores_cache.push(newCache);
    saveMockData();
    return { rows: [newCache] };
  }

  if (lowerQuery.startsWith('delete from safety_scores_cache')) {
    mockData.safety_scores_cache = [];
    saveMockData();
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query: async (text, params) => {
    if (useMock) {
      return runMockQuery(text, params);
    }
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.warn("⚠️ Postgres query error, switching to mock database fallback:", err.message);
      useMock = true;
      loadMockData();
      seedMockDefaults();
      return runMockQuery(text, params);
    }
  },
  getMode: () => useMock ? "MOCK" : "POSTGRES",
  // expose internal mockData for manual resets / direct seed additions
  getMockData: () => mockData,
  saveMockData
};
