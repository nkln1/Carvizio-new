import { ChevronRight } from "lucide-react";
import AuthDialog from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";

export default function Hero() {
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative bg-gray-900 overflow-hidden">
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover opacity-50"
          src="https://i.ibb.co/q7mrkwc/carvizio.jpg"
          alt="Mechanic working on car"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900 opacity-90"></div>
      </div>
      <div className="relative max-w-7xl mx-auto py-24 px-6 sm:py-32 sm:px-12 lg:px-16 flex flex-col items-center text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl drop-shadow-lg">
          Găsește cel mai bun service auto din zona ta,
          <br />
          <span className="text-[#00aff5]">rapid, ușor și GRATUIT!</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-3xl">
          Descoperă service-uri auto de încredere în zona ta. Primește cotații
          rapide, programează-te în câteva minute și repară-ți mașina fără bătăi
          de cap.
        </p>
        <div className="mt-10 flex space-x-4">
          <AuthDialog
            trigger={
              <button className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-full text-white bg-[#00aff5] hover:bg-blue-700 shadow-lg transition-transform transform hover:scale-105">
                Începe acum
                <ChevronRight className="ml-2 h-6 w-6" />
              </button>
            }
            defaultView="signup"
          />
          <button
            onClick={() => scrollToSection("how-it-works")}
            className="inline-flex items-center px-8 py-3 border border-white text-lg font-medium rounded-full text-white bg-transparent hover:bg-gray-800 shadow-lg transition-transform transform hover:scale-105"
          >
            Află mai multe
          </button>
        </div>
      </div>
    </div>
  );
}