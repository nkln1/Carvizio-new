import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { OfferWithProvider } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function useOfferManagement() {
  const queryClient = useQueryClient();
  const [newOffersCount, setNewOffersCount] = useState(0);
  const { toast } = useToast();

  // Fetch offers
  const { data: offers = [] } = useQuery<OfferWithProvider[]>({
    queryKey: ["/api/client/offers"]
  });

  // Fetch viewed offers
  const { data: viewedOffers = new Set() } = useQuery<Set<number>>({
    queryKey: ["/api/client/viewed-offers"],
    queryFn: async () => {
      try {
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
        console.log('Fetched viewed offers:', data);
        const offerIds = data.map((offer: { offerId: number }) => offer.offerId);
        console.log('Mapped to offer IDs:', offerIds);
        return new Set(offerIds);
      } catch (error) {
        console.error('Error fetching viewed offers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch viewed offers status",
          variant: "destructive",
        });
        return new Set();
      }
    }
  });

  const markOfferAsViewed = async (offerId: number): Promise<void> => {
    try {
      console.log('Marking offer as viewed:', offerId);
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
        throw new Error('Failed to mark offer as viewed');
      }

      console.log('Successfully marked offer as viewed:', offerId);

      // Update local cache immediately for UI feedback
      queryClient.setQueryData(["/api/client/viewed-offers"], (old: Set<number> = new Set()) => {
        const newSet = new Set(old);
        newSet.add(offerId);
        return newSet;
      });

      // Invalidate queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/client/offers"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/client/viewed-offers"] })
      ]);

      setNewOffersCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking offer as viewed:", error);
      toast({
        title: "Error",
        description: "Failed to mark offer as viewed",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getNewOffersCount = () => {
    return offers.filter(offer => !viewedOffers.has(offer.id)).length;
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