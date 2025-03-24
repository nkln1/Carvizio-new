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
      <div className="max-w-7xl mx-auto pt-12 pb-8 px-4 sm:px-6 lg:px-8">
        {/* Sponsors Section */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-center text-[#00aff5] mb-4">
            Sponsorii Noștri
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mockSponsors.map((sponsor) => (
              <button
                key={sponsor.id}
                onClick={() => setShowDialog(true)}
                className="group relative bg-gray-800 rounded-lg overflow-hidden hover:shadow-md transition-transform transform hover:scale-105 h-16"
              >
                <img
                  src={sponsor.image}
                  alt={sponsor.alt}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-1">
                  <span className="text-white font-medium text-xs">
                    Rezervă acest spațiu
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8"></div>

        {/* Regular Footer Content */}
        <nav className="flex flex-wrap justify-center space-x-6 md:space-x-12">
          <button
            onClick={handleContactClick}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            Contactează-ne
          </button>
          <a
            href="#"
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            Termeni și condiții
          </a>
        </nav>
        <div className="mt-8 flex flex-col items-center">
          <button
            onClick={handleLogoClick}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
          >
            <img
              src="https://i.ibb.co/njmjGNW/Logo.png"
              alt="CARVIZIO Logo"
              className="h-6 sm:h-8 w-auto"
            />
            <span className="text-lg sm:text-xl font-bold text-white font-gugi">
              CARVIZIO<span className="relative" style={{ fontSize: '0.5em', top: '-0.9em', fontFamily: 'Times New Roman, serif', fontStyle: 'normal' }}>®</span>
            </span>
          </button>
          <p className="mt-4 text-center text-sm sm:text-base text-gray-400">
            © {currentYear} CARVIZIO<sup className="text-xs">®</sup>. All rights reserved.
          </p>
        </div>
      </div>

      {/* Sponsor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00aff5]">
              Devino Sponsor CARVIZIO®
            </DialogTitle>
            <DialogDescription className="text-base">
              Alătură-te celor mai importanți parteneri și afișează-ți
              brandul în fața unei audiențe relevante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-base">
            <div>
              Aceasta este o oportunitate unică de a îți crește vizibilitatea și de a avea
              un impact real într-o industrie competitivă.
            </div>
            <div className="font-semibold text-[#00aff5]">Beneficii:</div>
            <ul className="list-disc pl-5 space-y-2">
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