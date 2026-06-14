import React from 'react';
import RouteCard from './RouteCard';
import RiskNote from '../Safety/RiskNote';
import { Shield } from 'lucide-react';

export default function RouteComparison({ 
  routes = [], 
  selectedRouteIndex = 0, 
  onSelectRoute,
  womenSafetyMode = false,
  bannerMessage = "",
  timeDeltaMessage = ""
}) {
  if (routes.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 font-semibold bg-darkCard rounded-xl border border-darkBorder">
        No routes loaded. Enter origin and destination to calculate routes.
      </div>
    );
  }

  const selectedRoute = routes[selectedRouteIndex];

  return (
    <div className="space-y-4">
      {/* Women Safety Mode Banners */}
      {womenSafetyMode && (
        <div className="space-y-2">
          <div className="bg-safeGreen/15 border border-safeGreen/30 p-3 rounded-xl flex items-center gap-3 text-safeGreen text-xs font-semibold animate-pulse shadow-[0_0_15px_rgba(29,158,117,0.1)]">
            <Shield size={16} className="shrink-0" />
            <div>
              <p className="font-bold">🛡️ Women Safety Mode Active</p>
              <p className="text-[11px] text-gray-300 font-medium">
                {bannerMessage || "Routes re-ranked for maximum lighting, busy streets, and transit corridors."}
              </p>
            </div>
          </div>
          {timeDeltaMessage && (
            <div className="px-3 py-1.5 bg-blue-950/20 border border-blue-900/30 text-blue-400 text-[11px] font-bold rounded-lg tracking-wide">
              ℹ️ {timeDeltaMessage}
            </div>
          )}
        </div>
      )}

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {routes.map((route, index) => (
          <RouteCard
            key={route.name || index}
            route={route}
            isSelected={index === selectedRouteIndex}
            onSelect={() => onSelectRoute(index)}
            index={index}
          />
        ))}
      </div>

      {/* AI Risk Advisory Section */}
      {selectedRoute && (
        <div className="pt-2">
          <RiskNote 
            advisory={selectedRoute.aiAdvisory} 
            score={selectedRoute.safetyScore} 
          />
        </div>
      )}
    </div>
  );
}
