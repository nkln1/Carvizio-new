import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";
import websocketService from "@/lib/websocket";

interface ConversationInfo {
  userId: number;
  userName: string;
  requestId: number;
  offerId?: number;
  sourceTab?: string;
}

// Cache time constants
const MESSAGES_STALE_TIME = 1000 * 15; // 15 seconds
const CONVERSATIONS_STALE_TIME = 1000 * 30; // 30 seconds

export function useClientMessagesManagement(initialConversation: ConversationInfo | null = null) {
  const [activeConversation, setActiveConversation] = useState<ConversationInfo | null>(initialConversation);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/client/conversations'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/client/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch conversations:', await response.text());
        throw new Error('Failed to fetch conversations');
      }
      return response.json();
    },
    staleTime: CONVERSATIONS_STALE_TIME,
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false
  });

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/client/messages', activeConversation?.requestId, activeConversation?.userId],
    queryFn: async () => {
      if (!activeConversation?.requestId || !activeConversation?.userId) return [];

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/client/messages/${activeConversation.requestId}/${activeConversation.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch messages:', await response.text());
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    enabled: !!activeConversation?.requestId && !!activeConversation?.userId,
    staleTime: MESSAGES_STALE_TIME,
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // Construiește payload-ul mesajului, incluzând offerId dacă există
      const messagePayload = {
        content,
        receiverId: activeConversation.userId,
        requestId: activeConversation.requestId,
        offerId: activeConversation.offerId // Include offerId dacă există
      };

      const response = await fetch(`/api/client/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messagePayload)
      });

      if (!response.ok) {
        console.error('Failed to send message:', await response.text());
        throw new Error('Failed to send message');
      }

      const newMessage = await response.json();

      // Actualizează cache-ul de mesaje
      queryClient.setQueryData(
        ['/api/client/messages', activeConversation.requestId, activeConversation.userId],
        (old: Message[] | undefined) => [...(old || []), newMessage]
      );

      // Invalidează query-ul pentru conversații pentru a actualiza ultimul mesaj
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/client/conversations']
      });

      // Notificare WebSocket
      try {
        await websocketService.ensureConnection();
        websocketService.send('new_message', {
          recipientId: activeConversation.userId,
          requestId: activeConversation.requestId,
          content
        });
      } catch (wsError) {
        console.error('WebSocket error:', wsError);
      }

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite mesajul. Încercați din nou.",
      });
      throw error;
    }
  }, [activeConversation, queryClient, toast]);

  // Funcție pentru a încărca detaliile cererii
  const loadRequestDetails = useCallback(async (requestId: number) => {
    try {
      console.log('Loading request details for ID:', requestId);

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/client/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch request details:', error);
        throw new Error(`Failed to fetch request details: ${response.status}`);
      }

      const data = await response.json();
      console.log('Request details loaded successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in loadRequestDetails:', error);
      throw error;
    }
  }, []);

  // Funcție pentru a încărca detaliile ofertei
  const loadOfferDetails = useCallback(async (offerId: number) => {
    try {
      console.log('Loading offer details for ID:', offerId);

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/client/offers/${offerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch offer details:', error);
        throw new Error(`Failed to fetch offer details: ${response.status}`);
      }

      const data = await response.json();
      console.log('Offer details loaded successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in loadOfferDetails:', error);
      throw error;
    }
  }, []);

  return {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage,
    loadRequestDetails,
    loadOfferDetails
  };
}