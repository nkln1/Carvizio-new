import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, isFirebaseInitialized, sendVerificationEmail } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';

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
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

// Create and export the context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  resendVerificationEmail: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        await isFirebaseInitialized;
        await setPersistence(auth, browserLocalPersistence);
        console.log("Firebase persistence set to LOCAL");

        unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              const idToken = await firebaseUser.getIdToken(true);

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
              } else {
                console.error("Failed to get user data from backend:", await response.text());
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

  return (
    <AuthContext.Provider value={{ user, loading, signOut, resendVerificationEmail }}>
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