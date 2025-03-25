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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg md:flex md:items-center md:justify-between">
      <div className="flex-1 text-sm text-gray-700 md:pr-8">
        <p className="mb-2">
          Acest site folosește cookie-uri esențiale pentru a asigura funcționarea corectă.{' '}
          <Link href="/cookie-policy" className="text-[#00aff5] hover:underline">
            Află mai multe
          </Link>
        </p>
      </div>
      <div className="flex items-center space-x-4 mt-4 md:mt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBanner(false)}
          className="border-gray-300"
        >
          <X className="h-4 w-4 mr-1.5" />
          Închide
        </Button>
        <Button
          size="sm"
          onClick={handleAccept}
          className="bg-[#00aff5] hover:bg-[#0099d6]"
        >
          Accept
        </Button>
      </div>
    </div>
  );
}