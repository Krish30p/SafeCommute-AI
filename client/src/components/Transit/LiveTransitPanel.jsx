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

    // Auto refresh every 30 seconds
    const refreshInterval = setInterval(fetchTransit, 30000);

    return () => clearInterval(refreshInterval);
  }, [location]);

  // Filter based on tab
  const filteredData = transitData.filter(item => item.type === activeTab);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col space-y-3 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
          <Milestone size={14} className="text-safeGreen" /> Nearby Live Transit
        </h3>
        <button 
          onClick={fetchTransit} 
          disabled={loading}
          className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-[10px] font-bold"
        >
          <RefreshCw size={11} className={`${loading ? 'animate-spin' : ''}`} />
          {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </button>
      </div>

      {/* Tabs selectors */}
      <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
        {['bus', 'metro', 'train'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${
              activeTab === tab 
                ? 'bg-white border border-gray-200 text-googleBlue font-black shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
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
              className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg flex justify-between items-center text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {item.type === 'bus' ? '🚌' : item.type === 'metro' ? '🚇' : '🚆'}
                </span>
                <div>
                  <div className="font-bold text-gray-800">{item.name}</div>
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
