import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { getScoreColorHex } from '../../utils/safetyScore';

// Default Center: Vadodara
const VADODARA_CENTER = [73.1812, 22.3072];

// Bounds for local coordinate scaling in fallback SVG mode
const MAP_BOUNDS = {
  minLng: 73.1400,
  maxLng: 73.2200,
  minLat: 22.2800,
  maxLat: 22.3400
};

// Seeded streets in Vadodara to draw in offline SVG simulator
const SIMULATED_STREETS = [
  {
    name: "R.C. Dutt Road",
    coords: [[73.1812, 22.3072], [73.1770, 22.3090], [73.1725, 22.3060], [73.1650, 22.3050]]
  },
  {
    name: "Alkapuri Commercial Road",
    coords: [[73.1770, 22.3090], [73.1740, 22.3095], [73.1689, 22.3144]]
  },
  {
    name: "Productivity Road",
    coords: [[73.1725, 22.3060], [73.1700, 22.3020], [73.1723, 22.2960], [73.1723, 22.2850]]
  },
  {
    name: "Sayajigunj Main Highway",
    coords: [[73.1812, 22.3072], [73.1850, 22.3060], [73.1932, 22.3144], [73.2001, 22.3250]]
  },
  {
    name: "Akota Garden Road",
    coords: [[73.1723, 22.2960], [73.1765, 22.2980], [73.1800, 22.2995], [73.1812, 22.3072]]
  },
  {
    name: "Sama Road Connector",
    coords: [[73.1850, 22.3060], [73.1900, 22.3090], [73.2001, 22.3089]]
  }
];

