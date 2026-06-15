import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, MapPin, Check, Leaf, Video } from 'lucide-react';
import SafetyScoreBar from './SafetyScoreBar';
import { formatDistance, formatDuration } from '../../utils/formatters';

export default function RouteCard({ 
  route, 
  isSelected, 
  onSelect 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const breakdown = route.safetyBreakdown?.breakdown || {};
  const warnings = route.warnings || [];

  // Carbon footprint: use backend value or compute fallback
  const distKm = (route.distance || 0) / 1000;
  const carbon = route.carbonFootprint || {
    walking: 0,
    metro: Math.round(distKm * 40),
    cab: Math.round(distKm * 180)
  };

  // CCTV corridor flag: backend-driven or fallback from safety score
  const isCctvCorridor = route.cctvCorridor || (route.safetyScore || 0) >= 80;

  return (
    <div 
      className={`p-4 rounded-xl border transition-all duration-300 ${
        isSelected 
          ? 'bg-blue-50 border-googleBlue shadow-md' 
          : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-sm font-bold text-gray-900">{route.name}</span>
          {route.label && (
            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
              route.label === 'SAFEST' 
                ? 'bg-safeGreen/20 text-safeGreen border border-safeGreen/40' 
                : route.label === 'FASTEST'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}>
              {route.label}
            </span>
          )}
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-800 flex items-center gap-0.5 text-xs font-semibold py-1 px-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isExpanded ? 'Hide Details' : 'Details'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs font-medium text-gray-600 mb-4">
        <span className="flex items-center gap-1">
          <Clock size={13} className="text-gray-400" />
          {formatDuration(route.duration)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={13} className="text-gray-400" />
          {formatDistance(route.distance)}
        </span>
      </div>

      <div className="mb-4">
        <SafetyScoreBar score={route.safetyScore} />
      </div>

      {/* CCTV Monitored Corridor Badge */}
      {isCctvCorridor && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-300">
          <Video size={14} className="text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-emerald-700 tracking-wide">📹 CCTV Monitored Corridor</span>
        </div>
      )}

      {/* Carbon Footprint Comparison */}
      <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
        <div className="flex items-center gap-1.5 mb-2">
          <Leaf size={13} className="text-green-600" />
          <span className="text-[11px] font-bold text-green-700 tracking-wide">Carbon Footprint</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-100 rounded-md py-1.5 px-1">
            <div className="text-[10px] text-gray-600 font-medium mb-0.5">🚶 Walk</div>
            <div className="text-xs font-bold text-green-700">{carbon.walking}g</div>
          </div>
          <div className="bg-yellow-50 rounded-md py-1.5 px-1">
            <div className="text-[10px] text-gray-600 font-medium mb-0.5">🚇 Metro</div>
            <div className="text-xs font-bold text-yellow-700">{carbon.metro}g</div>
          </div>
          <div className="bg-red-50 rounded-md py-1.5 px-1">
            <div className="text-[10px] text-gray-600 font-medium mb-0.5">🚕 Cab</div>
            <div className="text-xs font-bold text-red-600">{carbon.cab}g</div>
          </div>
        </div>
      </div>
      {/* Warnings / Highlights */}
      {warnings.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 p-2.5 rounded-lg text-xs text-amber-800 flex items-start gap-1.5 font-medium">
          <AlertTriangle size={14} className="text-warnAmber shrink-0 mt-0.5" />
          <div>
            {warnings.map((warn, i) => (
              <div key={i}>{warn}</div>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Breakdown Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs">
          <h4 className="font-bold text-gray-700 mb-2">Safety Criteria Breakdown:</h4>
          
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-600">Street Lighting:</span>
            <span className="font-semibold text-gray-900">{breakdown.lighting?.score || 0}/100</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-600">Transit Proximity:</span>
            <span className="font-semibold text-gray-900">{breakdown.transitCoverage?.score || 0}/100</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-600">Incident Density:</span>
            <span className="font-semibold text-gray-900">{breakdown.incidentDensity?.score || 0}/100</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-600">Time of Day Factors:</span>
            <span className="font-semibold text-gray-900">{breakdown.timeOfDay?.score || 0}/100</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-600">Commuter Density:</span>
            <span className="font-semibold text-gray-900">{breakdown.crowdDensity?.score || 0}/100</span>
          </div>
        </div>
      )}

      {/* Select button */}
      <button
        onClick={onSelect}
        className={`w-full mt-3 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
          isSelected
            ? 'bg-googleBlue hover:bg-blue-600 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
        style={{ minHeight: '44px' }} // 44px tap target size minimum for mobile usability
      >
        {isSelected ? <Check size={14} /> : null}
        {isSelected ? 'Route Selected' : 'Select This Route'}
      </button>
    </div>
  );
}
