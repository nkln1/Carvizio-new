import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";
import NotificationHelper from '@/lib/notifications';

const MESSAGES_STALE_TIME = 1000 * 5; // 5 seconds
const UNREAD_CONVERSATIONS_STALE_TIME = 1000 * 10; // 10 seconds
const CONVERSATIONS_STALE_TIME = 1000 * 10; // 10 seconds

export interface ConversationInfo {
  userId: number;
  userName: string;
  requestId: number;
  offerId?: number;
  sourceTab?: string;
  serviceProviderUsername?: string;
}

export function useMessagesManagement(
  initialConversation: ConversationInfo | null = null,
  isClient: boolean = false
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeConversation, setActiveConversation] = useState<ConversationInfo | null>(initialConversation);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Define base endpoints based on user type
  const baseEndpoint = isClient ? '/api/client' : '/api/service';

  // Calculate pagination values
  const startIndex = (currentPage - 1) * itemsPerPage;
  const totalPages = items => Math.ceil(items.length / itemsPerPage);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (requestId: number, userId: number) => {
    try {
      console.log("Marking conversation as read:", { requestId, userId });
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/conversations/${requestId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        console.error("Error marking conversation as read:", {
          status: response.status,
          statusText: response.statusText
        });
        const errorText = await response.text();
        console.error("Error details:", errorText);
      } else {
        console.log("Successfully marked conversation as read:", { requestId, userId });
      }

      // Invalidate queries to update UI
      await queryClient.invalidateQueries({ queryKey: [`${baseEndpoint}/messages`] });
      await queryClient.invalidateQueries({ queryKey: [`${baseEndpoint}/conversations`] });

      // Ensure invalidation for unread messages count
      await queryClient.invalidateQueries({ 
        queryKey: ["unreadConversationsCount"],
        exact: true
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [baseEndpoint, queryClient]);

  // Set initial conversation and mark as read if needed
  useEffect(() => {
    if (initialConversation && initialConversation.userId && initialConversation.requestId) {
      console.log("Setting active conversation from initial:", initialConversation);
      setActiveConversation({
        userId: initialConversation.userId,
        userName: initialConversation.userName || 'Unknown User',
        requestId: initialConversation.requestId,
        offerId: initialConversation.offerId,
        serviceProviderUsername: initialConversation.serviceProviderUsername
      });

      // Mark as read when conversation is opened
      markConversationAsRead(initialConversation.requestId, initialConversation.userId);
    }
  }, [initialConversation, markConversationAsRead]);

  // Messages query
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: [`${baseEndpoint}/messages`, activeConversation?.requestId],
    queryFn: async () => {
      if (!activeConversation?.requestId) {
        console.log("No active conversation, returning empty messages array");
        return [];
      }

      console.log("Fetching messages for conversation:", {
        requestId: activeConversation.requestId,
        userId: activeConversation.userId
      });

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/messages/${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error fetching messages:", {
          status: response.status,
          errorText
        });
        throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Fetched ${data.length} messages for conversation`, {
        requestId: activeConversation.requestId
      });
      return data;
    },
    enabled: !!activeConversation?.requestId,
    staleTime: MESSAGES_STALE_TIME,
    refetchInterval: MESSAGES_STALE_TIME
  });

  // Force refetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation?.requestId) {
      refetchMessages();
    }
  }, [activeConversation?.requestId, refetchMessages]);

  // Conversations query
  const { 
    data: allConversations = [], 
    isLoading: isLoadingConversations,
    refetch: refetchConversations 
  } = useQuery({
    queryKey: [`${baseEndpoint}/conversations`],
    queryFn: async () => {
      console.log("Fetching conversations");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error fetching conversations:", {
          status: response.status,
          errorText
        });
        throw new Error(`Failed to fetch conversations: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Fetched ${data.length} conversations`);
      return data;
    },
    staleTime: CONVERSATIONS_STALE_TIME,
    refetchInterval: CONVERSATIONS_STALE_TIME
  });

  // Get paginated conversations for filtered results
  const getPaginatedConversations = (conversations: any[]) => {
    if (!Array.isArray(conversations)) {
      console.error("conversations is not an array:", conversations);
      return [];
    }
    return conversations.slice(startIndex, startIndex + itemsPerPage);
  };

  // Get paginated conversations
  const conversations = getPaginatedConversations(allConversations);
  const totalConversationPages = totalPages(allConversations);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation) {
      console.error('No active conversation to send message to');
      return;
    }

    try {
      console.log("Sending message:", {
        content,
        receiverId: activeConversation.userId,
        requestId: activeConversation.requestId
      });
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const messagePayload = {
        content,
        receiverId: activeConversation.userId,
        receiverRole: isClient ? 'service' : 'client',
        requestId: activeConversation.requestId,
        offerId: activeConversation.offerId
      };

      const response = await fetch(`${baseEndpoint}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(messagePayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error sending message:', {
          status: response.status,
          body: errorText
        });
        throw new Error(`Failed to send message: ${errorText}`);
      }

      const newMessage = await response.json();
      console.log("Message sent successfully:", newMessage);

      // Update messages cache with proper ordering
      queryClient.setQueryData(
        [`${baseEndpoint}/messages`, activeConversation.requestId],
        (old: Message[] | undefined) => {
          const currentMessages = [...(old || [])];
          currentMessages.push(newMessage);
          return currentMessages;
        }
      );

      // Invalidate conversations to update last message
      await queryClient.invalidateQueries({
        queryKey: [`${baseEndpoint}/conversations`]
      });

      // Manually trigger a refetch of messages
      refetchMessages();

      return newMessage;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite mesajul. Încercați din nou."
      });
      throw error;
    }
  }, [activeConversation, baseEndpoint, queryClient, isClient, toast, refetchMessages]);

  return {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage,
    markConversationAsRead,
    refetchMessages,
    refetchConversations,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages: totalConversationPages,
    totalItems: allConversations.length,
    startIndex
  };
}