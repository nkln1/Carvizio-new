
import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import websocketService from '@/lib/websocket';

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Function to check connection status
    const checkConnection = () => {
      websocketService.ensureConnection()
        .then(() => setIsConnected(true))
        .catch(() => setIsConnected(false));
    };
    
    // Check initially and set up interval
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    
    // Listen for connection events
    const onConnected = () => setIsConnected(true);
    const onDisconnected = () => setIsConnected(false);
    
    websocketService.on('connected', onConnected);
    websocketService.on('disconnected', onDisconnected);
    
    return () => {
      clearInterval(interval);
      websocketService.off('connected', onConnected);
      websocketService.off('disconnected', onDisconnected);
    };
  }, []);
  
  // Don't show anything if connected
  if (isConnected) return null;
  
  // Show warning when disconnected
  return (
    <div className="fixed bottom-4 right-4 bg-amber-50 p-2 px-4 rounded-md border border-amber-200 shadow-md flex items-center gap-2 z-50">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <span className="text-sm text-amber-800">Conexiune limitată</span>
    </div>
  );
}
