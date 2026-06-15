import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { db, collection, query, where, getDocs } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function SOSButton({ tripId, location }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState('idle'); // idle, holding, sending, sent
  const [progress, setProgress] = useState(0);
  const [holdTimer, setHoldTimer] = useState(null);
  const [contactedNames, setContactedNames] = useState([]);

  const HOLD_DURATION = 3000; // 3 seconds
  const UPDATE_INTERVAL = 50;

  useEffect(() => {
    return () => {
      if (holdTimer) clearInterval(holdTimer);
    };
  }, [holdTimer]);

  const triggerSOSAlert = async () => {
    try {
      if (!currentUser) throw new Error("Authentication required");

      // Fetch contacts from Firestore
      const q = query(collection(db, "contacts"), where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      const userContacts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (userContacts.length === 0) {
        throw new Error("No emergency contacts saved in your profile.");
      }

      let currentLat = location?.lat;
      let currentLng = location?.lng;

      if (!currentLat || !currentLng) {
        if (navigator.geolocation) {
          const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
          currentLat = pos.coords.latitude;
          currentLng = pos.coords.longitude;
        }
      }

      const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';

      const response = await axios.post('/api/sos', {
        lat: currentLat,
        lng: currentLng,
        tripId: tripId,
        contacts: userContacts,
        userName: userName
      });

      if (response.data?.success) {
        const names = response.data.contactsAlerted?.map(c => c.name) || [];
        setContactedNames(names);
        setState('sent');
      } else {
        throw new Error("SOS failed on backend");
      }
    } catch (err) {
      console.error("SOS trigger failed:", err.message);
      alert(err.message);
      setState('idle');
      setProgress(0);
    }
  };

  const handlePointerDown = (e) => {
    if (state === 'sent' || state === 'sending') return;
    
    // Prevent default touch behaviors like scrolling
    if (e.cancelable) e.preventDefault();

    setState('holding');
    setProgress(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(percent);

      if (percent >= 100) {
        clearInterval(interval);
        setHoldTimer(null);
        setState('sending');
        triggerSOSAlert();
      }
    }, UPDATE_INTERVAL);

    setHoldTimer(interval);
  };

  const handlePointerUpOrLeave = () => {
    if (state === 'holding') {
      if (holdTimer) clearInterval(holdTimer);
      setHoldTimer(null);
      setState('idle');
      setProgress(0);
    }
  };

  const reset = () => {
    setState('idle');
    setProgress(0);
    setContactedNames([]);
  };

  if (state === 'sent') {
    return (
      <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-[90%] flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 text-dangerRed rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Emergency Dispatched</h2>
          <p className="text-sm text-gray-600 mb-6">
            Alert containing your live location coordinates has been sent to your contacts:
          </p>
          
          <div className="w-full bg-gray-50 rounded-xl p-3 mb-6 space-y-2">
            {contactedNames.map((name, i) => (
              <div key={i} className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-2">
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-gray-500" />
                  </span>
                  {name}
                </span>
                <span className="text-[10px] font-bold text-green-600 uppercase">● SMS Dispatched</span>
              </div>
            ))}
          </div>

          <button
            onClick={reset}
            className="w-full py-3 bg-dangerRed hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20"
          >
            DISMISS / RESUME TRIP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 md:right-8 md:bottom-8">
      {/* Pulse effect when holding */}
      {state === 'holding' && (
        <div 
          className="absolute inset-0 rounded-full bg-dangerRed opacity-30 animate-ping pointer-events-none" 
          style={{ transform: `scale(${1 + progress/100})` }}
        />
      )}

      {/* Main Button */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOrLeave}
        onPointerLeave={handlePointerUpOrLeave}
        onContextMenu={(e) => e.preventDefault()}
        disabled={state === 'sending'}
        className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-transform overflow-hidden select-none touch-none ${
          state === 'sending' ? 'bg-red-800 cursor-not-allowed scale-95' :
          state === 'holding' ? 'bg-red-700 scale-95' : 
          'bg-dangerRed hover:bg-red-600 hover:scale-105 active:scale-95'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Progress Fill Background */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-red-900 transition-all duration-75 ease-linear"
          style={{ height: `${progress}%` }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center gap-1">
          {state === 'sending' ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <ShieldAlert size={28} className={state === 'holding' ? 'animate-pulse' : ''} />
              <span className="text-[10px] font-black tracking-wider uppercase">SOS</span>
            </>
          )}
        </div>
      </button>

      {/* Tooltip hint when idle */}
      {state === 'idle' && (
        <div className="absolute top-0 right-full mr-3 translate-y-1/2 whitespace-nowrap hidden sm:block">
          <div className="bg-gray-900 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-lg relative flex items-center gap-1.5 animate-fade-in">
            Hold 3s to alert
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2" />
          </div>
        </div>
      )}
    </div>
  );
}
