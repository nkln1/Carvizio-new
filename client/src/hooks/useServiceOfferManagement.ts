import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SentOffer, ViewedAcceptedOffer } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function useServiceOfferManagement() {
  const queryClient = useQueryClient();
  const [newAcceptedOffersCount, setNewAcceptedOffersCount] = useState(0);
  const { toast } = useToast();

  // Fetch service provider's offers
  const { data: offers = [] } = useQuery<SentOffer[]>({
    queryKey: ["/api/service/offers"],
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Fetch viewed accepted offers
  const { data: viewedAcceptedOffers = [] } = useQuery<ViewedAcceptedOffer[]>({
    queryKey: ["/api/service/viewed-accepted-offers"],
    refetchInterval: 30000
  });

  const markAcceptedOfferAsViewed = async (offerId: number): Promise<void> => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/mark-accepted-offer-viewed/${offerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to mark accepted offer as viewed: ${await response.text()}`);
      }

      const newViewedAcceptedOffer = await response.json();

      // Optimistically update viewed accepted offers cache
      queryClient.setQueryData<ViewedAcceptedOffer[]>(["/api/service/viewed-accepted-offers"], (old = []) => {
        const filtered = old.filter(vo => vo.offerId !== offerId);
        return [...filtered, newViewedAcceptedOffer];
      });

      // Update the offers count immediately
      setNewAcceptedOffersCount(prev => Math.max(0, prev - 1));

      // Invalidate the query to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/service/viewed-accepted-offers"] });

      toast({
        title: "Success",
        description: "Accepted offer marked as viewed",
      });
    } catch (error) {
      console.error("Error marking accepted offer as viewed:", error);
      toast({
        title: "Error",
        description: "Failed to mark accepted offer as viewed",
        variant: "destructive",
      });
    }
  };

  // Calculate new accepted offers count whenever offers or viewedAcceptedOffers change
  useEffect(() => {
    const acceptedOffers = offers.filter(offer => offer.status === "Accepted");
    const newOffers = acceptedOffers.filter(offer => 
      !viewedAcceptedOffers.some(vo => vo.offerId === offer.id)
    );
    setNewAcceptedOffersCount(newOffers.length);
  }, [offers, viewedAcceptedOffers]);

  return {
    offers,
    viewedAcceptedOffers,
    markAcceptedOfferAsViewed,
    newAcceptedOffersCount
  };
}
