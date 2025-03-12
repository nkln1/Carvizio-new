
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: ["unreadConversationsCount"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return 0;

      const response = await fetch("/api/messages/unread/conversations", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch unread conversations count");
      }

      const data = await response.json();
      return data.count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
