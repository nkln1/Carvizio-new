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
    refetchInterval: 30000, // Refetch every 30 seconds
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
        return data;
      } catch (error) {
        console.error('Error fetching viewed offers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch viewed offers status",
          variant: "destructive",
        });
        return [];
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

      console.log('Mark offer response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to mark offer as viewed: ${errorText}`);
      }

      const newViewedOffer: ViewedOffer = await response.json();
      console.log('Server response for marking offer:', newViewedOffer);

      // Update the cache with the new viewed offer from the server response
      queryClient.setQueryData<ViewedOffer[]>(["/api/client/viewed-offers"], (old = []) => {
        // Remove any existing entry for this offer and add the new one
        return [...old.filter(vo => vo.offerId !== offerId), newViewedOffer];
      });

      // Invalidate and refetch to ensure data consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/client/viewed-offers"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/client/offers"] })
      ]);

      // Update the new offers count
      setNewOffersCount(prev => Math.max(0, prev - 1));

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
      throw error;
    }
  };

  const getNewOffersCount = () => {
    const newOffers = offers.filter(offer => 
      !viewedOffers.some(vo => vo.offerId === offer.id)
    );
    console.log('New offers count:', newOffers.length, 'Total offers:', offers.length, 'Viewed offers:', viewedOffers.length);
    return newOffers.length;
  };

  useEffect(() => {
    const count = getNewOffersCount();
    console.log('Updating new offers count:', count);
    setNewOffersCount(count);
  }, [offers, viewedOffers]);

  return {
    offers,
    viewedOffers,
    markOfferAsViewed,
    newOffersCount,
    setNewOffersCount,
  };
}