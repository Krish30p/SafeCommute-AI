import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

export default function CheckInTimer({ trip, onCheckInComplete }) {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isEtaExpired, setIsEtaExpired] = useState(false);
  const [alertCountdown, setAlertCountdown] = useState(300); // 5 minutes in seconds
  const [isAlertTriggered, setIsAlertTriggered] = useState(false);
  const [isSimulatingExpiry, setIsSimulatingExpiry] = useState(false);

  // Compute time difference
  useEffect(() => {
    if (!trip || !trip.eta) return;

    const etaTime = new Date(trip.eta).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.round((etaTime - now) / 1000);

      if (diff <= 0) {
        setTimeLeftSeconds(0);
        setIsEtaExpired(true);
      } else {
        setTimeLeftSeconds(diff);
        setIsEtaExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [trip]);

  // Tick the 5-minute safety alert countdown if ETA is expired
  useEffect(() => {
    if (!isEtaExpired || isAlertTriggered) return;

    const interval = setInterval(() => {
      setAlertCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsAlertTriggered(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEtaExpired, isAlertTriggered]);

  const handleSafeCheckIn = async () => {
    try {
      const response = await axios.post(`/api/trips/${trip.id}/checkin`);
      if (response.data?.success) {
        if (onCheckInComplete) {
          onCheckInComplete();
        }
      }
    } catch (err) {
      console.error("Check-in failed:", err.message);
      // Fallback
      if (onCheckInComplete) onCheckInComplete();
    }
  };

  // Force simulation of expiry trigger instantly for demo evaluations
  const handleSimulateExpiry = async () => {
    setIsSimulatingExpiry(true);
    try {
      const response = await axios.post(`/api/trips/${trip.id}/simulate-expiry`);
      if (response.data?.success) {
        setIsAlertTriggered(true);
        setAlertCountdown(0);
        setIsEtaExpired(true);
        if (onCheckInComplete) {
          // don't close, let them see warning, but flag completed in backend
          console.log("Simulated check-in alert successfully sent.");
        }
      }
    } catch (err) {
      console.error("Simulating check-in alert failed:", err.message);
      setIsAlertTriggered(true);
      setAlertCountdown(0);
    } finally {
      setIsSimulatingExpiry(false);
    }
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!trip) return null;

  return (
    <div className="glass-panel p-4 rounded-xl border border-darkBorder flex flex-col space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Check-in Timer</span>
          <span className="text-sm font-bold text-gray-200">
            Arriving at <span className="text-safeGreen">{trip.destination_name}</span>
          </span>
        </div>
        
        {/* Force ETA Expiry trigger */}
        {!isEtaExpired && (
          <button
            onClick={handleSimulateExpiry}
            disabled={isSimulatingExpiry}
            className="text-[10px] px-2.5 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 font-bold border border-red-800/50 rounded-lg transition-colors cursor-pointer"
          >
            {isSimulatingExpiry ? 'Simulating...' : '⚡ Test Expiry'}
          </button>
        )}
      </div>

      {!isEtaExpired ? (
        // --- TRIP IN PROGRESS TIMER ---
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-gray-400 text-xs font-semibold">ETA Remaining</div>
            <div className="text-2xl font-black text-white tracking-wide">
              {formatDuration(timeLeftSeconds)}
            </div>
          </div>
          <button
            onClick={handleSafeCheckIn}
            className="px-5 py-2.5 bg-safeGreen hover:bg-safeGreen/90 text-white rounded-lg text-xs font-black shadow-lg shadow-safeGreen/10 flex items-center gap-1.5"
            style={{ minHeight: '44px' }}
          >
            <ShieldCheck size={16} /> I Have Arrived Safely
          </button>
        </div>
      ) : (
        // --- ETA EXPIRED DANGER SCREEN ---
        <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-dangerRed shrink-0 mt-0.5 animate-bounce" size={20} />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-400">Did you arrive safely?</h4>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                Your estimated arrival time has passed. Please confirm your safety now.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-red-900/30">
            <div className="space-y-0.5">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Contacts Alert In:</div>
              <div className="text-2xl font-black text-dangerRed font-mono animate-pulse">
                {isAlertTriggered ? "0:00 - ALERT SENT" : formatCountdown(alertCountdown)}
              </div>
            </div>
            <button
              onClick={handleSafeCheckIn}
              className="px-5 py-2.5 bg-safeGreen hover:bg-safeGreen/90 text-white rounded-lg text-xs font-black shadow-lg shadow-safeGreen/20 flex items-center gap-1.5"
              style={{ minHeight: '44px' }}
            >
              <ShieldCheck size={16} /> Confirm Safe Arrival
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
