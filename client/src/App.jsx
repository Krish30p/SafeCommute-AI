import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useGeolocation } from './hooks/useGeolocation';
import { useSocket } from './hooks/useSocket';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import RouteSelection from './pages/RouteSelection';
import ActiveTrip from './pages/ActiveTrip';
import PublicTracking from './pages/PublicTracking';
import ReportIncident from './components/Incidents/ReportIncident';
import AuthContainer from './pages/Auth/AuthContainer';
import CustomCursor from './components/CustomCursor';
import { Map as MapIcon, Navigation, AlertOctagon, HelpCircle } from 'lucide-react';

function AppContent() {
  const { currentUser } = useAuth();
  const [page, setPage] = useState('home'); // 'home' | 'routes' | 'navigation' | 'track'
  const [sharingToken, setSharingToken] = useState('');
  const [routesData, setRoutesData] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [womenSafetyMode, setWomenSafetyMode] = useState(() => {
    const saved = localStorage.getItem('womenSafetyMode');
    return saved === 'true';
  });
  const [incidents, setIncidents] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);

  // Initialize GPS tracker hook
  const geoTracker = useGeolocation();

  // Initialize Socket.io connection using proxy-friendly root relative path
  const socketClient = useSocket();

  // 1. Fetch initial incident pins based on location
  const fetchIncidents = async (lat, lng) => {
    try {
      const params = {};
      if (lat && lng) {
        params.lat = lat;
        params.lng = lng;
      }
      const response = await axios.get('/api/incidents', { params });
      setIncidents(response.data || []);
    } catch (err) {
      console.warn("Failed to fetch initial incidents:", err.message);
    }
  };

  useEffect(() => {
    if (geoTracker.location && geoTracker.location.lat) {
      fetchIncidents(geoTracker.location.lat, geoTracker.location.lng);
    } else {
      fetchIncidents();
    }

    // Check for sharing link on load
    const path = window.location.pathname;
    if (path.startsWith('/track/')) {
      const token = path.replace('/track/', '');
      if (token) {
        setSharingToken(token);
        setPage('track');
      }
    }
  }, [geoTracker.location?.lat, geoTracker.location?.lng]);

  // 2. Listen for socket real-time broadcasts
  useEffect(() => {
    if (!socketClient) return;

    socketClient.on('new-incident', (newIncident) => {
      console.log("📢 Real-time incident pin received:", newIncident);
      setIncidents((prev) => [newIncident, ...prev]);
    });

    return () => {
      socketClient.off('new-incident');
    };
  }, [socketClient]);

  const handleSafetyModeChange = (enabled) => {
    setWomenSafetyMode(enabled);
  };

  const handleRoutesCalculated = (data) => {
    setRoutesData(data);
    setPage('routes');
    if (data.routes && data.routes.length > 0) {
      const coords = data.routes[0].geometry.coordinates;
      const lastCoord = coords[coords.length - 1]; 
      fetchIncidents(lastCoord[1], lastCoord[0]);
    }
  };

  const handleTripStarted = (trip) => {
    setActiveTrip(trip);
    setPage('navigation');
  };

  const handleIncidentAdded = (newIncident) => {
    if (!incidents.some(i => i.id === newIncident.id)) {
      setIncidents((prev) => [newIncident, ...prev]);
    }
  };

  const handleRoutesDataUpdate = (newData) => {
    setRoutesData(newData);
  };

  const handleBackToSearch = () => {
    setRoutesData(null);
    setPage('home');
  };

  const handleTripEnd = () => {
    setActiveTrip(null);
    setRoutesData(null);
    setPage('home');
    geoTracker.stopSimulation();
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setPage('home');
  };

  // Enforce Login
  if (!currentUser) {
    return <AuthContainer />;
  }

  return (
    <div className="w-full h-full flex flex-col bg-darkBg text-gray-900 select-none">
      
      {/* Dynamic Content Frame */}
      <div className="flex-1 w-full overflow-hidden">
        {page === 'track' && (
          <PublicTracking 
            token={sharingToken} 
            onBackHome={navigateToHome} 
          />
        )}
        
        {page === 'home' && (
          <Home
            userLocation={geoTracker.location}
            incidents={incidents}
            onRoutesCalculated={handleRoutesCalculated}
            womenSafetyMode={womenSafetyMode}
            onSafetyModeChange={handleSafetyModeChange}
            onRefreshLocation={geoTracker.refreshLocation}
          />
        )}

        {page === 'routes' && (
          <RouteSelection
            routesData={routesData}
            userLocation={geoTracker.location}
            incidents={incidents}
            onTripStarted={handleTripStarted}
            onBack={handleBackToSearch}
            womenSafetyMode={womenSafetyMode}
            onSafetyModeChange={handleSafetyModeChange}
            onRoutesDataUpdate={handleRoutesDataUpdate}
          />
        )}

        {page === 'navigation' && (
          <ActiveTrip
            trip={activeTrip}
            socket={socketClient}
            userLocation={geoTracker.location}
            geoSimulator={geoTracker}
            incidents={incidents}
            onIncidentAdded={handleIncidentAdded}
            onTripEnd={handleTripEnd}
          />
        )}
      </div>

      {/* Bottom Navigation Bar */}
      {page !== 'track' && (
        <div className="bg-white border-t border-gray-200 flex justify-around items-center px-2 py-4 select-none z-30">
          
          <button
            onClick={() => {
              if (page !== 'navigation') {
                setPage(routesData ? 'routes' : 'home');
              }
            }}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${page === 'home' || page === 'routes' ? 'text-googleBlue font-black' : 'text-gray-500 hover:text-gray-900'}`}
            style={{ minHeight: '60px' }}
          >
            <MapIcon size={24} />
            <span className="text-[10px] font-bold">Map</span>
          </button>

          <button
            onClick={() => {
              if (activeTrip) {
                setPage('navigation');
              } else {
                alert("You do not have an active trip. Select routes and click 'Start Safe Trip' to view tracking details.");
              }
            }}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                page === 'navigation' 
                  ? 'text-googleBlue font-black' 
                  : 'text-gray-500 hover:text-gray-900'
            }`}
            style={{ minHeight: '60px' }}
          >
            <Navigation size={24} />
            <span className="text-[10px] font-bold">Trip</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            style={{ minHeight: '60px' }}
          >
            <AlertOctagon size={24} className="text-dangerRed" />
            <span className="text-[10px] font-bold">Report</span>
          </button>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto">
            <ReportIncident
              location={geoTracker.location}
              onClose={() => setShowReportModal(false)}
              onReportSuccess={(newInc) => {
                handleIncidentAdded(newInc);
                if (socketClient) {
                  socketClient.emit('update-location', {
                    token: 'new-incident-trigger',
                    ...newInc
                  });
                }
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CustomCursor />
      <AppContent />
    </AuthProvider>
  );
}
