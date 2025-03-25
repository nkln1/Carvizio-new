import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  setCookie, 
  getCookie, 
  removeCookie, 
  setLocalStorage, 
  getLocalStorage 
} from '@/lib/cookieUtils';

// This is an example component showcasing how to use the cookie utilities
export default function CookieExample() {
  const DEMO_COOKIE_NAME = 'demo-preference';
  const DEMO_STORAGE_KEY = 'user-theme-preference';
  
  const [cookieValue, setCookieValue] = useState<string | undefined>('');
  const [storageValue, setStorageValue] = useState<string | null>('');
  
  // Load initial values
  useEffect(() => {
    setCookieValue(getCookie(DEMO_COOKIE_NAME));
    setStorageValue(getLocalStorage(DEMO_STORAGE_KEY, 'default'));
  }, []);
  
  // Example 1: Setting and retrieving a basic preference cookie
  const savePreference = (preference: string) => {
    setCookie(DEMO_COOKIE_NAME, preference);
    setCookieValue(preference);
  };
  
  // Example 2: Using localStorage for theme preference
  const saveThemePreference = (theme: string) => {
    setLocalStorage(DEMO_STORAGE_KEY, theme);
    setStorageValue(theme);
  };
  
  // Clear example data
  const clearDemoData = () => {
    removeCookie(DEMO_COOKIE_NAME);
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setCookieValue(undefined);
    setStorageValue(null);
  };
  
  return (
    <Card className="p-6 max-w-md mx-auto my-8">
      <h3 className="text-xl font-medium mb-4">Exemplu utilizare cookie-uri esențiale</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-2">Exemplu cookie pentru preferințe</h4>
          <p className="text-sm mb-2">
            Valoare actuală: {cookieValue || '(nicio preferință salvată)'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => savePreference('opțiunea-1')}
            >
              Salvează Opțiunea 1
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => savePreference('opțiunea-2')}
            >
              Salvează Opțiunea 2
            </Button>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Exemplu localStorage pentru tema aplicației</h4>
          <p className="text-sm mb-2">
            Valoare actuală: {storageValue || '(nicio temă salvată)'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => saveThemePreference('light')}
            >
              Tema Deschisă
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => saveThemePreference('dark')}
            >
              Tema Întunecată
            </Button>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <Button 
            variant="destructive"
            size="sm"
            onClick={clearDemoData}
          >
            Șterge datele de exemplu
          </Button>
        </div>
      </div>
    </Card>
  );
}