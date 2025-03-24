import { Users, Wrench, Clock, Star } from "lucide-react";

  const steps = [
    {
      icon: Users,
      title: "Creează un cont",
      desc: "Crează un cont rapid în maxim 2 minute",
    },
    {
      icon: Wrench,
      title: "Trimite o cerere",
      desc: "Completează datele mașinii tale și descrie tipul reparației necesare / revizie / itp",
    },
    {
      icon: Clock,
      title: "Primește oferte",
      desc: "Primește oferte de la service-urile auto din zona ta",
    },
    {
      icon: Star,
      title: "Alege, programează și oferă recenzie",
      desc: "Alege oferta care ți se potrivește, programează vizita și, ulterior, lasă o recenzie service-ului auto",
    },
];

export default function HowItWorks() {
  return (
    <div id="how-it-works" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Cum funcționează:
          </h2>
          <p className="mt-4 text-lg text-gray-600 font-sans">
            Urmează acești pași simpli pentru a găsi cele mai bune oferte
          </p>
        </div>
        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative text-center p-6 bg-white rounded-lg shadow-md 
                          hover:shadow-xl hover:scale-105 hover:-translate-y-1
                          transition-all duration-300 ease-in-out
                          group cursor-pointer"
              >
                <div className="flex items-center justify-center h-16 w-16 rounded-full 
                              bg-blue-100 mx-auto
                              group-hover:bg-[#00aff5] transition-colors duration-300">
                  <step.icon className="h-8 w-8 text-[#00aff5] 
                                      group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 
                              group-hover:text-[#00aff5] transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="mt-4 text-base text-gray-600 font-sans 
                              group-hover:text-gray-800 transition-colors duration-300">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}