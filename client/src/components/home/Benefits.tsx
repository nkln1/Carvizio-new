import { CheckCircle, Calendar, Star, Clock } from "lucide-react";

const benefits = [
  {
    icon: CheckCircle,
    title: "Cere instant și compară oferte",
    desc: "Primești rapid cotații de preț de la mai multe service-uri și alegi cea mai bună ofertă",
  },
  {
    icon: Calendar,
    title: "Programează-ți vizita rapid",
    desc: "Nu mai pierzi timp cu telefoane. Totul se face online, ușor și rapid",
  },
  {
    icon: Star,
    title: "Transparență și recenzii",
    desc: "Vezi recenzii reale de la alți clienți pentru a face alegerea corectă",
  },
  {
    icon: Clock,
    title: "Economisești timp și bani",
    desc: "Compară prețurile și alege cea mai bună ofertă pentru serviciile auto dorite",
  },
];

export default function Benefits() {
  return (
    <div className="bg-gradient-to-r from-[#00aff5] to-[#005f99] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-extrabold text-center text-white sm:text-5xl">
          De ce să alegi CARVIZIO<span className="relative" style={{ fontSize: '0.5em', top: '-0.9em', fontFamily: 'Times New Roman, serif', fontStyle: 'normal' }}>®</span>
        </h2>
        <p className="mt-4 text-lg text-center text-blue-100 font-sans">
          Simplificăm procesul de întreținere auto pentru tine.
        </p>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg p-8 text-center transition-transform transform hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#00aff5] mx-auto">
                <benefit.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                {benefit.title}
              </h3>
              <p className="mt-4 text-base text-gray-600 font-sans">
                {benefit.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
