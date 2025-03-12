
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: ["unreadConversationsCount"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return 0;

      try {
        const response = await fetch("/api/messages/unread/conversations", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error("Failed to fetch unread conversations count", response.status);
          return 0;
        }

        const data = await response.json();
        console.log("Unread conversations count data:", data);
        return data.conversationsCount || 0;
      } catch (error) {
        console.error("Error fetching unread conversations:", error);
        return 0;
      }
    },
    refetchInterval: 15000, // Refetch every 15 seconds pentru actualizări mai frecvente
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 3, // Retry 3 times if the query fails
  });
}
