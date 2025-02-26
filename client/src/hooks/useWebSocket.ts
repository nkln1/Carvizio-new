import { useEffect, useCallback, useState } from 'react';
import websocketService from '@/lib/websocket';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    try {
      // Wait for document to be fully loaded
      if (document.readyState !== 'complete') {
        return;
      }

      // Add additional delay to ensure HMR is ready
      await new Promise(resolve => setTimeout(resolve, 2000));

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

    const initWebSocket = async () => {
      if (document.readyState === 'complete') {
        if (mounted) await connect();
      } else {
        const onLoad = async () => {
          if (mounted) await connect();
        };
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
      }
    };

    initWebSocket();

    return () => {
      mounted = false;
      websocketService.disconnect();
    };
  }, [connect]);

  return { isConnected, error };
}