import { useEffect, useCallback, useState } from 'react';
import websocketService from '@/lib/websocket';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    try {
      // Ensure we have access to environment variables
      if (!import.meta.env.VITE_REPL_URL) {
        throw new Error('VITE_REPL_URL not available');
      }

      // Wait for any HMR operations to complete
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
    let cleanup: (() => void) | undefined;

    // Only attempt connection if the document is fully loaded
    const attemptConnection = () => {
      if (!mounted) return;
      connect().catch(console.error);
    };

    if (document.readyState === 'complete') {
      attemptConnection();
    } else {
      const onLoad = () => attemptConnection();
      window.addEventListener('load', onLoad);
      cleanup = () => window.removeEventListener('load', onLoad);
    }

    return () => {
      mounted = false;
      if (cleanup) cleanup();
      websocketService.disconnect();
    };
  }, [connect]);

  return { isConnected, error };
}