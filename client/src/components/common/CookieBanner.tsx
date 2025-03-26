
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  hasConsentedToCookies, 
  acceptCookieConsent 
} from '@/lib/cookieUtils';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented to cookies
    const hasConsented = hasConsentedToCookies();
    
    // Show banner only if user hasn't consented yet
    if (!hasConsented) {
      // Small delay to prevent banner from flashing on page load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    acceptCookieConsent();
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Politică de Cookie-uri</h2>
            <p className="text-gray-700 mb-3">
              Acest site folosește doar cookie-uri esențiale pentru a asigura funcționalitatea de bază. Nu colectăm cookie-uri de marketing, analiză sau urmărire.
            </p>
            <p className="text-gray-700 mb-3">
              Cookie-urile esențiale sunt necesare pentru funcționarea corectă a site-ului și nu pot fi dezactivate. 
              Acestea sunt utilizate pentru autentificare, menținerea sesiunii și pentru preferințele de utilizator.
            </p>
            <div className="text-sm text-gray-600 mb-2">
              Prin continuarea utilizării acestui site, sunteți de acord cu utilizarea cookie-urilor noastre esențiale. 
              Pentru mai multe informații, consultați <Link href="/cookie-policy" className="text-[#00aff5] hover:underline">Politica noastră de Cookie-uri</Link>.
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 md:mt-0">
            <Button 
              onClick={handleAccept} 
              className="bg-[#00aff5] hover:bg-[#0097d8] text-white"
            >
              Accept
            </Button>
            <button 
              onClick={() => setShowBanner(false)} 
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Închide"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
