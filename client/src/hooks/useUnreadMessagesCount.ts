
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

// Set pentru a evita duplicatele la afișarea notificărilor pentru mesaje necitite
const processedCountValues = new Set<number>();
let lastCountNotified = 0;

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
        const count = data.conversationsCount || 0;
        
        // Prevenim notificările duplicate pentru același număr de mesaje necitite
        if (count > 0 && count !== lastCountNotified && !processedCountValues.has(count)) {
          console.log(`Actualizare număr conversații necitite: ${count}`);
          
          // Memorăm acest număr pentru a evita notificările duplicate
          processedCountValues.add(count);
          lastCountNotified = count;
          
          // Limităm mărimea setului pentru a evita memory leaks
          if (processedCountValues.size > 100) {
            const idsToRemove = Array.from(processedCountValues).slice(0, 50);
            idsToRemove.forEach(id => processedCountValues.delete(id));
          }
        }
        
        return count;
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
