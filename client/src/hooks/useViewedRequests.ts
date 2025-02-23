import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function useViewedRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch viewed requests
  const { data: viewedRequests = new Set() } = useQuery<Set<number>>({
    queryKey: ["/api/service/viewed-requests"],
    queryFn: async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No authentication token available');

        const response = await fetch('/api/service/viewed-requests', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch viewed requests');
        }

        const data = await response.json();
        return new Set(data.map((request: { requestId: number }) => request.requestId));
      } catch (error) {
        console.error('Error fetching viewed requests:', error);
        toast({
          title: "Error",
          description: "Failed to fetch viewed requests status",
          variant: "destructive",
        });
        return new Set();
      }
    }
  });

  // Mark request as viewed mutation
  const markRequestAsViewedMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/mark-request-viewed/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark request as viewed');
      }

      return response.json();
    },
    onSuccess: (_, requestId) => {
      // Update the viewedRequests Set in the cache immediately
      queryClient.setQueryData(["/api/service/viewed-requests"], (old: Set<number> = new Set()) => {
        const newSet = new Set(old);
        newSet.add(requestId);
        return newSet;
      });

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/service/viewed-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service/requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while marking the request as viewed.",
        variant: "destructive",
      });
    }
  });

  const markRequestAsViewed = async (requestId: number): Promise<void> => {
    try {
      await markRequestAsViewedMutation.mutateAsync(requestId);
    } catch (error) {
      console.error("Error marking request as viewed:", error);
      throw error;
    }
  };

  return {
    viewedRequests,
    markRequestAsViewed,
  };
}
