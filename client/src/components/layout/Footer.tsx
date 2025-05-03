import { useLocation } from "wouter";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [, setLocation] = useLocation();
  const [showDialog, setShowDialog] = useState(false);

  const handleContactClick = () => {
    setLocation("/contact");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handleLogoClick = () => {
    setLocation("/");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const mockSponsors = [
    {
      id: 1,
      image: "https://placehold.co/600x400/e2e8f0/64748b?text=Your+Logo+Here",
      alt: "Sponsor 1",
    },
    {
      id: 2,
      image: "https://placehold.co/600x400/e2e8f0/64748b?text=Your+Logo+Here",
      alt: "Sponsor 2",
    },
    {
      id: 3,
      image: "https://placehold.co/600x400/e2e8f0/64748b?text=Your+Logo+Here",
      alt: "Sponsor 3",
    },
    {
      id: 4,
      image: "https://placehold.co/600x400/e2e8f0/64748b?text=Your+Logo+Here",
      alt: "Sponsor 4",
    },
  ];

  return (
    <footer className="bg-gray-900">
      <div className="max-w-7xl mx-auto pt-8 sm:pt-12 pb-6 sm:pb-8 px-3 sm:px-6 lg:px-8">
        {/* Sponsors Section */}
        <div className="mb-6 sm:mb-10">
          <h3 className="text-base sm:text-lg font-semibold text-center text-[#00aff5] mb-3 sm:mb-4">
            Sponsori
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {mockSponsors.map((sponsor) => (
              <button
                key={sponsor.id}
                onClick={() => setShowDialog(true)}
                className="group relative bg-gray-800 rounded-lg overflow-hidden hover:shadow-md transition-transform transform hover:scale-105 h-12 sm:h-16"
                aria-label={`Sponsor ${sponsor.alt}`}
              >
                <img
                  src={sponsor.image}
                  alt={sponsor.alt}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-1">
                  <span className="text-white font-medium text-[10px] sm:text-xs">
                    Rezervă acest spațiu
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 sm:pt-8"></div>

        {/* Regular Footer Content */}
        <nav className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 md:space-x-12">
          <button
            onClick={handleContactClick}
            className="text-gray-400 hover:text-gray-300 transition-colors text-sm sm:text-base"
          >
            Contactează-ne
          </button>
          <button
            onClick={() => setLocation("/cookie-policy")}
            className="text-gray-400 hover:text-gray-300 transition-colors text-sm sm:text-base"
          >
            Politica de cookie-uri
          </button>
          <button
            onClick={() => setLocation("/terms-and-conditions")}
            className="text-gray-400 hover:text-gray-300 transition-colors text-sm sm:text-base"
          >
            Termeni și condiții
          </button>
        </nav>
        <div className="mt-6 sm:mt-8 flex flex-col items-center">
          <button
            onClick={handleLogoClick}
            className="flex items-center space-x-1 sm:space-x-2 hover:opacity-80 transition-opacity duration-200"
            aria-label="Pagina principală"
          >
            <img
              src="https://i.ibb.co/njmjGNW/Logo.png"
              alt="CARVIZIO Logo"
              className="h-5 sm:h-8 w-auto"
              loading="eager"
            />
            <span className="text-base sm:text-xl font-bold text-white font-gugi">
              CARVIZIO<span className="relative" style={{ fontSize: '0.5em', top: '-0.9em', fontFamily: 'Times New Roman, serif', fontStyle: 'normal' }}>®</span>
            </span>
          </button>
          <p className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-400">
            © {currentYear} CARVIZIO<sup className="text-xs">®</sup>. Toate drepturile rezervate.
          </p>
        </div>
      </div>

      {/* Sponsor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="mb-2 sm:mb-4">
            <DialogTitle className="text-lg sm:text-xl text-[#00aff5]">
              Devino Sponsor CARVIZIO®
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Alătură-te celor mai importanți parteneri și afișează-ți
              brandul în fața unei audiențe relevante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
            <div>
              Aceasta este o oportunitate unică de a îți crește vizibilitatea și de a avea
              un impact real într-o industrie competitivă.
            </div>
            <div className="font-semibold text-[#00aff5]">Beneficii:</div>
            <ul className="list-disc pl-5 space-y-1 sm:space-y-2">
              <li>Promovare strategică în cadrul platformei noastre</li>
              <li>Acces direct la o comunitate pasionată de auto</li>
              <li>Un spațiu exclusiv pentru afacerea ta</li>
              <li>Parteneriat cu o platformă în continuă creștere</li>
              <li>
                Susținere continuă pentru a maximiza impactul reclamei tale
              </li>
            </ul>
            <div className="font-semibold pt-2">
              Nu rata șansa de a face parte dintr-o comunitate care
              inovează!
            </div>
            <div className="text-[#00aff5] font-medium underline">
              contact@carvizio.com
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}