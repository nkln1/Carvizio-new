import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import type { Request } from "@/types/dashboard";

// Cache time constants
const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds

export function useRequestsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimized requests query with proper caching
  const { data: requests = [], isLoading, error } = useQuery<Request[]>({
    queryKey: ['/api/service/requests'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      return response.json();
    },
    staleTime: STALE_TIME,
    cacheTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Optimized handler for request cancellation
  const handleCancelRequest = async (requestId: number) => {
    try {
      await apiRequest('PATCH', `/api/requests/${requestId}`, {
        body: { status: "Anulat" }
      });

      // Optimistic update
      queryClient.setQueryData(['/api/service/requests'], (oldData: Request[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(request => 
          request.id === requestId 
            ? { ...request, status: "Anulat" }
            : request
        );
      });

      toast({
        title: "Success",
        description: "Cererea a fost anulată cu succes.",
      });

      return true;
    } catch (error) {
      console.error('Error canceling request:', error);

      // Invalidate cache on error to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/service/requests'] });

      toast({
        variant: "destructive",
        title: "Error",
        description: "Nu s-a putut anula cererea. Încercați din nou.",
      });
      return false;
    }
  };

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare la încărcarea cererilor",
        description: "A apărut o eroare la încărcarea cererilor. Vă rugăm să încercați din nou.",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const filterRequests = () => {
    if (!searchTerm) return requests;

    const searchLower = searchTerm.toLowerCase();
    return requests.filter(request =>
      request.title.toLowerCase().includes(searchLower) ||
      request.description.toLowerCase().includes(searchLower) ||
      request.cities?.join(", ").toLowerCase().includes(searchLower) ||
      request.county?.toLowerCase().includes(searchLower)
    );
  };

  const filteredRequests = filterRequests();
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  return {
    requests: paginatedRequests,
    totalRequests: filteredRequests.length,
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
    handleCancelRequest,
  };
}