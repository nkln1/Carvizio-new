import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
  question: "Este gratuită folosirea platformei Carvizio",
  answer:
  'Da, utilizarea platformei Carvizio este integral gratuită atât pentru clienți, cât și pentru service-urile auto partenere. Platforma nu percepe comisioane sau alte taxe ascunse. Costurile de funcționare și mentenanță ale Carvizio sunt acoperite exclusiv prin sponsorizări, iar sponsorii noștri sunt menționați transparent pe pagina principală și în secțiunea de jos a site-ului (footer)',
  },
  {
  question: "Cum îmi creez un cont pe Carvizio?",
  answer:
  'Pentru a-ți crea un cont pe Carvizio, accesează pagina principală și fă clic pe iconița de login din bara de navigare. Alege tipul de cont - Client sau Service Auto, completează formularul cu datele necesare, adresa ta de email și o parolă sigură.',
  },
  {
  question: "Cum solicit o ofertă de la service-uri auto prin Carvizio?",
  answer:
  'După conectare, în dashboard, apasă butonul "Adaugă cerere", selecteză mașina (dacă ai salvat-o în cont) sau introdu detaliile autoturismului tău (marca, modelul, anul fabricației, kilometrajul), descrie tipul serviciului dorit (revizie, reparație, ITP, etc.), selectează data dorită și locația dorită. Cererea va fi automat transmisă către service-urile partenere din zona selectată.',
  },
  {
  question: "Cum primesc ofertele de la service-uri auto?",
  answer:
  'Ofertele primite vor apărea direct în contul tău Carvizio, în secțiunea "Oferte primite" și vei fi notificat prin aplicație și pe email, în funcție de preferințele tale de notificare. Poți analiza și compara fiecare ofertă primită în funcție de preț și disponibilitate.',
  },
  {
  question: "Cum aleg cea mai potrivită ofertă de la service-urile auto?",
  answer:
  'După primirea ofertelor, analizează prețurile, serviciile incluse și evaluările altor clienți. Poți selecta oferta care corespunde cel mai bine nevoilor tale și confirmă alegerea desemnând acceptată oferta dorită. Ulterior, vei putea lăsa o recenzie service-ului auto a cărui ofertă ai acceptat-o.',
  },
  {
  question: "Cum programez vizita la service-ul auto ales?",
  answer:
  'După ce ai ales o ofertă, apelează sau trimite un mesaj service-ului pentru a stabili toate detaliile',
  },
  {
  question: "Pot adăuga mai multe mașini în contul meu Carvizio",
  answer:
  'Da, poți salva oricâte autoturisme dorești în contul tău Carvizio, astfel încât să poți trimite rapid cereri de oferte fără să reintroduci detaliile mașinii de fiecare dată.',
  },
  {
  question: "Cum pot lăsa o recenzie pentru un service auto?",
  answer:
  'După ce serviciul auto a fost prestat, vei avea opțiunea de a lăsa o recenzie pe pagina publică a service-ului auto, evaluând calitatea serviciului și experiența generală',
  },
  {
  question: "Ce fac dacă întâmpin o problemă tehnică pe platforma Carvizio?",
  answer:
  'Pentru orice problemă tehnică sau neclaritate, contactează-ne folosind formularul de suport disponibil în secțiunea „Contact” sau trimite-ne direct un email la adresa de suport afișată pe site.',
  },
  {
  question: "Pot folosi Carvizio și pentru servicii de urgență?",
  answer:
  'Momentan, Carvizio se concentrează pe cerere și ofertă, însă poți specifica în cererea ta dacă ai nevoie urgentă, iar service-urile pot ține cont de acest aspect atunci când îți transmit ofertele.',
  },
];

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <section id="faq" className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
          Întrebări Frecvente
        </h2>
        <div className="space-y-4">
          {faqs.map((item, index) => (
            <div 
              key={index} 
              className="border border-gray-200 rounded-lg p-4 
                         hover:border-[#00aff5] hover:shadow-md
                         transition-all duration-300 ease-in-out"
            >
              <button
                type="button"
                className="flex justify-between w-full text-left focus:outline-none
                           group"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg font-semibold text-gray-800 
                                group-hover:text-[#00aff5] transition-colors duration-300">
                  {item.question}
                </span>
                <span className="text-gray-500 font-bold text-xl
                                group-hover:text-[#00aff5] transition-colors duration-300
                                transform group-hover:scale-110">
                  {activeIndex === index ? "−" : "+"}
                </span>
              </button>
              <AnimatePresence>
                {activeIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 text-gray-600 leading-relaxed">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}