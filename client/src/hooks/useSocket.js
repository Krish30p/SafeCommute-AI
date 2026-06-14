import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(baseUrl) {
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to same origin using the proxy configuration
    const socketUrl = baseUrl || window.location.origin;
    
    console.log(`🔌 Initializing socket connection to: ${socketUrl}`);
    
    // Connect to backend (supports Vite proxy routing)
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to SafeCommute WS Gateway');
    });

    socketRef.current.on('connect_error', (err) => {
      console.warn('⚠️ WS Connection Error, retrying...', err.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('🔌 Disconnected from SafeCommute WS Gateway');
      }
    };
  }, [baseUrl]);

  // Emit wrappers
  const emit = (event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`⚠️ Socket not connected, deferred emit: ${event}`);
    }
  };

  // Listener wrappers
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected: socketRef.current ? socketRef.current.connected : false
  };
}
