import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    question: "Cum îmi creez un cont în aplicație?",
    answer:
      'Pentru a-ți crea un cont, mergi în bara de navigare și apasă pe butonul "Conectează-te" sau "Login". Completează formularul cu adresa de email și parola, iar contul se va crea instant. Poți, de asemenea, să folosești un cont de Google sau Facebook pentru a te autentifica mai rapid.',
  },
  {
    question: "Cum trimit o cerere către service-urile auto?",
    answer:
      'După ce te-ai logat, mergi la secțiunea "Trimite cerere" (sau "Solicită ofertă"). Acolo vei completa detaliile mașinii tale (model, an, kilometraj) și vei descrie serviciul necesar (reparație, revizie, ITP, etc.). Aplicația va distribui automat cererea ta către service-urile din zona selectată de tine.',
  },
  {
    question: "Cum primesc cotații de la service-uri?",
    answer:
      "Service-urile auto înregistrate vor vedea cererea ta și îți vor trimite ofertele. Vei primi o notificare în aplicație și, opțional, pe email. Apoi, poți compara prețurile și disponibilitatea fiecărui service înainte să alegi unul.",
  },
  {
    question: "Cum aleg service-ul potrivit dintre mai multe oferte?",
    answer:
      "După ce primești ofertele, poți compara prețurile, detaliile incluse în ofertă și evaluările altor clienți. Selectează oferta care corespunde cel mai bine criteriilor tale (preț, localizare, recenzii, etc.) și confirmă programarea.",
  },
  {
    question: "Cum programez o vizită la service-ul ales?",
    answer:
      "În momentul în care accepți o ofertă, aplicația îți va arăta intervalele orare disponibile. Alege data și ora convenabile, iar service-ul îți va confirma rezervarea printr-un mesaj sau notificare în aplicație.",
  },
  {
    question: "Ce se întâmplă dacă un service anulează programarea?",
    answer:
      "Dacă service-ul anulează, vei primi o notificare și poți fie să ceri o reprogramare, fie să alegi una dintre celelalte oferte primite inițial. Eventualele costuri plătite în avans (dacă există) vor fi rambursate automat.",
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