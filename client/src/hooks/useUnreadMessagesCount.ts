
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
          },
          // Adăugăm un parametru unic pentru a evita cache-ul browserului
          cache: 'no-store'
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
    refetchInterval: 30000, // Refetch la 30 secunde (redus din 8 secunde)
    staleTime: 15000, // Consideră data stale după 15 secunde (crescut din 3 secunde)
    retry: 2, // Retry 2 times if the query fails
    refetchOnWindowFocus: true, // Reîncarcă când fereastra primește focus
    refetchOnMount: true, // Reîncarcă când componenta este montată
  });
}
