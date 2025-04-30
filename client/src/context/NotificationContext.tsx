import React, { createContext, useContext, useEffect, useState } from 'react';
import FirebaseMessaging from '@/lib/firebaseMessaging';
import { useAuth } from '@/context/AuthContext';

// Tipul datelor din context
interface NotificationContextType {
  isEnabled: boolean;
  unreadCount: number;
  enableNotifications: () => Promise<boolean>;
  markAsRead: (messageIds: number[]) => Promise<void>;
  countUnreadMessages: () => Promise<void>;
}

// Valoarea implicită a contextului
const defaultContext: NotificationContextType = {
  isEnabled: false,
  unreadCount: 0,
  enableNotifications: async () => false,
  markAsRead: async () => {},
  countUnreadMessages: async () => {},
};

// Crearea contextului
const NotificationContext = createContext<NotificationContextType>(defaultContext);

// Hook pentru utilizarea contextului
export const useNotifications = () => useContext(NotificationContext);

// Provider-ul contextului
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);


  // Efect pentru inițializarea notificărilor
  useEffect(() => {
    const initializeNotifications = async () => {
      if (isLoggedIn && user && user.id && !isInitialized) {
        const firebaseMessaging = FirebaseMessaging.getInstance();

        // Determinăm rolul utilizatorului
        const userRole = user.role === 'service' ? 'service' : 'client';

        // Inițializăm Firebase Messaging
        const result = await firebaseMessaging.initialize(user.id, userRole);
        setIsEnabled(result);
        setIsInitialized(true);

        // Actualizăm numărul de mesaje necitite
        await countUnreadMessages();
      }
    };

    initializeNotifications();

    // Curățăm resursele la deconectare
    return () => {
      if (isInitialized) {
        FirebaseMessaging.getInstance().cleanup();
        setIsInitialized(false);
      }
    };
  }, [isLoggedIn, user, isInitialized]);

  // Funcție pentru activarea notificărilor
  const enableNotifications = async (): Promise<boolean> => {
    try {
      console.log('Activare notificări...');

      // Verificăm dacă avem deja permisiuni
      if (Notification.permission === 'granted') {
        console.log('Permisiuni notificări deja acordate');
        setPermission('granted');
      } else {
        // Solicităm permisiunile
        console.log('Solicităm permisiuni notificări...');
        const permission = await Notification.requestPermission();
        setPermission(permission);

        if (permission !== 'granted') {
          console.warn('Permisiuni notificări refuzate');
          return false;
        }
        console.log('Permisiuni notificări acordate');
      }

      // Inițializăm sistemul de notificări
      if (user && user.id) {
        const role = user.role as 'client' | 'service';
        console.log(`Inițializare Firebase Messaging pentru ${role} (ID: ${user.id})...`);

        const messaging = FirebaseMessaging.getInstance();
        const result = await messaging.initialize(user.id, role);

        console.log(`Rezultat inițializare Firebase Messaging: ${result ? 'Succes' : 'Eșec'}`);
        setIsEnabled(result);

        // Testăm funcționalitatea notificărilor cu o notificare silențioasă
        if (result) {
          console.log('Testăm notificările...');
          setTimeout(() => {
            try {
              if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification('Notificările sunt active', {
                    body: `Acum poți primi notificări pentru contul tău de ${role === 'client' ? 'client' : 'service'}`,
                    icon: '/favicon.ico',
                    silent: true, // Fără sunet
                    tag: 'test-notification'
                  }).catch(err => console.warn('Eroare la afișarea notificării de test:', err));
                });
              }
            } catch (error) {
              console.warn('Eroare la testarea notificărilor:', error);
            }
          }, 1000);
        }

        return result;
      }

      console.warn('Nu s-au putut activa notificările: utilizator neidentificat');
      return false;
    } catch (error) {
      console.error('Eroare la activarea notificărilor:', error);
      return false;
    }
  };

  // Funcție pentru marcarea mesajelor ca citite
  const markAsRead = async (messageIds: number[]): Promise<void> => {
    if (!messageIds.length) return;

    try {
      const response = await fetch('/api/messages/mark-as-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageIds }),
      });

      if (response.ok) {
        // Actualizăm numărul de mesaje necitite
        await countUnreadMessages();
      }
    } catch (error) {
      console.error('Eroare la marcarea mesajelor ca citite:', error);
    }
  };

  // Funcție pentru numărarea mesajelor necitite
  const countUnreadMessages = async (): Promise<void> => {
    if (!isLoggedIn || !user || !user.id) return;

    try {
      const response = await fetch('/api/messages/unread-count');

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Eroare la obținerea numărului de mesaje necitite:', error);
    }
  };

  // Expunem funcționalitățile și starea contexului
  const contextValue: NotificationContextType = {
    isEnabled,
    unreadCount,
    enableNotifications,
    markAsRead,
    countUnreadMessages,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;