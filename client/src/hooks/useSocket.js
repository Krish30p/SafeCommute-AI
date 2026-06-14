import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook for Socket.io connection.
 * Returns a stable wrapper object (or null before connection) with emit/on/off methods.
 * Consumers can safely call wrapper.on(), wrapper.emit() etc.
 */
export function useSocket(baseUrl) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Initialize socket instance immediately on first render
  if (!socketRef.current) {
    const socketUrl = baseUrl || window.location.origin;
    console.log(`🔌 Initializing socket connection to: ${socketUrl}`);
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true
    });
  }

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleConnect = () => {
      console.log('✅ Connected to SafeCommute WS Gateway');
      setConnected(true);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleConnectError = (err) => {
      console.warn('⚠️ WS Connection Error, retrying...', err.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // Sync state if already connected
    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      console.log('🔌 Disconnected from SafeCommute WS Gateway');
    };
  }, []);

  return {
    emit: (event, data) => {
      if (socketRef.current) {
        socketRef.current.emit(event, data);
      } else {
        console.warn(`⚠️ Socket not initialized, failed emit: ${event}`);
      }
    },
    on: (event, callback) => {
      if (socketRef.current) {
        socketRef.current.on(event, callback);
      }
    },
    off: (event, callback) => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    },
    connected
  };
}
