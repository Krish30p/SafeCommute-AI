import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';
import MapView from '../components/Map/MapView';
import { Eye, Shield, Clock, MapPin, CheckCircle } from 'lucide-react';
import { formatDuration, formatTime } from '../utils/formatters';

export default function PublicTracking({ token, onBackHome }) {
  const [trip, setTrip] = useState(null);
  const [userName, setUserName] = useState('');
  const [liveLocation, setLiveLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tripEnded, setTripEnded] = useState(false);

  // Initialize socket using proxy-friendly root relative path
  const socketClient = useSocket();

  // 1. Fetch trip data
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const response = await axios.get(`/api/trips/track/${token}`);
        setTrip(response.data.trip);
        setUserName(response.data.userName);
        
        // Seed initial live location with trip origin
        if (response.data.trip) {
          setLiveLocation({
            lat: response.data.trip.origin_lat,
            lng: response.data.trip.origin_lng
          });
        }
      } catch (err) {
        console.error("Failed to load sharing details:", err.message);
        setError("This tracking link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrip();
  }, [token]);

  // 2. Connect to WebSocket room and listen to updates
  useEffect(() => {
    if (!socketClient || !trip) return;

    // Join room
    socketClient.emit('join-trip', { token });

    // Listen to coordinate streams
    socketClient.on('location-updated', (coords) => {
      console.log("📍 Share-Page location update:", coords);
      setLiveLocation({
        lat: coords.lat,
        lng: coords.lng
      });
      if (coords.eta) {
        setTrip((prev) => prev ? { ...prev, eta: coords.eta } : null);
      }
    });

    // Listen to trip end events
    socketClient.on('trip-ended', () => {
      setTripEnded(true);
      setTrip((prev) => prev ? { ...prev, status: 'completed' } : null);
    });

    return () => {
      socketClient.emit('leave-trip', { token });
      socketClient.off('location-updated');
      socketClient.off('trip-ended');
    };
  }, [socketClient, trip, token]);

  if (loading) {
    return (
      <div className="w-full h-full bg-darkBg flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-safeGreen border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-extrabold tracking-widest uppercase">Connecting to Live Feed...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="w-full h-full bg-darkBg flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-red-950/20 border border-red-900/40 rounded-full flex items-center justify-center text-dangerRed">
          <Shield size={28} />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Invalid Link</h3>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">{error}</p>
        </div>
        <button
          onClick={onBackHome}
          className="px-6 py-2.5 bg-darkBorder border border-gray-700 text-white rounded-lg text-xs font-bold"
        >
          Go to Home Search
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row select-none">
      
      {/* Map display */}
      <div className="w-full h-3/5 md:w-2/3 md:h-full relative order-1 md:order-2">
        <MapView
          userLocation={liveLocation}
          incidents={[]}
          routes={[{ geometry: trip.selected_route, safetyScore: trip.safety_score }]}
          selectedRouteIndex={0}
        />
        
        {/* Connection status overlay */}
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-[#1A1F2E]/90 border border-darkBorder px-3 py-1.5 rounded-lg text-[9px] font-bold text-gray-400 tracking-wider shadow-lg flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${tripEnded ? 'bg-red-500' : 'bg-safeGreen animate-ping'}`} />
            <span>{tripEnded ? 'TRIP ENDED' : 'LIVE FEED BROADCAST'}</span>
          </div>
        </div>
      </div>

      {/* Sharing Panel Details */}
      <div className="w-full h-2/5 md:w-1/3 md:h-full bg-darkBg border-t md:border-t-0 md:border-r border-darkBorder p-5 md:p-6 overflow-y-auto order-2 md:order-1 flex flex-col justify-between">
        
        <div className="space-y-5">
          {/* Header */}
          <div className="pb-3 border-b border-darkBorder/40">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={16} className="text-safeGreen" /> SafeCommute Tracker
            </h2>
            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
              You are viewing the live progress of <span className="text-safeGreen font-bold">{userName}</span>
            </p>
          </div>

          {/* Trip Status Detail */}
          {tripEnded || trip.status === 'completed' || trip.status === 'checked-in' ? (
            <div className="bg-safeGreen/15 border border-safeGreen/30 p-4 rounded-xl flex items-center gap-3 text-safeGreen text-xs">
              <CheckCircle size={20} className="shrink-0" />
              <div>
                <p className="font-extrabold uppercase tracking-wide">Arrived Safely</p>
                <p className="text-[11px] text-gray-300 font-medium">
                  {userName} has checked in safely at the destination. Tracking has closed.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-darkCard p-4 rounded-xl border border-darkBorder space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-semibold">ETA ETA</span>
                <span className="text-safeGreen font-bold flex items-center gap-1">
                  <Clock size={12} />
                  {formatTime(trip.eta)}
                </span>
              </div>
              <div className="w-full bg-darkBorder h-1 rounded-full overflow-hidden">
                <div className="h-full bg-safeGreen w-1/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* Location details */}
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex items-start gap-2 text-gray-400">
              <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[9px] text-white shrink-0 mt-0.5">A</span>
              <div>
                <span className="text-[9px] text-gray-500 uppercase block font-extrabold">Origin</span>
                <span className="text-gray-300 font-bold leading-normal">{trip.origin_name}</span>
              </div>
            </div>
            <div className="h-4 border-l border-dashed border-darkBorder ml-2" />
            <div className="flex items-start gap-2 text-gray-300">
              <span className="w-4 h-4 rounded-full bg-safeGreen flex items-center justify-center text-[9px] text-white shrink-0 mt-0.5">B</span>
              <div>
                <span className="text-[9px] text-gray-500 uppercase block font-extrabold">Destination</span>
                <span className="text-gray-100 font-bold leading-normal">{trip.destination_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer brand */}
        <div className="pt-4 border-t border-darkBorder/40 flex items-center justify-between text-[10px] text-gray-500 font-semibold">
          <span>🛡️ Protected by SafeCommute AI</span>
          <button 
            onClick={onBackHome}
            className="text-safeGreen hover:underline font-bold"
          >
            Create Your Route
          </button>
        </div>

      </div>
      
    </div>
  );
}
