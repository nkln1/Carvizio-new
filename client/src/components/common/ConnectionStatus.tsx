
import { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import websocketService from '@/lib/websocket';

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let disconnectedTime = 0;
    
    const onConnected = () => {
      setIsConnected(true);
      setShowBanner(false);
      disconnectedTime = 0;
    };
    
    const onDisconnected = () => {
      setIsConnected(false);
      disconnectedTime = Date.now();
      
      // Arătăm banner-ul doar dacă deconectarea persistă mai mult de 10 secunde
      reconnectTimeout = setTimeout(() => {
        setShowBanner(true);
      }, 10000);
    };
    
    websocketService.on('connected', onConnected);
    websocketService.on('disconnected', onDisconnected);
    
    // Verificăm starea inițială
    websocketService.isConnectionActive()
      .then(() => setIsConnected(true))
      .catch(() => onDisconnected());
    
    return () => {
      clearTimeout(reconnectTimeout);
      websocketService.off('connected', onConnected);
      websocketService.off('disconnected', onDisconnected);
    };
  }, []);
  
  // Nu arătăm nimic dacă totul e în regulă sau dacă deconectarea e de scurtă durată
  if (isConnected || !showBanner) return null;
  
  // Arătăm un banner discret când conexiunea e întreruptă
  return (
    <div className="fixed bottom-4 right-4 bg-amber-50 p-2 px-4 rounded-md border border-amber-200 shadow-md flex items-center gap-2 z-50 max-w-[300px] animate-fade-in">
      <WifiOff className="h-4 w-4 text-amber-500" />
      <span className="text-sm text-amber-800">Conexiune limitată. Încercăm să reconectăm...</span>
    </div>
  );
}
