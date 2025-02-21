import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { OfferWithProvider } from "@shared/schema";

export function useOfferManagement() {
  const [newOffersCount, setNewOffersCount] = useState(0);
  const [viewedOffers, setViewedOffers] = useState<Set<number>>(new Set());

  const { data: offers = [] } = useQuery<OfferWithProvider[]>({
    queryKey: ["/api/client/offers"],
  });

  useEffect(() => {
    const savedViewedOffers = localStorage.getItem('viewedOffers');
    if (savedViewedOffers) {
      try {
        const parsed = JSON.parse(savedViewedOffers);
        if (Array.isArray(parsed)) {
          setViewedOffers(new Set(parsed));
        }
      } catch (e) {
        console.error('Error parsing viewedOffers from localStorage:', e);
        setViewedOffers(new Set());
      }
    }
  }, []);

  const markOfferAsViewed = (offerId: number) => {
    setViewedOffers(prev => {
      const newSet = new Set(prev).add(offerId);
      localStorage.setItem('viewedOffers', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const getNewOffersCount = () => {
    return offers.filter(offer => !viewedOffers.has(offer.id) && offer.status === "Pending").length;
  };

  return {
    offers,
    viewedOffers,
    setViewedOffers,
    markOfferAsViewed,
    newOffersCount: getNewOffersCount(),
    setNewOffersCount,
  };
}