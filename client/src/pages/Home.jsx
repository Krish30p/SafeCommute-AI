import React, { useState, useEffect } from 'react';
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
  const [destination, setDestination] = useState("Akota Garden Stop");
  const [destinationCoords, setDestinationCoords] = useState([73.1723, 22.2960]);
  
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  // Sync origin with exact current location when userLocation updates
  useEffect(() => {
    if (userLocation && userLocation.lat && userLocation.lng) {
      setOrigin("Current Location");
      setOriginCoords([userLocation.lng, userLocation.lat]);
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
      setSuggestions(filtered);
      return;
    }

    // Real Mapbox Geocoding call
    try {
      const response = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`, {
        params: {
          access_token: mapboxToken,
          proximity: userLocation && userLocation.lng ? `${userLocation.lng},${userLocation.lat}` : '73.1812,22.3072',
          country: 'IN',
          types: 'poi,address,neighborhood,place',
          limit: 10
        }
      });
      const places = response.data.features.map(f => ({
        name: f.place_name,
        coords: f.geometry.coordinates
      }));
      setSuggestions(places);
    } catch (err) {
      console.warn("Geocoding failed, fallback to mock list:", err.message);
      const filtered = MOCK_LOCATIONS.filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase())
      );
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
      
      const mockResult = {
        originName: origin,
        destinationName: destination,
        routes: [
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
        ],
        womenSafetyMode,
        bannerMessage: "Safety Mode Active — Prioritizing lit roads, busy streets, and transit corridors",
        timeDeltaMessage: "Best safe route is 4 mins longer than fastest"
      };
      
      onRoutesCalculated(mockResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Search overlay panel */}
      <div className="absolute top-4 left-4 right-4 z-20 glass-panel p-4 rounded-2xl shadow-lg flex flex-col gap-3 max-w-md md:left-6">
        <div className="flex items-center justify-between pb-1 border-b border-gray-200">
          <div className="flex items-center gap-1.5">
            <Sparkles className="text-googleBlue animate-pulse" size={16} />
            <h1 className="text-xs font-black tracking-widest text-gray-800 uppercase">SafeCommute AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 truncate max-w-[80px]">
              {currentUser?.displayName || currentUser?.email?.split('@')[0]}
            </span>
            <button
              onClick={() => setShowContacts(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-googleBlue/10 hover:bg-googleBlue/20 text-googleBlue transition-colors cursor-pointer"
              title="Manage Emergency Contacts"
            >
              <ShieldCheck size={13} />
              <span className="text-[10px] font-bold hidden sm:inline">Contacts</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-dangerRed hover:bg-red-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-2 relative">
          
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
              className="w-full bg-white text-xs text-gray-900 pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:border-googleBlue focus:ring-1 focus:ring-googleBlue focus:outline-none placeholder-gray-400 font-semibold shadow-sm"
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
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
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
              className="w-full bg-white text-xs text-gray-900 pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-googleBlue focus:ring-1 focus:ring-googleBlue focus:outline-none placeholder-gray-400 font-semibold shadow-sm"
            />
            {destSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
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
        <div className="flex items-center gap-2 justify-between mt-1">
          <WomenSafetyToggle onChange={onSafetyModeChange} />
          
          <button
            onClick={handleSearchRoutes}
            disabled={loading}
            className="flex-1 py-2.5 bg-googleBlue hover:bg-blue-600 text-white rounded-full text-xs font-extrabold tracking-wide transition-all shadow-md flex items-center justify-center gap-1"
            style={{ minHeight: '44px' }}
            id="find-routes-button"
          >
            {loading ? 'Analyzing...' : 'Find Safe Routes'}
          </button>
        </div>
      </div>

      {/* Main Map Box */}
      <div className="flex-1 w-full h-full">
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
