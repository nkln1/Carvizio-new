import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  getCookie, 
  setCookie, 
  removeCookie,
  hasConsentedToCookies
} from '@/lib/cookieUtils';

/**
 * Example component demonstrating proper cookie usage with GDPR compliance
 */
export default function CookieExample() {
  const [userPreference, setUserPreference] = useState<string | undefined>(undefined);
  const [consentStatus, setConsentStatus] = useState<boolean>(false);
  
  // Example preference cookie name
  const PREFERENCE_COOKIE = 'user-color-mode';
  
  useEffect(() => {
    // Check if user has consented to cookies
    const hasConsent = hasConsentedToCookies();
    setConsentStatus(hasConsent);
    
    // Only get the preference cookie if user has consented
    if (hasConsent) {
      const savedPreference = getCookie(PREFERENCE_COOKIE);
      setUserPreference(savedPreference);
    }
  }, []);
  
  const setDarkMode = () => {
    // Only set cookies if user has consented
    if (consentStatus) {
      setCookie(PREFERENCE_COOKIE, 'dark');
      setUserPreference('dark');
    } else {
      alert('Nu putem salva preferințele dvs. fără consimțământul pentru cookie-uri. Vă rugăm să acceptați cookie-urile esențiale în banner.');
    }
  };
  
  const setLightMode = () => {
    // Only set cookies if user has consented
    if (consentStatus) {
      setCookie(PREFERENCE_COOKIE, 'light');
      setUserPreference('light');
    } else {
      alert('Nu putem salva preferințele dvs. fără consimțământul pentru cookie-uri. Vă rugăm să acceptați cookie-urile esențiale în banner.');
    }
  };
  
  const clearPreference = () => {
    if (consentStatus) {
      removeCookie(PREFERENCE_COOKIE);
      setUserPreference(undefined);
    }
  };
  
  return (
    <div className="p-6 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">Exemplu de utilizare a cookie-urilor</h3>
      
      <div className="mb-4">
        <p className="text-gray-600 text-sm mb-2">
          Acest exemplu demonstrează utilizarea corectă a cookie-urilor, respectând GDPR:
        </p>
        <ul className="list-disc pl-6 text-sm text-gray-600 mb-4">
          <li>Cookie-urile sunt setate doar după consimțământul utilizatorului</li>
          <li>Scopul este explicat clar</li>
          <li>Utilizatorii au control asupra datelor lor</li>
        </ul>
      </div>
      
      <div className="flex flex-col space-y-3">
        <div className="p-3 bg-gray-100 rounded text-sm">
          Preferință curentă: <span className="font-medium">{userPreference || 'Nicio preferință salvată'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={setLightMode}
            className="bg-white hover:bg-gray-100"
          >
            Mod deschis
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={setDarkMode}
            className="bg-gray-800 text-white hover:bg-gray-900"
          >
            Mod întunecat
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearPreference}
            className="text-red-500 hover:text-red-600"
          >
            Șterge preferința
          </Button>
        </div>
        
        {!consentStatus && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            Notă: Cookie-urile de preferințe pot fi setate doar după ce acceptați cookie-urile esențiale din banner.
          </div>
        )}
      </div>
    </div>
  );
}