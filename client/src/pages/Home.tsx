import React from "react";
import { ParallaxWrapper } from "@/components/ui/parallax-wrapper";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import Benefits from "@/components/home/Benefits";
import FAQ from "@/components/home/FAQ";
import AppPreview from "@/components/home/AppPreview";
import Footer from "@/components/layout/Footer";
import TestimonialCarousel from "@/components/home/TestimonialCarousel";
import Sponsors from "@/components/home/Sponsors";
import SEOHeader from "@/components/seo/SEOHeader";

export default function Home() {
  // Date structurate pentru pagina principală conform Schema.org
  const businessSchema = {
    type: 'Organization' as const,
    data: {
      name: 'CARVIZIO',
      url: 'https://auto-service-app.ro/',
      logo: 'https://auto-service-app.ro/logo.png',
      description: 'Platformă care conectează service-urile auto cu clienții, oferind o experiență simplificată pentru solicitarea și gestionarea serviciilor auto.'
    }
  };
  
  // Date structurate pentru FAQs
  const faqSchema = {
    type: 'FAQ' as const,
    data: {
      questions: [
        {
          question: 'Cum pot găsi un service auto prin CARVIZIO?',
          answer: 'Poți crea un cont, adăuga detaliile mașinii tale și trimite o cerere de service. Vei primi oferte personalizate de la service-urile auto partenere.'
        },
        {
          question: 'Cum pot verifica statusul cererii mele?',
          answer: 'Poți verifica statusul cererii tale în dashboard-ul de client, unde vei vedea toate cererile active și istoricul acestora.'
        },
        {
          question: 'Ce tipuri de service-uri sunt disponibile pe platformă?',
          answer: 'Platforma conectează o gamă largă de service-uri auto, de la întreținere de rutină la reparații complexe, service-uri autorizate și ateliere independente.'
        }
      ]
    }
  };

  return (
    <>
      <SEOHeader 
        title="CARVIZIO - Găsește service auto rapid și ușor în România"
        description="Platforma CARVIZIO conectează clienții cu service-urile auto din România, oferind cereri personalizate, oferte transparente și programări online. Simplu, rapid și eficient."
        keywords="service auto, reparații auto, întreținere auto, oferte service, programare service auto, România, CARVIZIO"
        canonicalUrl="https://auto-service-app.ro/"
        ogImage="/og-image.jpg"
        structuredData={businessSchema}
      />
      
      {/* A doua instanță de date structurate pentru FAQs */}
      <SEOHeader structuredData={faqSchema} />
      <div className="min-h-screen bg-gray-50">
        <ParallaxWrapper offset={0}>
          <Hero />
        </ParallaxWrapper>
        <ParallaxWrapper offset={30}>
          <HowItWorks />
        </ParallaxWrapper>
        <ParallaxWrapper offset={40}>
          <Benefits />
        </ParallaxWrapper>
        <ParallaxWrapper offset={50}>
          <TestimonialCarousel />
        </ParallaxWrapper>
        <ParallaxWrapper offset={45}>
          <Sponsors />
        </ParallaxWrapper>
        <ParallaxWrapper offset={50}>
          <AppPreview />
        </ParallaxWrapper>
        <ParallaxWrapper offset={30}>
          <FAQ />
        </ParallaxWrapper>
        <Footer />
      </div>
    </>
  );
}