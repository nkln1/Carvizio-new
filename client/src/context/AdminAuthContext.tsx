import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchWithCsrf } from '@/lib/csrfToken';

// Tipul pentru admin
interface Admin {
  id: number;
  username: string;
}

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  adminData: Admin | null;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAdmin: false,
  isLoading: true,
  adminData: null,
  logout: async () => {}
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminData, setAdminData] = useState<Admin | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verifică sesiunea admin la încărcarea paginii
  useEffect(() => {
    let isMounted = true;
    const checkAdminSession = async () => {
      try {
        // Asigurăm-ne că avem un token CSRF valid înainte de a face cererea
        await refreshCsrfToken();
        
        // Folosim fetchWithCsrf pentru a gestiona automat token-ul CSRF
        // Adăugăm un timestamp pentru a preveni cache-ul
        const response = await fetchWithCsrf(`/api/admin/check-session?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.authenticated && data.admin) {
            setAdminData({
              id: data.admin.id,
              username: data.admin.username
            });
            setIsAdmin(true);
            
            // Salvăm și în localStorage ca backup
            localStorage.setItem('adminId', data.admin.id.toString());
            localStorage.setItem('adminUsername', data.admin.username);
          } else {
            setAdminData(null);
            setIsAdmin(false);
            
            // Curățăm localStorage
            localStorage.removeItem('adminId');
            localStorage.removeItem('adminUsername');
          }
        } else {
          // Dacă răspunsul nu este ok, presupunem că nu avem sesiune validă
          setAdminData(null);
          setIsAdmin(false);
          localStorage.removeItem('adminId');
          localStorage.removeItem('adminUsername');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Eroare la verificarea sesiunii admin:', error);
        setAdminData(null);
        setIsAdmin(false);
        localStorage.removeItem('adminId');
        localStorage.removeItem('adminUsername');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    checkAdminSession();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Funcție pentru logout
  const logout = async () => {
    try {
      // Mai întâi resetăm starea în context - pentru experiență utilizator mai rapidă
      setAdminData(null);
      setIsAdmin(false);
      
      // Curățăm localStorage
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminUsername');

      // Adăugăm un delay scurt pentru a permite actualizarea UI înainte de deconectare
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Folosim fetchWithCsrf pentru a include automat token-ul CSRF în cerere
      const response = await fetchWithCsrf('/api/admin/logout', {
        method: 'POST',
        credentials: 'include' // Important pentru cookie-uri
      });
      
      if (!response.ok) {
        console.error('Răspuns neașteptat la deconectare:', await response.text());
      }
      
      // Forțăm un refresh al token-ului CSRF după deconectare
      try {
        await fetch('/api/csrf-token', { 
          method: 'GET',
          credentials: 'include'
        });
      } catch (csrfError) {
        console.error('Eroare la reîmprospătarea token-ului CSRF:', csrfError);
      }
    } catch (error) {
      console.error('Eroare la deconectare:', error);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, isLoading, adminData, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};