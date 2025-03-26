
import { useState, useEffect } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import websocketService from '@/lib/websocket';

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let disconnectedTime = 0;
    
    // Funcție pentru tratarea conexiunii stabilite
    const handleConnection = () => {
      setIsConnected(true);
      setShowBanner(false);
      disconnectedTime = 0;
    };
    
    // Funcție pentru tratarea deconectării
    const handleDisconnection = () => {
      setIsConnected(false);
      disconnectedTime = Date.now();
      
      // Arătăm banner-ul doar dacă deconectarea persistă mai mult de 10 secunde
      reconnectTimeout = setTimeout(() => {
        setShowBanner(true);
      }, 10000);
    };
    
    // Adăugăm handlerii corecți pentru evenimentele websocket
    const connectionHandler = websocketService.addConnectionHandler(handleConnection);
    const disconnectionHandler = websocketService.addDisconnectionHandler(handleDisconnection);
    
    // Verificăm starea inițială
    websocketService.isConnected().then(connected => {
      setIsConnected(connected);
    });
    
    // Curățăm event listeners la unmount
    return () => {
      connectionHandler();
      disconnectionHandler();
      clearTimeout(reconnectTimeout);
    };
  }, []);
  
  // Nu afișăm nimic dacă avem conexiune sau deconectarea este recentă
  if (isConnected || !showBanner) {
    return null;
  }
  
  // Afișăm banner-ul de avertizare pentru pierderea conexiunii
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 bg-amber-50 border-t border-amber-200 shadow-md">
      <div className="container mx-auto flex items-center gap-2 text-amber-800">
        <WifiOff className="h-5 w-5 flex-shrink-0" />
        <div className="text-sm">
          Conexiunea la server a fost pierdută. Reconnectare automată...
        </div>
      </div>
    </div>
  );
}
