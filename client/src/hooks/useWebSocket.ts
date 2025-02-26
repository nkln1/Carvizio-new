import { useEffect, useCallback, useState } from 'react';
import websocketService from '@/lib/websocket';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    try {
      // Ensure window.location is available
      if (!window.location.host) {
        throw new Error('Host not available');
      }

      // Wait for a bit to ensure everything is initialized
      await new Promise(resolve => setTimeout(resolve, 2000));

      await websocketService.ensureConnection();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setError(err as Error);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const initializeWebSocket = async () => {
      if (!mounted) return;

      try {
        await connect();
      } catch (error) {
        // Retry after 3 seconds if the host is not available
        retryTimeout = setTimeout(initializeWebSocket, 3000);
      }
    };

    // Only initialize after document is fully loaded
    if (document.readyState === 'complete') {
      initializeWebSocket();
    } else {
      window.addEventListener('load', initializeWebSocket);
    }

    return () => {
      mounted = false;
      clearTimeout(retryTimeout);
      window.removeEventListener('load', initializeWebSocket);
      websocketService.disconnect();
    };
  }, [connect]);

  return { isConnected, error };
}