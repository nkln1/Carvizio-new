import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";

const MESSAGES_STALE_TIME = 1000 * 5; // 5 seconds
const CONVERSATIONS_STALE_TIME = 1000 * 10; // 10 seconds

export interface ConversationInfo {
  userId: number;
  userName: string;
  requestId: number;
  offerId?: number;
  sourceTab?: string;
}

export function useMessagesManagement(
  initialConversation: ConversationInfo | null = null,
  isClient: boolean = false
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeConversation, setActiveConversation] = useState<ConversationInfo | null>(null);

  // Set initial conversation only once when the component mounts
  useEffect(() => {
    if (initialConversation && initialConversation.userId && initialConversation.requestId) {
      setActiveConversation({
        userId: initialConversation.userId,
        userName: initialConversation.userName || 'Unknown User',
        requestId: initialConversation.requestId,
        offerId: initialConversation.offerId
      });
    }
  }, []);

  // Define base endpoints based on user type
  const baseEndpoint = isClient ? '/api/client' : '/api/service';

  // Messages query
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: [`${baseEndpoint}/messages`, activeConversation?.requestId],
    queryFn: async () => {
      if (!activeConversation?.requestId) return [];

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/messages/${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Error response from messages endpoint:", {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!activeConversation?.requestId,
    staleTime: MESSAGES_STALE_TIME,
    refetchInterval: MESSAGES_STALE_TIME
  });

  // Conversations query
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: [`${baseEndpoint}/conversations`],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Error response from conversations endpoint:", {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      return response.json();
    },
    staleTime: CONVERSATIONS_STALE_TIME,
    refetchInterval: CONVERSATIONS_STALE_TIME
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation) {
      console.error('No active conversation to send message to');
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const messagePayload = {
        content,
        receiverId: activeConversation.userId,
        requestId: activeConversation.requestId,
        offerId: activeConversation.offerId
      };

      console.log('Sending message with payload:', messagePayload);

      const response = await fetch(`${baseEndpoint}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(messagePayload)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage;
        const contentType = response.headers.get("Content-Type") || "";

        try {
          if (contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || 'Unknown error';
          } else {
            errorMessage = await response.text();
          }
        } catch (e) {
          errorMessage = 'Failed to parse error response';
        }

        console.error('Error response details:', {
          status: response.status,
          contentType,
          errorMessage
        });

        throw new Error(`Failed to send message: ${response.status} - ${errorMessage}`);
      }

      const newMessage = await response.json();
      console.log('Message sent successfully:', newMessage);

      // Update messages cache optimistically
      queryClient.setQueryData(
        [`${baseEndpoint}/messages`, activeConversation.requestId],
        (old: Message[] | undefined) => [...(old || []), newMessage]
      );

      // Invalidate conversations to update last message
      await queryClient.invalidateQueries({
        queryKey: [`${baseEndpoint}/conversations`]
      });

      return newMessage;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite mesajul. Încercați din nou.",
      });
      throw error;
    }
  }, [activeConversation, baseEndpoint, queryClient, toast]);

  const loadRequestDetails = useCallback(async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch request details: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in loadRequestDetails:', error);
      throw error;
    }
  }, [baseEndpoint]);

  const loadOfferDetails = useCallback(async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/offers/request/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch offer details: ${response.status}`);
      }

      const offers = await response.json();
      return Array.isArray(offers) && offers.length > 0 ? offers[0] : null;
    } catch (error) {
      console.error('Error in loadOfferDetails:', error);
      throw error;
    }
  }, [baseEndpoint]);

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