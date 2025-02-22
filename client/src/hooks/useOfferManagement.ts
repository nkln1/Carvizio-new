import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { OfferWithProvider } from "@shared/schema";
import { auth } from "@/lib/firebase";

export function useOfferManagement() {
  const queryClient = useQueryClient();
  const [newOffersCount, setNewOffersCount] = useState(0);

  // Fetch offers
  const { data: offers = [] } = useQuery<OfferWithProvider[]>({
    queryKey: ["/api/client/offers"],
  });

  // Fetch viewed offers
  const { data: viewedOffers = new Set() } = useQuery<Set<number>>({
    queryKey: ["/api/client/viewed-offers"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/client/viewed-offers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch viewed offers');
      }

      const data = await response.json();
      return new Set(data.map((offer: any) => offer.offerId));
    }
  });

  // Mutation for marking an offer as viewed
  const markOfferAsViewedMutation = useMutation({
    mutationFn: async (offerId: number) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/client/mark-offer-viewed/${offerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark offer as viewed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/viewed-offers"] });
    }
  });

  const markOfferAsViewed = (offerId: number) => {
    markOfferAsViewedMutation.mutate(offerId);
  };

  const getNewOffersCount = () => {
    return offers.filter(offer => !viewedOffers.has(offer.id) && offer.status === "Pending").length;
  };

  useEffect(() => {
    setNewOffersCount(getNewOffersCount());
  }, [offers, viewedOffers]);

  return {
    offers,
    viewedOffers,
    markOfferAsViewed,
    newOffersCount,
    setNewOffersCount,
  };
}