import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";

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
  const [activeConversation, setActiveConversation] = useState<ConversationInfo | null>(initialConversation);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isClientContext = isClient; // Added for clarity

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
          let errorData;
          const contentType = response.headers.get("Content-Type") || "";
          if (contentType.includes("application/json")) {
            errorData = await response.json();
          } else {
            errorData = await response.text();
          }
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

  const sendMessage = async (
    content: string, 
    receiverId?: number, 
    receiverRole?: string, 
    requestId?: number, 
    offerId?: number
  ) => {
    if (!content.trim()) {
      return;
    }

    // Use provided parameters or fall back to activeConversation
    const targetReceiverId = receiverId || activeConversation?.userId;
    const targetReceiverRole = receiverRole || (isClientContext ? "service" : "client");
    const targetRequestId = requestId || activeConversation?.requestId;
    const targetOfferId = offerId || activeConversation?.offerId;

    if (!targetReceiverId || !targetRequestId) {
      console.error("Missing required data for sending message");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send message - missing conversation data.",
      });
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No authentication token");

      console.log("Sending message:", {
        content,
        receiverId: targetReceiverId,
        receiverRole: targetReceiverRole,
        requestId: targetRequestId,
        offerId: targetOfferId
      });

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          receiverId: targetReceiverId,
          receiverRole: targetReceiverRole,
          requestId: targetRequestId,
          offerId: targetOfferId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${errorText}`);
      }

      const newMessage = await response.json();
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ 
        queryKey: ["/api/messages", targetRequestId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: isClientContext ? ["/api/client/conversations"] : ["/api/service/conversations"] 
      });
    } catch (error) {
      console.error("Error in sendMessage:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
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