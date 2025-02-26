import { useEffect, useCallback, useState } from 'react';
import websocketService from '@/lib/websocket';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    try {
      await websocketService.ensureConnection();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeWebSocket = async () => {
      // Wait for the DOM to be fully loaded
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => {
          if (mounted) {
            connect();
          }
        });
      } else {
        await connect();
      }
    };

    initializeWebSocket();

    return () => {
      mounted = false;
      websocketService.disconnect();
    };
  }, [connect]);

  return { isConnected, error };
}
