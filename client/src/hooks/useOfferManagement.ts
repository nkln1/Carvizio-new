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
    queryKey: ["/api/client/offers"]
  });

  // Fetch viewed offers
  const { data: viewedOffers = [] } = useQuery<ViewedOffer[]>({
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

      // First update the database
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

      const result = await response.json();
      console.log('Server response:', result);

      // Verify the server actually updated the record
      if (!result || !result.id) {
        throw new Error('Invalid server response');
      }

      console.log('Successfully marked offer as viewed:', offerId);

      // Then update the local cache
      await queryClient.invalidateQueries({ queryKey: ["/api/client/viewed-offers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/client/offers"] });

      // Force immediate refetch to update UI
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/client/viewed-offers"] }),
        queryClient.refetchQueries({ queryKey: ["/api/client/offers"] })
      ]);

      // Reduce the new offers count
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
    return offers.filter(offer => !viewedOffers.some(vo => vo.offerId === offer.id)).length;
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