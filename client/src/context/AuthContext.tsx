import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, isFirebaseInitialized } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

interface User {
  id: number;
  email: string;
  role: "client" | "service";
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log("Setting up Firebase auth state listener");
    let unsubscribeAuth: (() => void) | null = null;

    const initializeAuth = async () => {
      // Wait for Firebase to be initialized
      await isFirebaseInitialized;

      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          console.log("Firebase auth state changed:", firebaseUser?.email);
          if (firebaseUser) {
            // User is signed in with Firebase
            const idToken = await firebaseUser.getIdToken(true); // Force token refresh
            console.log("Got Firebase ID token, fetching user data from backend");

            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });

            if (response.ok) {
              const userData = await response.json();
              console.log("Got user data from backend:", userData);
              setUser(userData);
            } else {
              console.log("Backend didn't recognize the user, signing out");
              await firebaseSignOut(auth);
              setUser(null);
            }
          } else {
            console.log("User is signed out");
            setUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setUser(null);
        } finally {
          setLoading(false);
          setInitialized(true);
        }
      });
    };

    initializeAuth();

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Don't render anything until Firebase is initialized
  if (!initialized) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);