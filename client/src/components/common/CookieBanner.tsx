import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'wouter';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { acceptCookieConsent, hasConsentedToCookies } from '@/lib/cookieUtils';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already given consent
    const hasConsented = hasConsentedToCookies();
    
    // Only show the banner if the user hasn't consented yet
    if (!hasConsented) {
      // Small delay to prevent the banner from flashing on page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    acceptCookieConsent();
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <Card className="mx-auto max-w-4xl rounded-lg border shadow-lg p-4 md:p-6 bg-white dark:bg-gray-900">
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold">Informare privind cookie-urile</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsVisible(false)}
              aria-label="Închide informarea cookie"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3 mb-4 text-sm">
            <p>
              Acest site folosește doar cookie-uri esențiale pentru a asigura funcționarea corectă și experiența optimă.
            </p>
            <p>
              Cookie-urile esențiale sunt necesare pentru funcționarea tehnică a site-ului (cum ar fi pentru autentificare, 
              memorarea preferințelor de bază și sesiune). Fără acestea, site-ul nu ar putea funcționa corespunzător.
            </p>
            <p>
              Nu folosim cookie-uri de marketing sau analiză și nu vindem datele dvs. către terți. Pentru mai multe informații, 
              consultați <Link to="/politica-cookie" className="font-medium underline">Politica de Cookie-uri</Link>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button 
              variant="default" 
              onClick={handleAccept}
              className="w-full sm:w-auto"
            >
              Am înțeles
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}