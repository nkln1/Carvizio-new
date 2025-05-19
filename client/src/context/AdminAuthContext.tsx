import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';

const ADMIN_EMAILS = ['nikelino6@yahoo.com']; // Lista de adrese email cu rol de admin

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  adminUser: User | null;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAdmin: false,
  isLoading: true,
  adminUser: null
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
        setAdminUser(user);
        setIsAdmin(true);
      } else {
        setAdminUser(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AdminAuthContext.Provider value={{ isAdmin, isLoading, adminUser }}>
      {children}
    </AdminAuthContext.Provider>
  );
};