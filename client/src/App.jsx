import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useGeolocation } from './hooks/useGeolocation';
import { useSocket } from './hooks/useSocket';
import Home from './pages/Home';
import RouteSelection from './pages/RouteSelection';
import ActiveTrip from './pages/ActiveTrip';
import PublicTracking from './pages/PublicTracking';
import ReportIncident from './components/Incidents/ReportIncident';
import { Map as MapIcon, Navigation, AlertOctagon, HelpCircle } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState('home'); // 'home' | 'routes' | 'navigation' | 'track'
  const [sharingToken, setSharingToken] = useState('');
  const [routesData, setRoutesData] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [womenSafetyMode, setWomenSafetyMode] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);

  // Initialize GPS tracker hook
  const geoTracker = useGeolocation();

  // Initialize Socket.io connection using proxy-friendly root relative path
  const socketClient = useSocket();

  // 1. Fetch initial incident pins
  const fetchIncidents = async () => {
    try {
      const response = await axios.get('/api/incidents');
      setIncidents(response.data || []);
    } catch (err) {
      console.warn("Failed to fetch initial incidents:", err.message);
    }
  };

  useEffect(() => {
    fetchIncidents();

    // Check for sharing link on load
    const path = window.location.pathname;
    if (path.startsWith('/track/')) {
      const token = path.replace('/track/', '');
      if (token) {
        setSharingToken(token);
        setPage('track');
      }
    }
  }, []);

  // 2. Listen for socket real-time broadcasts
  useEffect(() => {
    if (!socketClient) return;

    // Receive crowdsourced incident reports in real-time
    socketClient.on('new-incident', (newIncident) => {
      console.log("📢 Real-time incident pin received:", newIncident);
      setIncidents((prev) => [newIncident, ...prev]);
    });

    return () => {
      socketClient.off('new-incident');
    };
  }, [socketClient]);

  // Update safety mode state
  const handleSafetyModeChange = (enabled) => {
    setWomenSafetyMode(enabled);
  };

  const handleRoutesCalculated = (data) => {
    setRoutesData(data);
    setPage('routes');
  };

  const handleTripStarted = (trip) => {
    setActiveTrip(trip);
    setPage('navigation');
  };

  const handleIncidentAdded = (newIncident) => {
    // Local update fallback just in case socket is offline
    if (!incidents.some(i => i.id === newIncident.id)) {
      setIncidents((prev) => [newIncident, ...prev]);
    }
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

  return (
    <div className="w-full h-full flex flex-col bg-darkBg text-gray-100 select-none">
      
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

      {/* Bottom Navigation Bar - Standard layout rules: Map | Trip | Report */}
      {page !== 'track' && (
        <div className="bg-[#10141E] border-t border-darkBorder flex justify-around items-center px-2 py-2 select-none z-30">
          
          <button
            onClick={() => {
              if (page === 'navigation') {
                // Keep on navigation
              } else {
                setPage(routesData ? 'routes' : 'home');
              }
            }}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              page === 'home' || page === 'routes' 
                ? 'text-safeGreen font-black' 
                : 'text-gray-400 hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <MapIcon size={18} />
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
                ? 'text-safeGreen font-black' 
                : 'text-gray-400 hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Navigation size={18} />
            <span className="text-[10px] font-bold">Trip</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <AlertOctagon size={18} className="text-dangerRed" />
            <span className="text-[10px] font-bold">Report</span>
          </button>
        </div>
      )}

      {/* Incident reporting modal triggered from bottom navigation */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto">
            <ReportIncident
              location={geoTracker.location}
              onClose={() => setShowReportModal(false)}
              onReportSuccess={(newInc) => {
                handleIncidentAdded(newInc);
                // Dispatch incident to websocket server so other clients load it instantly
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
