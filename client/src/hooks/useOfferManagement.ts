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
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch viewed offers' }));
        throw new Error(errorData.message);
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

      const response = await fetch(`/api/client/mark-offer-viewed/${offerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to mark offer as viewed' }));
        throw new Error(errorData.message);
      }

      return response.json();
    },
    onSuccess: (_, offerId) => {
      // Update local state immediately
      setNewOffersCount(prev => Math.max(0, prev - 1));
      // Update the viewedOffers Set
      queryClient.setQueryData(["/api/client/viewed-offers"], (old: Set<number> = new Set()) => {
        const newSet = new Set(old);
        newSet.add(offerId);
        return newSet;
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la marcarea ofertei ca văzută.",
        variant: "destructive",
      });
    }
  });

  const markOfferAsViewed = async (offerId: number): Promise<void> => {
    await markOfferAsViewedMutation.mutateAsync(offerId);
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