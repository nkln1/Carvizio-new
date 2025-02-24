import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import type { Request } from "@/types/dashboard";

export function useRequestsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    }
  });

  const handleCancelRequest = async (requestId: number) => {
    try {
      await apiRequest(`/api/requests/${requestId}`, {
        method: 'PATCH',
        body: { status: "Anulat" }
      });

      queryClient.invalidateQueries({ queryKey: ['/api/service/requests'] });

      toast({
        title: "Success",
        description: "Cererea a fost anulată cu succes.",
      });

      return true;
    } catch (error) {
      console.error('Error canceling request:', error);
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
