import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import LoginDropdown from "@/components/auth/LoginDropdown";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Query dezactivat pentru notificări deoarece am eliminat clopoțelul
  // const { data: unreadData } = useQuery({
  //   queryKey: ['/api/messages/unread'],
  //   enabled: !!auth.currentUser
  // });
  // const unreadClientsCount = unreadData?.count ?? 0;

  const handleContactClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLocation("/contact");
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLocation("/");
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-md"
          : "bg-white shadow-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center">
          <button 
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity duration-200"
            aria-label="Pagina principală"
          >
            <img
              src="https://i.ibb.co/njmjGNW/Logo.png"
              alt="CARVIZIO Logo"
              className="h-8 sm:h-12 md:h-16 w-auto"
              loading="eager"
            />
            <span
              className="ml-1 sm:ml-2 text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 font-gugi truncate"
            >
              CARVIZIO<span className="relative" style={{ fontSize: '0.5em', top: '-0.9em', fontFamily: 'Times New Roman, serif', fontStyle: 'normal' }}>®</span>
            </span>
          </button>
          <div className="flex items-center space-x-1 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleContactClick}
              className="text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-[#00aff5] hover:bg-transparent hover:scale-105 transition-all duration-200 px-2 sm:px-4"
            >
              <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Contactează-ne</span>
              <span className="sm:hidden">Contact</span>
            </Button>
            <LoginDropdown />
          </div>
        </div>
      </div>
    </nav>
  );
}