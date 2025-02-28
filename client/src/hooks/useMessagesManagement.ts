import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Cache time constants
const MESSAGES_STALE_TIME = 1000 * 15; // 15 seconds
const CONVERSATIONS_STALE_TIME = 1000 * 30; // 30 seconds

interface ConversationInfo {
  userId: number;
  userName: string;
  requestId: number;
  offerId?: number;
  sourceTab?: string;
}

export function useMessagesManagement(initialConversation: ConversationInfo | null, isClient: boolean = false) {
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define base endpoints based on user type
  const baseEndpoint = isClient ? '/api/client' : '/api/service';

  // Messages query
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`${baseEndpoint}/messages`, activeConversation?.requestId],
    enabled: !!activeConversation,
    queryFn: async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No authentication token available');

        const response = await fetch(`${baseEndpoint}/messages/${activeConversation?.requestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error("Error response from messages endpoint:", {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          throw new Error(`Failed to fetch messages: ${response.status} - ${errorData}`);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
    },
    staleTime: MESSAGES_STALE_TIME,
    refetchInterval: MESSAGES_STALE_TIME,
    refetchOnWindowFocus: true
  });

  // Conversations query
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: [`${baseEndpoint}/conversations`],
    queryFn: async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No authentication token available');

        const response = await fetch(`${baseEndpoint}/conversations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error("Error response from conversations endpoint:", {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          throw new Error(`Failed to fetch conversations: ${response.status} - ${errorData}`);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }
    },
    staleTime: CONVERSATIONS_STALE_TIME,
    refetchInterval: CONVERSATIONS_STALE_TIME,
    refetchOnWindowFocus: true
  });

  const sendMessage = async (message: string) => {
    if (!activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const messagePayload = {
        content: message,
        receiverId: activeConversation.userId,
        requestId: activeConversation.requestId,
        offerId: activeConversation.offerId
      };

      const response = await fetch(`${baseEndpoint}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messagePayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Error response from send message endpoint:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          requestData: messagePayload
        });
        throw new Error(`Failed to send message: ${response.status} - ${errorData}`);
      }

      const newMessage = await response.json();

      // Update the messages cache optimistically
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
  };

  const loadRequestDetails = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch request details:', error);
        throw new Error(`Failed to fetch request details: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in loadRequestDetails:', error);
      throw error;
    }
  };

  const loadOfferDetails = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/offers/request/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch offer details:', error);
        throw new Error(`Failed to fetch offer details: ${response.status}`);
      }

      const offers = await response.json();
      return Array.isArray(offers) && offers.length > 0 ? offers[0] : null;
    } catch (error) {
      console.error('Error in loadOfferDetails:', error);
      throw error;
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