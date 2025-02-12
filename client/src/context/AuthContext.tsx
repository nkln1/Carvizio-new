import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up Firebase auth state listener");
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        console.log("Firebase auth state changed:", firebaseUser?.email);
        if (firebaseUser) {
          // User is signed in with Firebase
          // Get the ID token to verify with our backend
          const idToken = await firebaseUser.getIdToken();
          console.log("Got Firebase ID token, fetching user data from backend");

          // Fetch our user data from the backend
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
            // If our backend doesn't recognize the user, sign them out of Firebase
            await firebaseSignOut(auth);
            setUser(null);
          }
        } else {
          // User is signed out of Firebase
          console.log("User is signed out");
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);