import { useEffect, useRef, useState, useMemo } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook for Socket.io connection.
 * Returns a stable wrapper object (or null before connection) with emit/on/off methods.
 * Consumers can safely call wrapper.on(), wrapper.emit() etc.
 */
export function useSocket(baseUrl) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socketUrl = baseUrl || window.location.origin;
    console.log(`🔌 Initializing socket connection to: ${socketUrl}`);
    const socketInstance = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true
    });
    
    socketRef.current = socketInstance;
    setSocket(socketInstance);

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

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);

    // Sync state if already connected
    if (socketInstance.connected) {
      setConnected(true);
    }

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.disconnect();
      socketRef.current = null;
      setConnected(false);
      console.log('🔌 Disconnected from SafeCommute WS Gateway');
    };
  }, [baseUrl]);

  const client = useMemo(() => {
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
  }, [socket, connected]);

  return client;
}
