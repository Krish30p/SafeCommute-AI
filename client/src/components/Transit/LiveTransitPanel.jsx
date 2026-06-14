import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bus, Train, Milestone, RefreshCw } from 'lucide-react';

export default function LiveTransitPanel({ location }) {
  const [activeTab, setActiveTab] = useState('bus'); // 'bus' | 'metro' | 'train'
  const [transitData, setTransitData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchTransit = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const response = await axios.get('/api/transit/nearby', {
        params: {
          lat: location.lat,
          lng: location.lng
        }
      });
      setTransitData(response.data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load transit data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransit();

    // Auto refresh every 30 seconds as requested
    const interval = setInterval(fetchTransit, 30); // Wait, the instructions say "Use setInterval on the frontend every 30 seconds to refresh."
    // 30 seconds is 30 * 1000 = 30000ms! The code should be 30000ms.
    // Yes! Let's make sure it is 30000ms.
    const refreshInterval = setInterval(fetchTransit, 30000);

    return () => clearInterval(refreshInterval);
  }, [location]);

  // Filter based on tab
  const filteredData = transitData.filter(item => item.type === activeTab);

  return (
    <div className="glass-panel p-4 rounded-xl border border-darkBorder flex flex-col space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Milestone size={14} className="text-safeGreen" /> Nearby Live Transit
        </h3>
        <button 
          onClick={fetchTransit} 
          disabled={loading}
          className="text-gray-400 hover:text-white flex items-center gap-1 text-[10px] font-bold"
        >
          <RefreshCw size={11} className={`${loading ? 'animate-spin' : ''}`} />
          {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </button>
      </div>

      {/* Tabs selectors */}
      <div className="flex bg-darkBg/60 p-0.5 rounded-lg border border-darkBorder">
        {['bus', 'metro', 'train'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${
              activeTab === tab 
                ? 'bg-darkCard border border-darkBorder text-safeGreen font-black' 
                : 'text-gray-400 hover:text-white'
            }`}
            style={{ minHeight: '36px' }}
          >
            {tab === 'bus' ? '🚌 Buses' : tab === 'metro' ? '🚇 Metro' : '🚆 Trains'}
          </button>
        ))}
      </div>

      {/* Schedule Items List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {loading && transitData.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 font-semibold">Loading transit feeds...</div>
        ) : filteredData.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 font-semibold">No active routes nearby.</div>
        ) : (
          filteredData.map((item) => (
            <div 
              key={item.id} 
              className="bg-darkBg/40 border border-darkBorder/40 p-2.5 rounded-lg flex justify-between items-center text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {item.type === 'bus' ? '🚌' : item.type === 'metro' ? '🚇' : '🚆'}
                </span>
                <div>
                  <div className="font-bold text-gray-200">{item.name}</div>
                  <div className="text-[10px] text-gray-500 font-bold">🚶 {item.distance}m away</div>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-safeGreen/10 border border-safeGreen/20 text-safeGreen font-black rounded text-[10px]">
                  {item.info}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
