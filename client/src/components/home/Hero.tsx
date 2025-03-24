
import { ChevronRight } from "lucide-react";
import AuthDialog from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";

export default function Hero() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <img
          src="https://images.unsplash.com/photo-1575564413292-000318a0dc43?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Găsește service-ul auto <br className="hidden lg:inline" />
            <span className="text-[#00aff5]">în doar câteva minute</span>
          </h1>
          <p className="mt-6 text-xl text-gray-300 max-w-3xl mx-auto lg:mx-0">
            Platforma care conectează șoferii cu service-urile auto profesionale
            din România. Rapid, transparent și fără bătăi
            de cap.
        </p>
        <div className="mt-10 flex space-x-4">
          {user ? (
            <button 
              onClick={() => setLocation("/dashboard")}
              className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-full text-white bg-[#00aff5] hover:bg-blue-700 shadow-lg transition-transform transform hover:scale-105"
            >
              Intră în cont
              <ChevronRight className="ml-2 h-6 w-6" />
            </button>
          ) : (
            <AuthDialog
              trigger={
                <button className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-full text-white bg-[#00aff5] hover:bg-blue-700 shadow-lg transition-transform transform hover:scale-105">
                  Începe acum
                  <ChevronRight className="ml-2 h-6 w-6" />
                </button>
              }
              defaultView="signup"
            />
          )}
          <button
            onClick={() => scrollToSection("how-it-works")}
            className="inline-flex items-center px-8 py-3 border border-white text-lg font-medium rounded-full text-white bg-transparent hover:bg-gray-800 shadow-lg transition-transform transform hover:scale-105"
          >
            Cum funcționează
          </button>
        </div>
        </div>
      </div>
    </section>
  );
}
