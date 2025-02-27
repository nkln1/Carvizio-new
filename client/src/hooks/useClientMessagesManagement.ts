import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation as SchemaConversation } from "@shared/schema";
import websocketService from "@/lib/websocket";

interface ConversationInfo {
  userId: number;
  userName: string;
  requestId: number;
  offerId?: number;
  sourceTab?: string;
}

// Extend the base conversation type with client-specific fields
interface Conversation extends SchemaConversation {
  requestTitle?: string;
  offerId?: number;
  sourceTab?: string;
}

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

      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    }
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

      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!activeConversation?.requestId && !!activeConversation?.userId
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/client/messages/${activeConversation.requestId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          recipientId: activeConversation.userId,
          requestId: activeConversation.requestId,
          offerId: activeConversation.offerId
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Invalidate queries to refresh the messages
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/client/messages', activeConversation.requestId, activeConversation.userId]
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/client/conversations'] });

      // Handle WebSocket message
      websocketService.ensureConnection().then(() => {
        websocketService.sendMessage('new_message', {
          recipientId: activeConversation.userId,
          requestId: activeConversation.requestId,
          content
        });
      }).catch(err => {
        console.error('WebSocket error:', err);
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite mesajul. Încercați din nou.",
      });
    }
  }, [activeConversation, queryClient, toast]);

  // Load request and offer details
  const loadRequestDetails = useCallback(async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load request details');
      return response.json();
    } catch (error) {
      console.error('Error loading request details:', error);
      throw error;
    }
  }, []);

  const loadOfferDetails = useCallback(async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/client/offers/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load offer details');
      return response.json();
    } catch (error) {
      console.error('Error loading offer details:', error);
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