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
    if (isSimulating) return;

    if (!navigator.geolocation) {
      setError("Geolocation not supported by browser");
      // IP-based fallback
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(data => {
          if (data.latitude && data.longitude) {
            setLocation({ lat: data.latitude, lng: data.longitude });
          }
        })
        .catch(() => {});
      return;
    }

    // Use watchPosition for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setError(null);
      },
      (err) => {
        console.warn("Geolocation error, trying IP fallback:", err.message);
        setError(err.message);
        // IP-based fallback when browser geolocation fails
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(data => {
            if (data.latitude && data.longitude) {
              setLocation({ lat: data.latitude, lng: data.longitude });
              setError(null);
            }
          })
          .catch(() => {});
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
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

  const refreshLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setError("Geolocation not supported by browser");
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isSimulating) {
            const newLoc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setLocation(newLoc);
            setError(null);
            resolve(newLoc);
          } else {
            resolve(location);
          }
        },
        (err) => {
          console.warn("Geolocation permission denied or failed:", err.message);
          setError(err.message);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  return {
    location,
    error,
    isSimulating,
    startSimulation,
    stopSimulation,
    refreshLocation,
    currentStepIndex: simulationIndexRef.current,
    totalSteps: simulationCoordsRef.current.length
  };
}
