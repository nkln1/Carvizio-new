import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, isFirebaseInitialized, sendVerificationEmail } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import FirebaseMessaging from '@/lib/firebaseMessaging';
import { useLocation } from 'wouter';

// Lista de adrese email cu rol de admin
const ADMIN_EMAILS = ['nikelino6@yahoo.com'];

interface User {
  id: number;
  email: string;
  role: "client" | "service";
  name?: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

// Create and export the context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoggedIn: false,
  signOut: async () => {},
  resendVerificationEmail: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [, setLocation] = useLocation();

  // Token de autentificare pentru Service Worker
  const [currentIdToken, setCurrentIdToken] = useState<string | null>(null);

  // Funcția pentru obținerea tokenului ID și salvarea în localStorage pentru Service Worker
  const updateIdToken = async (firebaseUser: any) => {
    try {
      const idToken = await firebaseUser.getIdToken(true);
      setCurrentIdToken(idToken);
      
      // Salvăm tokenul în localStorage pentru a-l face disponibil Service Worker-ului
      localStorage.setItem('firebase_auth_token', idToken);
      
      // Data de expirare este de obicei 1 oră de la generare, dar o setăm la 50 minute pentru a fi siguri
      const expiresAt = Date.now() + 50 * 60 * 1000; // 50 de minute
      localStorage.setItem('firebase_auth_token_expires', expiresAt.toString());
      
      console.log("Token de autentificare actualizat și salvat pentru Service Worker");
      return idToken;
    } catch (error) {
      console.error("Eroare la obținerea tokenului ID:", error);
      return null;
    }
  };

  // Funcție pentru a reînnoi tokenul de autentificare periodic
  const setupTokenRefresh = (firebaseUser: any) => {
    // Reînnoim tokenul la fiecare 45 de minute pentru a preveni expirarea
    const refreshInterval = 45 * 60 * 1000; // 45 de minute
    
    const intervalId = setInterval(async () => {
      console.log("Reînnoirea programată a tokenului de autentificare...");
      await updateIdToken(firebaseUser);
    }, refreshInterval);
    
    // Returnăm funcția de curățare
    return () => {
      clearInterval(intervalId);
    };
  };

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let tokenRefreshCleanup: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        await isFirebaseInitialized;
        await setPersistence(auth, browserLocalPersistence);
        console.log("Firebase persistence set to LOCAL");

        unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              const idToken = await updateIdToken(firebaseUser);
              
              if (!idToken) {
                console.error("Nu s-a putut obține tokenul de autentificare");
                await firebaseSignOut(auth);
                setUser(null);
                return;
              }

              const response = await fetch('/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${idToken}`
                },
                credentials: 'include'
              });

              if (response.ok) {
                const userData = await response.json();
                setUser({
                  ...userData,
                  emailVerified: firebaseUser.emailVerified
                });
                
                // Verificăm dacă utilizatorul este admin
                const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase() || '');
                
                // Dacă este admin, îl redirecționăm către panoul de administrare
                // dar doar dacă suntem pe o rută care nu e deja cea de admin
                const currentPath = window.location.pathname;
                if (isAdmin && !currentPath.startsWith('/admin/dashboard')) {
                  console.log('Utilizator admin detectat, redirecționare către panoul de administrare');
                  setLocation('/admin/dashboard');
                }
                
                // Configurăm reînnoirea automată a tokenului
                if (tokenRefreshCleanup) {
                  tokenRefreshCleanup();
                }
                tokenRefreshCleanup = setupTokenRefresh(firebaseUser);
                
              } else {
                console.error("Failed to get user data from backend:", await response.text());
                await firebaseSignOut(auth);
                setUser(null);
              }
            } else {
              console.log("User is signed out");
              setUser(null);
              setCurrentIdToken(null);
              localStorage.removeItem('firebase_auth_token');
              localStorage.removeItem('firebase_auth_token_expires');
              
              // Curățăm intervalul de reînnoire a tokenului
              if (tokenRefreshCleanup) {
                tokenRefreshCleanup();
                tokenRefreshCleanup = null;
              }
            }
          } catch (error) {
            console.error('Auth state change error:', error);
            setUser(null);
          } finally {
            setLoading(false);
            setInitialized(true);
          }
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      if (tokenRefreshCleanup) {
        tokenRefreshCleanup();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const resendVerificationEmail = async () => {
    await sendVerificationEmail();
  };

  if (!initialized) {
    return null;
  }

  // Calculăm dacă utilizatorul este autentificat
  const isLoggedIn = !!user;

  // Valoarea contextului
  const contextValue = {
    user,
    loading,
    isLoggedIn,
    signOut,
    resendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};