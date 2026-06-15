import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Navigation, Map, AlertTriangle, Eye } from 'lucide-react';
import MapView from '../components/Map/MapView';
import TripTracker from '../components/Trip/TripTracker';
import LiveTransitPanel from '../components/Transit/LiveTransitPanel';
import SOSButton from '../components/Safety/SOSButton';
import ReportIncident from '../components/Incidents/ReportIncident';

export default function ActiveTrip({ 
  trip, 
  socket, 
  userLocation, 
  geoSimulator, // { isSimulating, startSimulation, stopSimulation }
  incidents, 
  onIncidentAdded,
  onTripEnd 
}) {
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [isSimulatingCoords, setIsSimulatingCoords] = useState(false);

  // Sync simulation coordinates update to WebSocket server
  useEffect(() => {
    if (!socket || !trip || !userLocation) return;
    
    // Emit coordinate stream to tracking rooms
    socket.emit('update-location', {
      token: trip.share_token,
      lat: userLocation.lat,
      lng: userLocation.lng,
      eta: trip.eta
    });
    
  }, [userLocation, socket, trip]);

  // Handle route coordinates simulation toggle
  const toggleSimulation = () => {
    if (isSimulatingCoords) {
      geoSimulator.stopSimulation();
      setIsSimulatingCoords(false);
    } else {
      const coords = trip.selected_route?.coordinates || [];
      if (coords.length > 0) {
        geoSimulator.startSimulation(coords, 1.5); // 1.5x speed
        setIsSimulatingCoords(true);
      }
    }
  };

  // Turn off simulation on unmount
  useEffect(() => {
    return () => {
      geoSimulator.stopSimulation();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row">
      {/* 1. Map Canvas split */}
      <div className="w-full h-2/5 md:w-1/2 md:h-full relative order-1 md:order-2">
        <MapView
          userLocation={userLocation}
          incidents={incidents}
          routes={[{ geometry: trip.selected_route, safetyScore: trip.safety_score }]}
          selectedRouteIndex={0}
          activeTrip={trip}
        />

        {/* Floating Simulation Controls */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <button
            onClick={toggleSimulation}
            className={`px-4 py-2.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg border transition-all cursor-pointer ${
              isSimulatingCoords
                ? 'bg-safeGreen border-safeGreen text-white'
                : 'bg-white/90 border-gray-200 hover:border-gray-300 text-gray-800'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Navigation size={13} className={isSimulatingCoords ? 'animate-spin' : ''} />
            {isSimulatingCoords ? 'Simulating Movement...' : '🚗 Simulate Travel'}
          </button>
        </div>

        {/* Floating Emergency SMS Logs Indicator */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <div className="bg-white/90 border border-gray-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-gray-700 tracking-wider shadow-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>SOS RADAR ONLINE</span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Widgets Panel */}
      <div className="w-full h-3/5 md:w-1/2 md:h-full bg-white border-t md:border-t-0 md:border-r border-gray-200 p-4 md:p-6 overflow-y-auto order-2 md:order-1 flex flex-col gap-4 select-none scrollbar-thin">
        
        {/* Header summary */}
        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Navigation Dashboard</h2>
            <p className="text-[11px] text-gray-500 font-bold">Monitor your safety parameters and transit links</p>
          </div>

          <button
            onClick={() => setShowReportSheet(true)}
            className="px-4 py-2 bg-dangerRed hover:bg-dangerRed/90 text-white rounded-lg text-xs font-black shadow-md shadow-dangerRed/10 cursor-pointer"
            style={{ minHeight: '40px' }}
          >
            ⚠️ Report Unsafe Area
          </button>
        </div>

        {/* Navigation Tracker Widget */}
        <TripTracker 
          trip={trip} 
          socket={socket} 
          userLocation={userLocation} 
          onTripEnd={onTripEnd} 
        />

        {/* Live Transit Feeds Widget */}
        <LiveTransitPanel location={userLocation} />
      </div>

      {/* SOS Button Component overlay */}
      <SOSButton location={userLocation} tripId={trip.id} />

      {/* Report Incident Modal overlay */}
      {showReportSheet && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <ReportIncident
              location={userLocation}
              onClose={() => setShowReportSheet(false)}
              onReportSuccess={onIncidentAdded}
            />
          </div>
        </div>
      )}
    </div>
  );
}
