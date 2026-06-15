import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, MapPin, ShieldAlert, Sparkles, Navigation, ShieldCheck, LogOut } from 'lucide-react';
import MapView from '../components/Map/MapView';
import WomenSafetyToggle from '../components/Safety/WomenSafetyToggle';
import EmergencyContacts from '../components/Safety/EmergencyContacts';
import { useAuth } from '../contexts/AuthContext';

// Pre-seeded locations for autocomplete fallbacks
const MOCK_LOCATIONS = [
  { name: "Vadodara Railway Station", coords: [73.1812, 22.3072] },
  { name: "Akota Garden Stop", coords: [73.1723, 22.2960] },
  { name: "Alkapuri Bus Stop", coords: [73.1689, 22.3144] },
  { name: "Fatehgunj Bus Stop", coords: [73.1790, 22.3210] },
  { name: "Manjalpur Naka Stop", coords: [73.1850, 22.2900] },
  { name: "Sayajibaug Zoo Entrance", coords: [73.1885, 22.3150] },
  { name: "Kirti Mandir", coords: [73.1901, 22.3061] },
  { name: "Sursagar Lake", coords: [73.2001, 22.2995] },
  { name: "Laxmi Vilas Palace Gate", coords: [73.1923, 22.2945] },
  { name: "MSU Baroda Campus", coords: [73.1840, 22.3100] }
];

// Helper to score and rank geocoding suggestions based on query relevance and transit bias
const scoreSuggestion = (name, query) => {
  const normalizedName = name.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();
  
  let score = 0;
  
  // 1. Exact match
  if (normalizedName === normalizedQuery) {
    score += 2000;
  }
  
  // 2. Starts with query
  if (normalizedName.startsWith(normalizedQuery)) {
    score += 800;
  }
  
  // 3. Contains the exact phrase
  if (normalizedName.includes(normalizedQuery)) {
    score += 400;
  }
  
  // 4. Word-by-word match
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  let wordsFound = 0;
  queryWords.forEach(word => {
    if (normalizedName.includes(word)) {
      wordsFound++;
      // Word boundary match bonus
      const regex = new RegExp('\\b' + word + '\\b');
      if (regex.test(normalizedName)) {
        score += 150;
      } else {
        score += 30;
      }
    }
  });
  
  if (wordsFound === queryWords.length && queryWords.length > 1) {
    score += 300;
  }
  
  // 5. Starts with any of the query words bonus (e.g. starts with "Central" when searching "Chennai Central")
  if (queryWords[0] && normalizedName.startsWith(queryWords[0])) {
    score += 400;
  }
  if (queryWords[1] && normalizedName.startsWith(queryWords[1])) {
    score += 300;
  }
  
  // 6. Transit and landmark keywords (SafeCommute routing priority)
  const transitHubKeywords = ['station', 'stop', 'terminal', 'airport', 'metro', 'railway', 'junction'];
  const landmarkKeywords = ['central', 'garden', 'mall', 'hospital', 'square', 'cross', 'road', 'st', 'avenue', 'street'];
  
  let hasTransitHub = false;
  transitHubKeywords.forEach(keyword => {
    if (normalizedName.includes(keyword)) {
      hasTransitHub = true;
    }
  });
  
  let hasLandmark = false;
  landmarkKeywords.forEach(keyword => {
    if (normalizedName.includes(keyword)) {
      hasLandmark = true;
    }
  });
  
  if (hasTransitHub) {
    score += 800; // Direct transit hubs get a massive boost
  } else if (hasLandmark) {
    score += 300; // Streets and general landmarks get a moderate boost
  }

  // 7. Prefer shorter names for same relevance (less verbose addresses)
  score += Math.max(0, 100 - name.length);
  
  return score;
};

