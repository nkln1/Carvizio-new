import { useEffect } from "react";
import { ParallaxWrapper } from "@/components/ui/parallax-wrapper";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import Benefits from "@/components/home/Benefits";
import FAQ from "@/components/home/FAQ";
import AppPreview from "@/components/home/AppPreview";
import Footer from "@/components/layout/Footer";
import TestimonialCarousel from "@/components/home/TestimonialCarousel";

export default function Home() {
  useEffect(() => {
    document.title = "CARVIZIO - Găsește service auto rapid și ușor";
  }, []);

  return (
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
      <ParallaxWrapper offset={50}>
        <AppPreview />
      </ParallaxWrapper>
      <ParallaxWrapper offset={30}>
        <FAQ />
      </ParallaxWrapper>
      <Footer />
    </div>
  );
}