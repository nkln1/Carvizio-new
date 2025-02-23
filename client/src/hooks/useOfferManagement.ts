import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { OfferWithProvider, ViewedOffer } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function useOfferManagement() {
  const queryClient = useQueryClient();
  const [newOffersCount, setNewOffersCount] = useState(0);
  const { toast } = useToast();

  // Fetch offers
  const { data: offers = [] } = useQuery<OfferWithProvider[]>({
    queryKey: ["/api/client/offers"],
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Fetch viewed offers
  const { data: viewedOffers = [] } = useQuery<ViewedOffer[]>({
    queryKey: ["/api/client/viewed-offers"],
    refetchInterval: 30000 // Refetch every 30 seconds
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
        throw new Error(`Failed to mark offer as viewed: ${await response.text()}`);
      }

      // Get the new viewed offer from the response
      const newViewedOffer = await response.json();
      console.log('Successfully marked offer as viewed:', newViewedOffer);

      // Optimistically update viewed offers cache
      queryClient.setQueryData<ViewedOffer[]>(["/api/client/viewed-offers"], (old = []) => {
        const filtered = old.filter(vo => vo.offerId !== offerId);
        return [...filtered, newViewedOffer];
      });

      // Update the offers count immediately
      setNewOffersCount(prev => Math.max(0, prev - 1));

      // Invalidate both queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/client/viewed-offers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/client/offers"] });

      toast({
        title: "Success",
        description: "Offer marked as viewed",
      });
    } catch (error) {
      console.error("Error marking offer as viewed:", error);
      toast({
        title: "Error",
        description: "Failed to mark offer as viewed",
        variant: "destructive",
      });
    }
  };

  // Calculate new offers count whenever offers or viewedOffers change
  useEffect(() => {
    const newOffers = offers.filter(offer => 
      !viewedOffers.some(vo => vo.offerId === offer.id)
    );
    console.log('New offers calculation:', {
      totalOffers: offers.length,
      viewedOffers: viewedOffers.length,
      newOffersCount: newOffers.length
    });
    setNewOffersCount(newOffers.length);
  }, [offers, viewedOffers]);

  return {
    offers,
    viewedOffers,
    markOfferAsViewed,
    newOffersCount
  };
}