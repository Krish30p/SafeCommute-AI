import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Play, Shield } from 'lucide-react';
import MapView from '../components/Map/MapView';
import RouteComparison from '../components/Routes/RouteComparison';
import WomenSafetyToggle from '../components/Safety/WomenSafetyToggle';
import RiskForecaster from '../components/Routes/RiskForecaster';
import { useAuth } from '../contexts/AuthContext';

export default function RouteSelection({ 
  routesData, 
  userLocation, 
  incidents, 
  onTripStarted, 
  onBack,
  womenSafetyMode,
  onSafetyModeChange,
  onRoutesDataUpdate
}) {
  const { currentUser } = useAuth();
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [startingTrip, setStartingTrip] = useState(false);

  const routes = routesData?.routes || [];
  const selectedRoute = routes[selectedRouteIndex];

  const handleStartTrip = async () => {
    if (!selectedRoute) return;
    setStartingTrip(true);

    // Get coordinates bounds
    const coords = selectedRoute.geometry.coordinates;
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    try {
      // Fetch MongoDB contacts for the logged-in user
      let userContacts = [];
      if (currentUser) {
        const snap = await axios.get('/api/contacts');
        userContacts = snap.data || [];
      }
      const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'A SafeCommute User';

      const response = await axios.post('/api/trips/start', {
        originLat: startCoord[1],
        originLng: startCoord[0],
        destinationLat: endCoord[1],
        destinationLng: endCoord[0],
        originName: routesData.originName || "Origin",
        destinationName: routesData.destinationName || "Destination",
        selectedRoute: selectedRoute.geometry,
        safetyScore: selectedRoute.safetyScore,
        durationSeconds: selectedRoute.duration,
        userName: userName,
        contacts: userContacts
      });

      if (response.data?.success) {
        onTripStarted(response.data.trip);
      }
    } catch (err) {
      console.error("Failed to start trip session:", err.message);
      
      // Offline fallback: generate mock active trip
      const mockTrip = {
        id: Math.random().toString(),
        origin_name: routesData.originName || "Origin",
        destination_name: routesData.destinationName || "Destination",
        selected_route: selectedRoute.geometry,
        safety_score: selectedRoute.safetyScore,
        eta: new Date(Date.now() + selectedRoute.duration * 1000).toISOString(),
        share_token: Math.random().toString(36).substring(2, 10),
        status: 'active'
      };
      onTripStarted(mockTrip);
    } finally {
      setStartingTrip(false);
    }
  };

  const handleSafetyToggle = async (newVal) => {
    onSafetyModeChange(newVal);
    // Re-fetch routes comparison from backend with new mode
    try {
      const lastRoute = routes[0];
      const startCoord = lastRoute.geometry.coordinates[0];
      const endCoord = lastRoute.geometry.coordinates[lastRoute.geometry.coordinates.length - 1];

      const response = await axios.post('/api/routes/compare', {
        originCoords: startCoord,
        destinationCoords: endCoord,
        womenSafetyMode: newVal
      });
      
      // Update routes data in parent state via callback
      if (onRoutesDataUpdate) {
        onRoutesDataUpdate(response.data);
      }
      
      // Reset selected route index
      setSelectedRouteIndex(0);
    } catch (e) {
      console.warn("Failed to update safety weights on re-ranking, fallback to local sort:", e.message);
      if (routesData && routesData.routes) {
        const sortedRoutes = [...routesData.routes];
        if (newVal) {
          // Rank by safetyScore descending
          sortedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
        } else {
          // Rank by duration ascending
          sortedRoutes.sort((a, b) => a.duration - b.duration);
        }
        
        // Find fastest and safest to calculate delta if newVal is true
        const fastestRoute = [...routesData.routes].sort((a, b) => a.duration - b.duration)[0];
        const safestRoute = [...routesData.routes].sort((a, b) => b.safetyScore - a.safetyScore)[0];
        const timeDeltaMinutes = Math.max(0, Math.round((safestRoute.duration - fastestRoute.duration) / 60));

        const updatedData = {
          ...routesData,
          routes: sortedRoutes,
          womenSafetyMode: newVal,
          bannerMessage: newVal ? "Safety Mode Active — Prioritizing lit roads, busy streets, and transit corridors" : "",
          timeDeltaMessage: newVal 
            ? (timeDeltaMinutes > 0 ? `Best safe route is ${timeDeltaMinutes} mins longer than fastest` : "Best safe route is also the fastest route!")
            : ""
        };
        
        if (onRoutesDataUpdate) {
          onRoutesDataUpdate(updatedData);
        }
        setSelectedRouteIndex(0);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row">
      {/* 1. Map View Panel - Takes 100% on mobile behind overlay, and 50% split on desktop */}
      <div className="w-full h-2/5 md:w-1/2 md:h-full relative order-1 md:order-2">
        <MapView
          userLocation={userLocation}
          incidents={incidents}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
        />
        
        {/* Floating Back arrow */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-3 bg-white/90 border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-full shadow-md z-20 transition-all cursor-pointer"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* 2. Routes Comparison drawer - Takes 60% on mobile, and 50% split on desktop */}
      <div className="w-full h-3/5 md:w-1/2 md:h-full bg-white border-t md:border-t-0 md:border-r border-gray-200 p-4 md:p-6 overflow-y-auto order-2 md:order-1 flex flex-col gap-4 select-none scrollbar-thin">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Select Commuting Route</h2>
            <p className="text-[11px] text-gray-500 font-bold">Compare route safety scores and advisories</p>
          </div>
          
          <WomenSafetyToggle onChange={handleSafetyToggle} />
        </div>

        {/* Temporal Risk Forecasting */}
        {routes.length > 0 && (
          <RiskForecaster 
            originCoords={routes[0].geometry.coordinates[0]} 
            destinationCoords={routes[0].geometry.coordinates[routes[0].geometry.coordinates.length - 1]} 
          />
        )}

        {/* Route Comparisons panel */}
        <div className="flex-1 mt-2">
          <RouteComparison
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={setSelectedRouteIndex}
            womenSafetyMode={routesData.womenSafetyMode}
            bannerMessage={routesData.bannerMessage}
            timeDeltaMessage={routesData.timeDeltaMessage}
          />
        </div>

        {/* Start Safe Trip Button */}
        {selectedRoute && (
          <button
            onClick={handleStartTrip}
            disabled={startingTrip}
            className="w-full py-3.5 bg-googleBlue hover:bg-blue-600 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
            id="start-trip-button"
          >
            <Play size={15} fill="currentColor" />
            {startingTrip ? 'Initializing Session...' : 'Start Safe Trip'}
          </button>
        )}
      </div>
    </div>
  );
}