export default function Home({ 
  userLocation, 
  incidents, 
  onRoutesCalculated, 
  womenSafetyMode, 
  onSafetyModeChange,
  onRefreshLocation
}) {
  const { currentUser, logout } = useAuth();
  const [origin, setOrigin] = useState("Vadodara Railway Station");
  const [originCoords, setOriginCoords] = useState([73.1812, 22.3072]);
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState(null);
  
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const hasSyncedInitialLocation = useRef(false);

  // Sync origin with exact current location ONLY ONCE initially when userLocation first loads
  useEffect(() => {
    if (userLocation && userLocation.lat && userLocation.lng && !hasSyncedInitialLocation.current) {
      setOrigin("Current Location");
      setOriginCoords([userLocation.lng, userLocation.lat]);
      hasSyncedInitialLocation.current = true;
    }
  }, [userLocation]);


  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  // Autocomplete fetcher
  const handleQueryChange = async (query, setInput, setCoords, setSuggestions) => {
    setInput(query);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (!mapboxToken || mapboxToken.trim() === "") {
      // Offline/Mock search autocomplete
      const filtered = MOCK_LOCATIONS.filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase())
      );
      filtered.sort((a, b) => scoreSuggestion(b.name, query) - scoreSuggestion(a.name, query));
      setSuggestions(filtered);
      return;
    }

    // Real Mapbox Geocoding call (we execute two parallel queries to catch stations/stops and merge them)
    try {
      const [res1, res2] = await Promise.all([
        axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`, {
          params: {
            access_token: mapboxToken,
            proximity: userLocation && userLocation.lng ? `${userLocation.lng},${userLocation.lat}` : '73.1812,22.3072',
            country: 'IN',
            types: 'poi,address,neighborhood,place',
            limit: 8
          }
        }),
        axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + " station")}.json`, {
          params: {
            access_token: mapboxToken,
            proximity: userLocation && userLocation.lng ? `${userLocation.lng},${userLocation.lat}` : '73.1812,22.3072',
            country: 'IN',
            types: 'poi,address,neighborhood,place',
            limit: 8
          }
        })
      ]);

      const allFeatures = [
        ...(res1.data?.features || []),
        ...(res2.data?.features || [])
      ];

      // Deduplicate by place_name
      const places = [];
      const seenNames = new Set();
      for (const f of allFeatures) {
        if (!seenNames.has(f.place_name)) {
          seenNames.add(f.place_name);
          places.push({
            name: f.place_name,
            coords: f.geometry.coordinates
          });
        }
      }
      
      // Sort suggestions by query relevance and transit bias
      places.sort((a, b) => scoreSuggestion(b.name, query) - scoreSuggestion(a.name, query));
      
      setSuggestions(places);
    } catch (err) {
      console.warn("Geocoding failed, fallback to mock list:", err.message);
      const filtered = MOCK_LOCATIONS.filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase())
      );
      filtered.sort((a, b) => scoreSuggestion(b.name, query) - scoreSuggestion(a.name, query));
      setSuggestions(filtered);
    }
  };

  const handleSearchRoutes = async () => {
    if (!originCoords || !destinationCoords) return;
    setLoading(true);
    try {
      const response = await axios.post('/api/routes/compare', {
        origin,
        destination,
        originCoords,
        destinationCoords,
        womenSafetyMode
      });
      const data = response.data;
      data.originName = origin;
      data.destinationName = destination;
      onRoutesCalculated(data);
    } catch (err) {
      console.error("Route calculation error:", err.message);
      
      // Offline fallback: simulate response structure
      const isDemo = origin.includes("Railway Station") && destination.includes("Akota");
      const duration = isDemo ? 14 * 60 : 12 * 60;
      const distance = isDemo ? 4200 : 3500;
      
      const mockRoutes = [
        {
          name: "Route A",
          label: "FASTEST",
          geometry: { 
            type: "LineString", 
            coordinates: isDemo 
              ? [[73.1812, 22.3072], [73.1818, 22.3060], [73.1830, 22.3050], [73.1825, 22.3020], [73.1800, 22.2995], [73.1765, 22.2980], [73.1723, 22.2960]]
              : [originCoords, destinationCoords]
          },
          duration,
          distance,
          warnings: ["Poor lighting on 2 stretches"],
          safetyScore: 61,
          safetyBreakdown: {
            score: 61,
            breakdown: {
              lighting: { score: 45, weight: 0.25 },
              transitCoverage: { score: 72, weight: 0.20 },
              incidentDensity: { score: 80, weight: 0.25 },
              timeOfDay: { score: 50, weight: 0.20 },
              crowdDensity: { score: 60, weight: 0.10 }
            }
          },
          aiAdvisory: "Street illumination drops significantly near the underpass on Route A. During late hours, please take the well-lit Alkapuri route B instead."
        },
        {
          name: "Route B",
          label: "SAFEST",
          geometry: { 
            type: "LineString", 
            coordinates: isDemo
              ? [[73.1812, 22.3072], [73.1770, 22.3090], [73.1740, 22.3095], [73.1725, 22.3060], [73.1700, 22.3020], [73.1712, 22.2985], [73.1723, 22.2960]]
              : [originCoords, [(originCoords[0] + destinationCoords[0]) / 2 + 0.005, (originCoords[1] + destinationCoords[1]) / 2 + 0.005], destinationCoords]
          },
          duration: duration + 4 * 60,
          distance: distance + 700,
          warnings: [],
          safetyScore: 88,
          safetyBreakdown: {
            score: 88,
            breakdown: {
              lighting: { score: 92, weight: 0.25 },
              transitCoverage: { score: 85, weight: 0.20 },
              incidentDensity: { score: 90, weight: 0.25 },
              timeOfDay: { score: 80, weight: 0.20 },
              crowdDensity: { score: 95, weight: 0.10 }
            }
          },
          aiAdvisory: "This route maintains high safety margins with 92/100 street lighting. It is highly recommended for late evening commutes."
        }
      ];

      // Re-rank based on womenSafetyMode
      const sortedRoutes = [...mockRoutes];
      if (womenSafetyMode) {
        sortedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
      } else {
        sortedRoutes.sort((a, b) => a.duration - b.duration);
      }

      const mockResult = {
        originName: origin,
        destinationName: destination,
        routes: sortedRoutes,
        womenSafetyMode,
        bannerMessage: womenSafetyMode ? "Safety Mode Active — Prioritizing lit roads, busy streets, and transit corridors" : "",
        timeDeltaMessage: womenSafetyMode ? "Best safe route is 4 mins longer than fastest" : ""
      };
      
      onRoutesCalculated(mockResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row">
      {/* Left Sidebar Panel */}
      <div className="w-full h-[55%] md:w-1/3 md:h-full bg-white border-t md:border-t-0 md:border-r border-gray-200 p-4 md:p-6 overflow-y-auto order-2 md:order-1 flex flex-col gap-4 shadow-lg z-20">
        <div className="flex flex-col gap-3 pb-3 border-b border-gray-200">
          {/* Row 1: Brand Logo + User Name & Logout */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="text-googleBlue animate-pulse" size={16} />
              <h1 className="text-xs font-black tracking-widest text-gray-800 uppercase">SafeCommute AI</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700">
                {currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0]}
              </span>
              <button
                onClick={logout}
                className="flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-dangerRed hover:bg-red-50 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
          
          {/* Row 2: Contacts button just below */}
          <button
            onClick={() => setShowContacts(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-googleBlue/10 hover:bg-googleBlue/20 text-googleBlue text-xs font-bold transition-all duration-300 cursor-pointer border border-googleBlue/20"
            title="Manage Emergency Contacts"
          >
            <ShieldCheck size={14} />
            Manage Emergency Contacts
          </button>
        </div>

        {/* Spacer to push other content to the bottom */}
        <div className="flex-grow hidden md:block" />

        {/* Other controls (Search inputs & Action buttons) at the bottom */}
        <div className="flex flex-col gap-4 mt-auto">
          {/* Inputs */}
          <div className="space-y-3 relative">
            
            {/* Origin Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                <MapPin size={16} />
              </div>
              <input
                type="text"
                id="origin-input"
                value={origin}
                placeholder="Search Starting point..."
                onChange={(e) => handleQueryChange(e.target.value, setOrigin, setOriginCoords, setOriginSuggestions)}
                className="w-full bg-white text-xs text-gray-900 pl-10 pr-10 py-3.5 rounded-xl border border-gray-300 focus:border-googleBlue focus:ring-1 focus:ring-googleBlue focus:outline-none placeholder-gray-400 font-semibold shadow-sm"
              />
              {/* Live Location Pickup Button */}
              <button 
                onClick={async () => {
                  try {
                    const loc = await onRefreshLocation();
                    setOrigin("Current Location");
                    setOriginCoords([loc.lng, loc.lat]);
                    setOriginSuggestions([]);
                  } catch (err) {
                    alert("Live location could not be fetched. Check browser permissions.");
                  }
                }}
                className="absolute inset-y-0 right-3 flex items-center text-googleBlue hover:text-blue-700 cursor-pointer"
                title="Use current location"
              >
                <Navigation size={16} className="transform -rotate-45" />
              </button>
              {originSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                  {originSuggestions.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setOrigin(loc.name);
                        setOriginCoords(loc.coords);
                        setOriginSuggestions([]);
                      }}
                      className="w-full p-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                    >
                      <MapPin size={12} className="text-gray-400" /> {loc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                <Search size={16} />
              </div>
              <input
                type="text"
                id="destination-input"
                value={destination}
                placeholder="Search Destination..."
                onChange={(e) => handleQueryChange(e.target.value, setDestination, setDestinationCoords, setDestSuggestions)}
                className="w-full bg-white text-xs text-gray-900 pl-10 pr-4 py-3.5 rounded-xl border border-gray-300 focus:border-googleBlue focus:ring-1 focus:ring-googleBlue focus:outline-none placeholder-gray-400 font-semibold shadow-sm"
              />
              {destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                  {destSuggestions.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDestination(loc.name);
                        setDestinationCoords(loc.coords);
                        setDestSuggestions([]);
                      }}
                      className="w-full p-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                    >
                      <MapPin size={12} className="text-gray-400" /> {loc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Toggles and Find button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <WomenSafetyToggle onChange={onSafetyModeChange} />
            
            <button
              onClick={handleSearchRoutes}
              disabled={loading || !destinationCoords}
              className="flex-1 py-3.5 bg-googleBlue hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '44px' }}
              id="find-routes-button"
            >
              {loading ? 'Analyzing...' : 'Find Safe Routes'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Box */}
      <div className="w-full h-[45%] md:w-2/3 md:h-full relative order-1 md:order-2">
        <MapView 
          userLocation={userLocation} 
          incidents={incidents} 
          originCoords={originCoords}
        />
      </div>

      {/* Emergency Contacts Modal */}
      {showContacts && (
        <EmergencyContacts onClose={() => setShowContacts(false)} />
      )}
    </div>
  );
}