export default function MapView({ 
  userLocation, 
  incidents = [], 
  routes = [], 
  selectedRouteIndex = 0,
  activeTrip = null,
  onReportClick = null
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [activePopup, setActivePopup] = useState(null); // Offline popup state
  
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const isMockMap = !mapboxToken || mapboxToken.trim() === "";

  // 1. Mapbox GL JS Mode Initialization
  useEffect(() => {
    if (isMockMap || !mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    const mapInstance = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: VADODARA_CENTER,
      zoom: 13,
      pitch: 0
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapInstance.on('load', () => {
      setMap(mapInstance);
    });

    return () => {
      mapInstance.remove();
    };
  }, [isMockMap]);

  // 2. Mapbox Real-time markers updates
  const markersRef = useRef([]);
  useEffect(() => {
    if (isMockMap || !map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Draw user location pulsing dot
    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'location-pulse-dot';
      const userMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
      markersRef.current.push(userMarker);
    }

    // Draw incident markers
    incidents.forEach(inc => {
      const el = document.createElement('div');
      el.className = `w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110`;
      
      let color = 'bg-warnAmber';
      if (inc.type === 'harassment') color = 'bg-dangerRed';
      else if (inc.type === 'broken_light') color = 'bg-yellow-500';
      else if (inc.type === 'dark_street') color = 'bg-orange-500';
      
      el.className += ` ${color} border-2 border-white`;
      
      const icon = inc.type === 'harassment' ? '⚠️' : inc.type === 'dark_street' ? '🌑' : '💡';
      el.innerHTML = `<span class="text-xs font-bold text-white">${icon}</span>`;

      // Setup popup
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="text-sm">
            <div class="font-bold capitalize border-b border-darkBorder pb-1 text-red-400 flex items-center gap-1">
              ${icon} ${inc.type.replace('_', ' ')}
            </div>
            <div class="mt-1 text-gray-300 font-medium">${inc.description}</div>
            <div class="mt-2 text-xs text-gray-500 font-semibold">${inc.hours_ago ? `${Math.round(inc.hours_ago)} hours ago` : 'just reported'}</div>
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([inc.lng, inc.lat])
        .setPopup(popup)
        .addTo(map);
        
      markersRef.current.push(marker);
    });

  }, [map, incidents, userLocation, isMockMap]);

  // 3. Mapbox Draw Routes
  useEffect(() => {
    if (isMockMap || !map || routes.length === 0) return;

    // Clear route layers
    routes.forEach((r, idx) => {
      const layerId = `route-layer-${idx}`;
      const sourceId = `route-source-${idx}`;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    });

    // Draw each route
    routes.forEach((r, idx) => {
      const isSelected = idx === selectedRouteIndex;
      const color = getScoreColorHex(r.safetyScore);

      map.addSource(`route-source-${idx}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: r.geometry
        }
      });

      map.addLayer({
        id: `route-layer-${idx}`,
        type: 'line',
        source: `route-source-${idx}`,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': color,
          'line-width': isSelected ? 6 : 3,
          'line-opacity': isSelected ? 0.9 : 0.4
        }
      });
    });

    // Fit map bounds to selected route
    if (routes[selectedRouteIndex]) {
      const coords = routes[selectedRouteIndex].geometry.coordinates;
      const bounds = coords.reduce((acc, coord) => {
        return acc.extend(coord);
      }, new mapboxgl.LngLatBounds(coords[0], coords[0]));

      map.fitBounds(bounds, { padding: 50, duration: 1000 });
    }

  }, [map, routes, selectedRouteIndex, isMockMap]);


  // 4. Offline SVG coordinate scaling functions
  const projectCoords = (lng, lat, width, height) => {
    const lngSpan = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;
    const latSpan = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;

    // Map longitude to X
    const x = ((lng - MAP_BOUNDS.minLng) / lngSpan) * width;
    // Map latitude to Y (reversing because SVG Y goes downwards)
    const y = height - (((lat - MAP_BOUNDS.minLat) / latSpan) * height);

    return { x, y };
  };

  const getSvgPath = (coords, width, height) => {
    if (!coords || coords.length === 0) return '';
    return coords.map((c, i) => {
      const { x, y } = projectCoords(c[0], c[1], width, height);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  // Render Section
  return (
    <div className="relative w-full h-full bg-darkBg overflow-hidden">
      {isMockMap ? (
        // --- OFFLINE/SIMULATED GIS GRAPHIC ---
        <div className="w-full h-full relative flex items-center justify-center select-none bg-[#090D14] border border-darkBorder">
          
          {/* Cyber grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(45,55,72,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(45,55,72,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

          {/* SVG Map Canvas */}
          <svg className="w-full h-full min-h-[500px]" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            
            {/* Draw Simulated Streets */}
            {SIMULATED_STREETS.map((st, i) => (
              <g key={i}>
                <path
                  d={getSvgPath(st.coords, 800, 600)}
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={getSvgPath(st.coords, 800, 600)}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                  strokeDasharray="4 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            {/* Draw Routes */}
            {routes.map((r, idx) => {
              const isSelected = idx === selectedRouteIndex;
              const color = getScoreColorHex(r.safetyScore);
              return (
                <path
                  key={idx}
                  d={getSvgPath(r.geometry.coordinates, 800, 600)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? "6" : "3"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isSelected ? "0.95" : "0.35"}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* Draw Incident Pins */}
            {incidents.map((inc, i) => {
              const { x, y } = projectCoords(inc.lng, inc.lat, 800, 600);
              let color = '#F59E0B'; // warn
              if (inc.type === 'harassment') color = '#EF4444'; // red
              else if (inc.type === 'broken_light') color = '#EAB308'; // yellow
              else if (inc.type === 'dark_street') color = '#F97316'; // orange

              return (
                <g 
                  key={i} 
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePopup(inc);
                  }}
                >
                  <circle r="12" fill={color} stroke="#FFFFFF" strokeWidth="2" className="transition-transform hover:scale-125" />
                  <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                    {inc.type === 'harassment' ? '⚠️' : inc.type === 'dark_street' ? '🌑' : '💡'}
                  </text>
                </g>
              );
            })}

            {/* Pulsing User Location */}
            {userLocation && (() => {
              const { x, y } = projectCoords(userLocation.lng, userLocation.lat, 800, 600);
              return (
                <g transform={`translate(${x}, ${y})`}>
                  <circle r="14" fill="#3B82F6" opacity="0.3" className="animate-ping" />
                  <circle r="7" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                </g>
              );
            })()}
          </svg>

          {/* Interactive SVG Popups */}
          {activePopup && (() => {
            const { x, y } = projectCoords(activePopup.lng, activePopup.lat, 800, 600);
            return (
              <div 
                className="absolute z-40 bg-[#1A1F2E] border border-darkBorder p-3 rounded-lg shadow-2xl max-w-xs text-sm"
                style={{ 
                  top: `${(y / 600) * 100 - 20}%`, 
                  left: `${(x / 800) * 100 - 10}%` 
                }}
              >
                <div className="flex justify-between items-center border-b border-darkBorder pb-1 mb-1">
                  <span className="font-bold text-red-400 capitalize">
                    {activePopup.type.replace('_', ' ')}
                  </span>
                  <button 
                    onClick={() => setActivePopup(null)}
                    className="text-gray-400 hover:text-white font-bold px-1"
                  >
                    ×
                  </button>
                </div>
                <div className="text-gray-300 text-xs font-semibold">{activePopup.description}</div>
                <div className="text-[10px] text-gray-500 mt-2 font-bold">
                  {activePopup.hours_ago ? `${Math.round(activePopup.hours_ago)} hours ago` : 'just reported'}
                </div>
              </div>
            );
          })()}

          {/* Simulated Mode Banner Overlay */}
          <div className="absolute top-2 right-2 px-2 py-1 bg-amber-950/80 border border-amber-800 text-[10px] font-bold tracking-wider rounded text-amber-300 flex items-center gap-1 z-10">
            <span>📡 OFFLINE SIMULATED GIS</span>
          </div>
        </div>
      ) : (
        // --- MAPBOX REAL MAP VIEW ---
        <div ref={mapRef} className="w-full h-full min-h-[500px]" />
      )}
    </div>
  );
}
