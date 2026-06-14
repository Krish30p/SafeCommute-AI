import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, MapPin, Check } from 'lucide-react';
import SafetyScoreBar from './SafetyScoreBar';
import { formatDistance, formatDuration } from '../../utils/formatters';

export default function RouteCard({ 
  route, 
  isSelected, 
  onSelect, 
  index 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const breakdown = route.safetyBreakdown?.breakdown || {};
  const warnings = route.warnings || [];

  return (
    <div 
      className={`p-4 rounded-xl border transition-all duration-300 ${
        isSelected 
          ? 'bg-[#1e2738]/90 border-safeGreen shadow-[0_0_15px_rgba(29,158,117,0.15)]' 
          : 'bg-darkCard/90 border-darkBorder hover:border-gray-600'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-sm font-bold text-gray-300">{route.name}</span>
          {route.label && (
            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
              route.label === 'SAFEST' 
                ? 'bg-safeGreen/20 text-safeGreen border border-safeGreen/40' 
                : route.label === 'FASTEST'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              {route.label}
            </span>
          )}
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white flex items-center gap-0.5 text-xs font-semibold py-1 px-2 hover:bg-darkBorder rounded-lg transition-colors"
        >
          {isExpanded ? 'Hide Details' : 'Details'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs font-medium text-gray-400 mb-4">
        <span className="flex items-center gap-1">
          <Clock size={13} className="text-gray-500" />
          {formatDuration(route.duration)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={13} className="text-gray-500" />
          {formatDistance(route.distance)}
        </span>
      </div>

      <div className="mb-4">
        <SafetyScoreBar score={route.safetyScore} />
      </div>

      {/* Warnings / Highlights */}
      {warnings.length > 0 && (
        <div className="mb-4 bg-amber-950/20 border border-warnAmber/20 p-2.5 rounded-lg text-xs text-amber-300 flex items-start gap-1.5 font-medium">
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
        <div className="mt-3 pt-3 border-t border-darkBorder/60 space-y-2 text-xs">
          <h4 className="font-bold text-gray-400 mb-2">Safety Criteria Breakdown:</h4>
          
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-400">Street Lighting:</span>
            <span className="font-semibold text-gray-200">{breakdown.lighting?.score || 0}/100</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-400">Transit Proximity:</span>
            <span className="font-semibold text-gray-200">{breakdown.transitCoverage?.score || 0}/100</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-400">Incident Density:</span>
            <span className="font-semibold text-gray-200">{breakdown.incidentDensity?.score || 0}/100</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-400">Time of Day Factors:</span>
            <span className="font-semibold text-gray-200">{breakdown.timeOfDay?.score || 0}/100</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-400">Commuter Density:</span>
            <span className="font-semibold text-gray-200">{breakdown.crowdDensity?.score || 0}/100</span>
          </div>
        </div>
      )}

      {/* Select button */}
      <button
        onClick={onSelect}
        className={`w-full mt-3 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
          isSelected
            ? 'bg-safeGreen hover:bg-safeGreen/90 text-white'
            : 'bg-darkBorder hover:bg-gray-700 text-gray-200'
        }`}
        style={{ minHeight: '44px' }} // 44px tap target size minimum for mobile usability
      >
        {isSelected ? <Check size={14} /> : null}
        {isSelected ? 'Route Selected' : 'Select This Route'}
      </button>
    </div>
  );
}
