import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const checkAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/check-session', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
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
      } catch (error) {
        console.error('Eroare la verificarea sesiunii admin:', error);
        setAdminData(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminSession();
  }, []);

  // Funcție pentru logout
  const logout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      // Resetăm starea în context
      setAdminData(null);
      setIsAdmin(false);
      
      // Curățăm localStorage
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminUsername');
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