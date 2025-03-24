import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Sponsors() {
  const [showDialog, setShowDialog] = useState(false);

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
    <section className="py-20 bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-extrabold text-center text-[#00aff5] sm:text-5xl mb-6">
          Sponsorii Noștri
        </h2>
        <p className="text-lg text-center text-gray-600 mb-12">
          Partenerii care ne susțin în misiunea noastră
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {mockSponsors.map((sponsor) => (
            <button
              key={sponsor.id}
              onClick={() => setShowDialog(true)}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-transform transform hover:scale-105"
            >
              <img
                src={sponsor.image}
                alt={sponsor.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span className="text-white font-semibold text-lg">
                  Rezervă acest spațiu
                </span>
              </div>
            </button>
          ))}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#00aff5]">
                Devino Sponsor CARVIZIO
              </DialogTitle>
              <DialogDescription className="pt-4 space-y-4 text-base">
                <p>
                  Alătură-te celor mai importanți parteneri și afișează-ți
                  brandul în fața unei audiențe relevante. Aceasta este o
                  oportunitate unică de a îți crește vizibilitatea și de a avea
                  un impact real într-o industrie competitivă.
                </p>
                <p className="font-semibold text-[#00aff5]">Beneficii:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Promovare strategică în cadrul platformei noastre</li>
                  <li>Acces direct la o comunitate pasionată de auto</li>
                  <li>Un spațiu exclusiv pentru afacerea ta</li>
                  <li>Parteneriat cu o platformă în continuă creștere</li>
                  <li>
                    Susținere continuă pentru a maximiza impactul reclamei tale
                  </li>
                </ul>
                <p className="font-semibold pt-2">
                  Nu rata șansa de a face parte dintr-o comunitate care
                  inovează!
                </p>
                <p className="text-[#00aff5] font-medium underline">
                  contact@carvizio.com
                </p>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
