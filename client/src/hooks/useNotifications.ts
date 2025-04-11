
import { useState, useEffect } from 'react';

interface NotificationOptions {
  body?: string;
  icon?: string;
  requireInteraction?: boolean;
  tag?: string;
  data?: any;
}

export default function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verifică dacă notificările sunt suportate
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    } else {
      setSupported(false);
      setError('Browserul dvs. nu suportă notificările push');
    }
  }, []);

  const requestPermission = async () => {
    if (!supported) {
      setError('Browserul dvs. nu suportă notificările push');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      setError('Eroare la solicitarea permisiunii: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (!supported) {
      setError('Browserul dvs. nu suportă notificările push');
      return false;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        setError('Permisiunile pentru notificări nu au fost acordate');
        return false;
      }
    }

    try {
      // Verifică dacă este disponibil Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Folosește Service Worker pentru a afișa notificarea
        if (typeof window.showNotificationViaSW === 'function') {
          await window.showNotificationViaSW(title, options);
          return true;
        }
      }

      // Fallback la notificații standard
      new Notification(title, options);
      return true;
    } catch (err) {
      setError('Eroare la afișarea notificării: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  return {
    permission,
    supported,
    error,
    requestPermission,
    showNotification
  };
}

// Adaugă tipurile pentru window global
declare global {
  interface Window {
    showNotificationViaSW?: (title: string, options?: NotificationOptions) => Promise<any>;
    startBackgroundMessageCheck?: (userId: number, userRole: 'client' | 'service', token: string) => Promise<any>;
    stopBackgroundMessageCheck?: () => Promise<any>;
  }
}
