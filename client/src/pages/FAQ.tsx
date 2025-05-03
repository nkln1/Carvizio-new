import React, { useState } from 'react';
import { Link } from 'wouter';
import SEOHeader from '@/components/seo/SEOHeader';
import StructuredData from '@/components/seo/StructuredData';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Footer from '@/components/layout/Footer';

export default function FAQ() {
  // Schema pentru date structurate - FAQ
  const faqSchema = {
    type: 'FAQ' as const,
    data: {
      questions: [
        {
          question: "Cum pot solicita o ofertă pentru reparația mașinii mele?",
          answer: "Pentru a solicita o ofertă, creați un cont de client, completați detaliile mașinii, descrieți problema sau serviciul dorit și trimiteți cererea. Serviciile auto înregistrate vor primi notificări și vor putea răspunde cu oferte personalizate."
        },
        {
          question: "Cât durează până când voi primi oferte de la service-uri?",
          answer: "Timpul de răspuns variază în funcție de disponibilitatea service-urilor. De obicei, veți primi primele oferte în câteva ore de la trimiterea cererii, dar este recomandat să așteptați 24-48 de ore pentru a primi mai multe opțiuni și a putea compara."
        },
        {
          question: "Ce informații trebuie să furnizez despre mașina mea?",
          answer: "Pentru a primi oferte cât mai precise, este recomandat să furnizați marca, modelul, anul fabricației, tipul de combustibil, kilometrajul actual și o descriere detaliată a problemei sau serviciului dorit. Puteți adăuga și fotografii pentru a ajuta la diagnosticarea problemei."
        },
        {
          question: "Cum pot deveni furnizor de servicii pe această platformă?",
          answer: "Pentru a vă înregistra ca service auto, accesați pagina de înregistrare, selectați opțiunea 'Service Auto', completați informațiile despre companie, inclusiv certificările și specializările, și urmați pașii de verificare. După aprobarea contului, veți putea primi cereri și trimite oferte."
        },
        {
          question: "Este gratuită utilizarea platformei pentru clienți?",
          answer: "Da, utilizarea platformei este complet gratuită pentru clienți. Nu există costuri pentru crearea unui cont, solicitarea de oferte sau acceptarea acestora. Plătiți doar pentru serviciile auto efectiv realizate, direct către service-ul auto ales."
        },
        {
          question: "Cum sunt protejate datele mele personale?",
          answer: "Protejăm datele dumneavoastră personale conform GDPR și legislației în vigoare. Utilizăm criptare pentru transmiterea datelor, stocăm informațiile pe servere securizate și nu partajăm datele personale cu terțe părți fără consimțământul dumneavoastră. Pentru detalii complete, consultați Politica de Confidențialitate."
        },
        {
          question: "Pot anula o ofertă după ce am acceptat-o?",
          answer: "După acceptarea unei oferte, se creează o înțelegere între dumneavoastră și service-ul auto. Anularea este posibilă, dar vă recomandăm să contactați direct service-ul pentru a discuta condițiile de anulare. Fiecare service poate avea politici proprii privind anulările."
        },
        {
          question: "Ce fac dacă am nemulțumiri legate de serviciile primite?",
          answer: "În cazul unor nemulțumiri, primul pas este să contactați direct service-ul auto pentru a încerca rezolvarea situației. Dacă problema persistă, puteți lăsa o recenzie detaliată pe platformă și puteți contacta echipa noastră de suport prin pagina de Contact pentru asistență în mediere."
        },
        {
          question: "Pot programa o vizită la service direct prin platformă?",
          answer: "Da, după ce acceptați o ofertă, puteți utiliza sistemul de mesagerie integrat pentru a stabili detaliile programării cu service-ul auto. Unele service-uri oferă și opțiunea de programare online directă prin calendar, dacă au activat această funcționalitate."
        },
        {
          question: "Cum pot vedea istoricul serviciilor pentru mașina mea?",
          answer: "În contul dumneavoastră de client, secțiunea 'Istoric Servicii' afișează toate lucrările anterioare, organizate pe fiecare vehicul înregistrat. Aici puteți accesa detalii despre reparații, întreținere, costuri și puteți descărca facturi sau documente asociate fiecărui serviciu."
        }
      ]
    }
  };

  return (
    <>
      {/* SEO Header cu metadate pentru pagina FAQ */}
      <SEOHeader 
        title="Întrebări Frecvente | CARVIZIO - Platformă Service Auto"
        description="Găsiți răspunsuri la întrebările frecvente despre platforma Carvizio de conectare între service-uri auto și clienți. Aflați cum să solicitați oferte, informații despre înregistrare și utilizare."
        keywords="întrebări frecvente service auto, FAQ Carvizio, întrebări platformă auto, cum funcționează Carvizio"
        canonicalUrl="https://auto-service-app.ro/faq"
      />
      
      {/* Datele structurate pentru pagina FAQ */}
      <StructuredData schema={faqSchema} />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="text-[#00aff5] hover:underline flex items-center">
              &larr; Înapoi la pagina principală
            </Link>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 text-gray-900">
            Întrebări Frecvente
          </h1>
          
          <p className="text-lg text-gray-600 text-center mb-10">
            Găsiți răspunsuri la cele mai comune întrebări despre platforma noastră de conectare între service-uri auto și clienți.
          </p>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-10">
            <Accordion type="single" collapsible className="w-full">
              {faqSchema.data.questions.map((faq, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-base sm:text-lg font-medium text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Aveți o altă întrebare?</h2>
            <p className="text-gray-600 mb-6">
              Dacă nu ați găsit răspunsul la întrebarea dvs, nu ezitați să ne contactați.
            </p>
            <Link href="/contact" className="inline-block bg-[#00aff5] hover:bg-[#0099d6] text-white px-6 py-3 rounded-md font-medium transition-colors duration-200">
              Contactați-ne
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}