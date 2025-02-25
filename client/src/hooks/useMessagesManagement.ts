import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Cache time constants
const MESSAGES_STALE_TIME = 1000 * 15; // 15 seconds
const CONVERSATIONS_STALE_TIME = 1000 * 30; // 30 seconds

export function useMessagesManagement(initialConversation: {
  userId: number;
  userName: string;
  requestId: number;
} | null) {
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Messages query
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/service/messages', activeConversation?.userId],
    enabled: !!activeConversation,
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/messages/${activeConversation?.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' // Added content-type header
        }
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => null); // Try to get error text
        throw new Error(`Failed to fetch messages: ${response.status} - ${errorData}`);
      }

      return response.json();
    },
    staleTime: MESSAGES_STALE_TIME,
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Conversations query
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/service/conversations'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => null); // Try to get error text
        throw new Error(`Failed to fetch conversations: ${response.status} - ${errorData}`);
      }

      return response.json();
    },
    staleTime: CONVERSATIONS_STALE_TIME,
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false
  });

  const sendMessage = async (message: string) => {
    if (!activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // First try to get the current user's service provider ID
      const userResponse = await fetch('/api/service/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.text().catch(() => null);
        throw new Error(`Failed to get user details: ${userResponse.status} - ${errorData}`);
      }

      const userData = await userResponse.json();
      const serviceProviderId = userData.id;

      // Now send the message
      const response = await fetch('/api/service/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: message,
          senderId: serviceProviderId,
          receiverId: activeConversation.userId,
          requestId: activeConversation.requestId,
          senderRole: 'service',
          receiverRole: 'client'
        })
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => null); // Try to get error text
        const errorMessage = errorData || `Failed to send message: ${response.status}`;
        throw new Error(errorMessage);
      }

      const newMessage = await response.json();

      // Update messages cache
      queryClient.setQueryData(
        ['/api/service/messages', activeConversation.userId],
        (old: Message[] | undefined) => [...(old || []), newMessage]
      );

      // Invalidate conversations to update last message
      await queryClient.invalidateQueries({
        queryKey: ['/api/service/conversations']
      });

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut trimite mesajul. Încercați din nou.",
      });
      throw error;
    }
  };

  const loadRequestDetails = async (requestId: number) => {
    try {
      const response = await apiRequest('GET', `/api/service/requests/${requestId}`);
      return response;
    } catch (error) {
      console.error('Error loading request details:', error);
      return null;
    }
  };

  const loadOfferDetails = async (requestId: number) => {
    try {
      const response = await apiRequest('GET', `/api/service/offers/request/${requestId}`);
      return response;
    } catch (error) {
      console.error('Error loading offer details:', error);
      return null;
    }
  };

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