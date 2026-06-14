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
    
    saveMockData();
    console.log("✨ Seeded default user and trusted contacts in mock database.");
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
    const newIncident = {
      id: uuidv4(),
      lat: params[0],
      lng: params[1],
      type: params[2],
      description: params[3],
      reported_at: new Date().toISOString(),
      weight: params[4] || 1.0
    };
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
      return runMockQuery(text, params);
    }
  },
  getMode: () => useMock ? "MOCK" : "POSTGRES",
  // expose internal mockData for manual resets / direct seed additions
  getMockData: () => mockData,
  saveMockData
};
