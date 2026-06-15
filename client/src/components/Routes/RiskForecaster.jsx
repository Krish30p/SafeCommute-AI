import React, { useState } from 'react';
import axios from 'axios';
import { Clock, TrendingUp, TrendingDown, ShieldAlert, Sparkles } from 'lucide-react';

export default function RiskForecaster({ originCoords, destinationCoords }) {
  const [timeStr, setTimeStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState('');

  const handleForecast = async () => {
    if (!timeStr) {
      setError("Please select a departure time");
      return;
    }
    
    // Construct a Date object for today with the selected time
    const now = new Date();
    const [hours, minutes] = timeStr.split(':');
    now.setHours(parseInt(hours, 10));
    now.setMinutes(parseInt(minutes, 10));
    now.setSeconds(0);
    
    // If the time is in the past, assume tomorrow
    if (now < new Date()) {
      now.setDate(now.getDate() + 1);
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/forecast', {
        originCoords: originCoords || [0,0],
        destinationCoords: destinationCoords || [0,0],
        departureTime: now.toISOString()
      });
      setForecast(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to generate forecast.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4 text-gray-900 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-purple-400" />
        <h3 className="font-semibold text-sm">AI Temporal Risk Forecast</h3>
      </div>
      
      <p className="text-xs text-gray-400 mb-4">
        Plan your departure. Our ML model predicts the dynamic risk index based on historical incidents, weather, and live events.
      </p>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="time" 
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-3 text-sm focus:outline-none focus:border-googleBlue transition-colors"
          />
        </div>
        <button 
          onClick={handleForecast}
          disabled={loading}
          className="bg-googleBlue hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Forecast'}
        </button>
      </div>

      {error && <p className="text-dangerRed text-xs mb-2">{error}</p>}

      {forecast && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mt-2">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs text-gray-400">Predicted Risk Index</div>
            <div className={`font-bold ${forecast.predicted_risk > 70 ? 'text-dangerRed' : forecast.predicted_risk > 40 ? 'text-warnAmber' : 'text-safeGreen'}`}>
              {forecast.predicted_risk.toFixed(1)} / 100
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-3 text-xs">
            <span className="text-gray-500">vs 30 mins earlier</span>
            <div className="flex items-center gap-1">
              {forecast.predicted_risk > forecast.comparison.predicted_risk ? (
                <span className="text-dangerRed flex items-center gap-1"><TrendingUp size={12} /> +{(forecast.predicted_risk - forecast.comparison.predicted_risk).toFixed(1)}</span>
              ) : forecast.predicted_risk < forecast.comparison.predicted_risk ? (
                <span className="text-safeGreen flex items-center gap-1"><TrendingDown size={12} /> {(forecast.predicted_risk - forecast.comparison.predicted_risk).toFixed(1)}</span>
              ) : (
                <span className="text-gray-400">No change</span>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2 flex gap-2 items-start mt-2">
            <ShieldAlert size={14} className="text-googleBlue mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-900 leading-relaxed">
              {forecast.advice}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
