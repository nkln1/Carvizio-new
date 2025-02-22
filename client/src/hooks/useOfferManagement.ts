import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { OfferWithProvider } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function useOfferManagement() {
  const queryClient = useQueryClient();
  const [newOffersCount, setNewOffersCount] = useState(0);
  const { toast } = useToast();

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
      return new Set(data.map((offer: { offerId: number }) => offer.offerId));
    }
  });

  // Mutation for marking an offer as viewed
  const markOfferAsViewedMutation = useMutation({
    mutationFn: async (offerId: number) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/client/mark-offer-viewed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ offerId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to mark offer as viewed' }));
        throw new Error(errorData.message);
      }

      return response.json();
    },
    onSuccess: (_, offerId) => {
      // Update the viewedOffers Set in the cache
      queryClient.setQueryData(["/api/client/viewed-offers"], (old: Set<number> = new Set()) => {
        const newSet = new Set(old);
        newSet.add(offerId);
        return newSet;
      });

      // Update the new offers count
      setNewOffersCount(prev => Math.max(0, prev - 1));

      // Invalidate both queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/client/viewed-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/offers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while marking the offer as viewed.",
        variant: "destructive",
      });
    }
  });

  const markOfferAsViewed = async (offerId: number): Promise<void> => {
    try {
      await markOfferAsViewedMutation.mutateAsync(offerId);
    } catch (error) {
      console.error("Error marking offer as viewed:", error);
      throw error;
    }
  };

  const getNewOffersCount = () => {
    return offers.filter(offer => !viewedOffers.has(offer.id)).length;
  };

  // Update new offers count whenever offers or viewedOffers change
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