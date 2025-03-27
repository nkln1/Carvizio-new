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
    if (!isLoggedIn || !user || !user.id) return false;
    
    try {
      const firebaseMessaging = FirebaseMessaging.getInstance();
      const userRole = user.role === 'service' ? 'service' : 'client';
      
      const result = await firebaseMessaging.initialize(user.id, userRole);
      setIsEnabled(result);
      return result;
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