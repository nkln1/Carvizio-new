
import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import websocketService from '@/lib/websocket';

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);

  // Setăm un timer pentru a arăta butonul de reconectare doar după o perioadă
  // pentru a nu-l arăta în cazul reconectărilor rapide
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isConnected) {
      timer = setTimeout(() => {
        setShowReconnect(true);
      }, 15000); // Arătăm butonul după 15 secunde de deconectare
    } else {
      setShowReconnect(false);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isConnected]);

  // Adăugăm event listener pentru starea conexiunii
  useEffect(() => {
    // Adăugăm listener pentru statusul conexiunii
    const handleConnectionStatus = (connected: boolean) => {
      setIsConnected(connected);
    };

    websocketService.addConnectionStatusListener(handleConnectionStatus);

    // Verificăm starea inițială
    websocketService.isConnected().then(status => {
      setIsConnected(status);
    });

    // Curățăm event listener la unmount
    return () => {
      websocketService.removeConnectionStatusListener(handleConnectionStatus);
    };
  }, []);

  // Funcție pentru a forța reconectarea
  const handleReconnect = () => {
    websocketService.initialize();
    setShowReconnect(false); // Ascundem butonul imediat după apăsare
  };

  // Dacă suntem conectați, nu afișăm nimic
  if (isConnected) {
    return null;
  }

  // Afișăm indicator de deconectare și opțional buton de reconectare
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
      <WifiOff className="h-5 w-5 text-red-500" />
      <span className="text-sm">Deconectat</span>

      {showReconnect && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleReconnect}
          className="ml-2 text-xs h-7 px-2"
        >
          Reconectare
        </Button>
      )}
    </div>
  );
}
