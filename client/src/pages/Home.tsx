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
import StructuredData from "@/components/seo/StructuredData";

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
  
  // Notă: Datele structurate pentru FAQ sunt acum definite direct în componenta FAQ

  return (
    <>
      <SEOHeader 
        title="CARVIZIO - Găsește service auto rapid și ușor în România"
        description="Platforma CARVIZIO conectează clienții cu service-urile auto din România, oferind cereri personalizate, oferte transparente și programări online. Simplu, rapid și eficient."
        keywords="service auto, reparații auto, întreținere auto, oferte service, programare service auto, România, CARVIZIO"
        canonicalUrl="https://auto-service-app.ro/"
        ogImage="/og-image.jpg"
      />
      
      {/* Datele structurate pentru businessSchema */}
      <StructuredData schema={businessSchema} />
      
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