import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import type { AcceptedOfferWithClient } from "@shared/schema";

export function useAcceptedOffers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading, error } = useQuery<AcceptedOfferWithClient[]>({
    queryKey: ['/api/service/offers'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/offers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      return response.json();
    }
  });

  const handleCancelOffer = async (offerId: number) => {
    try {
      await apiRequest(`/api/client/offers/${offerId}/cancel`, {
        method: 'POST'
      });

      queryClient.invalidateQueries({ queryKey: ['/api/service/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/service/sent-offers'] });

      toast({
        title: "Ofertă mutată în așteptare",
        description: "Oferta a fost anulată și mutată în tab-ul 'Oferte în așteptare'.",
      });

      return true;
    } catch (error) {
      console.error('Error canceling offer:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "A apărut o eroare la anularea ofertei. Vă rugăm să încercați din nou.",
      });
      return false;
    }
  };

  const filterOffers = (offers: AcceptedOfferWithClient[]) => {
    const acceptedOffers = offers.filter(o => o.status.toLowerCase() === "accepted");
    if (!searchTerm) return acceptedOffers;

    const searchLower = searchTerm.toLowerCase();
    return acceptedOffers.filter(offer =>
      offer.title.toLowerCase().includes(searchLower) ||
      offer.details.toLowerCase().includes(searchLower) ||
      offer.price.toString().includes(searchLower) ||
      offer.requestTitle?.toLowerCase().includes(searchLower) ||
      offer.requestDescription?.toLowerCase().includes(searchLower) ||
      offer.clientName?.toLowerCase().includes(searchLower)
    );
  };

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare la încărcarea ofertelor",
        description: "A apărut o eroare la încărcarea ofertelor. Vă rugăm să încercați din nou.",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const filteredOffers = filterOffers(offers);
  const totalPages = Math.ceil(filteredOffers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOffers = filteredOffers.slice(startIndex, startIndex + itemsPerPage);

  return {
    offers: paginatedOffers,
    totalOffers: filteredOffers.length,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    startIndex,
    handleCancelOffer,
  };
}
