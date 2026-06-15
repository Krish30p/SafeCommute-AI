import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Share2, StopCircle, CheckCircle, Navigation, Copy, Info } from 'lucide-react';
import CheckInTimer from '../Safety/CheckInTimer';
import TripShare from './TripShare';

export default function TripTracker({ 
  trip, 
  socket, 
  userLocation, 
  onTripEnd 
}) {
  const [copied, setCopied] = useState(false);
  const [smsLogs, setSmsLogs] = useState([]);
  const [showShare, setShowShare] = useState(false);

  // Listen to live SMS simulated notifications broadcasted by the server
  useEffect(() => {
    if (!socket) return;

    const handleSms = (data) => {
      console.log("📨 Simulated SMS Log Received:", data);
      setSmsLogs((prev) => [data, ...prev].slice(0, 5)); // Keep top 5 latest
    };

    socket.on('sms-notification', handleSms);

    return () => {
      socket.off('sms-notification', handleSms);
    };
  }, [socket]);

  const handleEndTrip = async () => {
    try {
      const response = await axios.post(`/api/trips/${trip.id}/end`);
      if (response.data?.success) {
        if (socket) {
          socket.emit('end-trip', { token: trip.share_token });
        }
        onTripEnd();
      }
    } catch (err) {
      console.error("Failed to end trip:", err.message);
      onTripEnd(); // Fallback
    }
  };

  const getShareUrl = () => {
    return `${window.location.origin}/track/${trip.share_token}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 1. Active Navigation Card */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col space-y-4 shadow-sm">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-safeGreen animate-ping" />
            <span className="text-xs font-black tracking-wider text-safeGreen uppercase">Active Safe Trip</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowShare(!showShare)}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1 border border-gray-200"
              style={{ minHeight: '32px' }}
            >
              <Share2 size={13} />
              Share Link
            </button>
            
            <button
              onClick={handleEndTrip}
              className="px-3 py-1.5 bg-dangerRed hover:bg-dangerRed/90 text-white text-xs font-bold rounded-lg flex items-center gap-1"
              style={{ minHeight: '32px' }}
            >
              <StopCircle size={13} />
              End Trip
            </button>
          </div>
        </div>

        {/* Origin / Destination flow */}
        <div className="space-y-2.5 text-xs font-semibold">
          <div className="flex items-start gap-2 text-gray-400">
            <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white shrink-0 mt-0.5">A</span>
            <div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase block">Starting From</span>
              <span className="text-gray-800 font-bold">{trip.origin_name}</span>
            </div>
          </div>
          <div className="h-4 border-l border-dashed border-darkBorder ml-2" />
          <div className="flex items-start gap-2 text-gray-300">
            <span className="w-4 h-4 rounded-full bg-safeGreen flex items-center justify-center text-[10px] text-white shrink-0 mt-0.5">B</span>
            <div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase block">Destination</span>
              <span className="text-gray-900 font-bold">{trip.destination_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Link Overlay Drawer */}
      {showShare && (
        <TripShare shareUrl={getShareUrl()} handleCopy={handleCopyLink} copied={copied} />
      )}

      {/* 2. Check-in Timer Widget */}
      <CheckInTimer 
        trip={trip} 
        onCheckInComplete={onTripEnd} 
      />

      {/* 3. Outgoing SMS Dispatch Logs Console */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 shadow-inner">
        <h4 className="text-[10px] font-black tracking-widest text-blue-400 uppercase flex items-center gap-1.5">
          <Info size={13} /> SMS Alerts Dispatch Console
        </h4>
        
        <div className="space-y-2">
          {smsLogs.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-gray-600 font-semibold border border-dashed border-darkBorder/40 rounded-lg">
              No recent notifications dispatched. Trigger SOS or start a trip to simulate SMS.
            </div>
          ) : (
            smsLogs.map((log, i) => (
              <div 
                key={i} 
                className="bg-white border border-gray-200 p-2.5 rounded-lg text-xs flex flex-col gap-1.5 animate-fade-in shadow-sm"
              >
                <div className="flex justify-between items-center font-bold">
                  <span className="text-gray-800">To: <span className="text-blue-600 font-black">{log.to}</span></span>
                  <span className="text-gray-600 text-[10px]">{log.timestamp}</span>
                </div>
                <div className="text-[11px] text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 font-mono whitespace-pre-line leading-relaxed">
                  {log.body}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
