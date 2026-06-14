import { useState, useEffect, useRef } from 'react';

// Default center: Vadodara Railway Station
const DEFAULT_COORDS = { lat: 22.3072, lng: 73.1812 };

export function useGeolocation() {
  const [location, setLocation] = useState(DEFAULT_COORDS);
  const [error, setError] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = useRef(null);
  const simulationCoordsRef = useRef([]);
  const simulationIndexRef = useRef(0);

  // Load user's actual location initially if allowed
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Only set if not currently in simulation mode
        if (!isSimulating) {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
      },
      (err) => {
        console.warn("Geolocation permission denied, defaulting to Vadodara:", err.message);
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, [isSimulating]);

  // Start route traversal simulation
  const startSimulation = (coordinates, speedMultiplier = 1) => {
    if (!coordinates || coordinates.length === 0) return;
    
    // Clear existing simulation
    stopSimulation();

    // Map [lng, lat] coordinate format from GeoJSON to {lat, lng}
    simulationCoordsRef.current = coordinates.map(([lng, lat]) => ({ lat, lng }));
    simulationIndexRef.current = 0;
    setIsSimulating(true);

    // Set first coordinate immediately
    setLocation(simulationCoordsRef.current[0]);

    // Tick every 7000ms to move to next coordinate point
    simulationIntervalRef.current = setInterval(() => {
      const nextIndex = simulationIndexRef.current + 1;
      if (nextIndex < simulationCoordsRef.current.length) {
        simulationIndexRef.current = nextIndex;
        setLocation(simulationCoordsRef.current[nextIndex]);
      } else {
        // Simulation finished, stop
        stopSimulation();
      }
    }, 7000 / speedMultiplier);
  };

  const stopSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  return {
    location,
    error,
    isSimulating,
    startSimulation,
    stopSimulation,
    currentStepIndex: simulationIndexRef.current,
    totalSteps: simulationCoordsRef.current.length
  };
}
