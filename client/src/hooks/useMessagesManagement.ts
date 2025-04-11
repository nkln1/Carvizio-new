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
  const [activeConversation, setActiveConversation] = useState<ConversationInfo | null>(null);
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
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      await fetch(`${baseEndpoint}/conversations/${requestId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

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
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!activeConversation?.requestId,
    staleTime: MESSAGES_STALE_TIME,
    refetchInterval: MESSAGES_STALE_TIME
  });

  // Conversations query
  const { data: allConversations = [], isLoading: isLoadingConversations } = useQuery({
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
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      return response.json();
    },
    staleTime: CONVERSATIONS_STALE_TIME,
    refetchInterval: CONVERSATIONS_STALE_TIME
  });

  // Get paginated conversations for filtered results
  const getPaginatedConversations = (conversations: any[]) => {
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
  }, [activeConversation, baseEndpoint, queryClient, isClient, toast]);

  // Check for new messages in the WebSocket service
  useEffect(() => {
    // If this is a client dashboard, we can set up a subscription for new messages
    if (isClient && auth.currentUser) {
      const handleNewMessage = async (data: any) => {
        if (data.type === 'NEW_MESSAGE' && data.payload) {
          const { payload } = data;
          
          // Only show notification if the receiver is the client
          if (payload.receiverRole === 'client') {
            console.log('New message received via WebSocket for client:', payload);
            
            try {
              // Play notification sound
              NotificationHelper.playNotificationSound('message');
              
              // Show browser notification if allowed
              NotificationHelper.showBrowserNotification(
                'Mesaj nou', 
                payload.content && payload.content.length > 50 
                  ? `${payload.content.substring(0, 50)}...` 
                  : payload.content || 'Ați primit un mesaj nou'
              );
              
              // Refresh messages and conversation data
              queryClient.invalidateQueries({ queryKey: [`${baseEndpoint}/messages`] });
              queryClient.invalidateQueries({ queryKey: [`${baseEndpoint}/conversations`] });
              queryClient.invalidateQueries({ queryKey: ["unreadConversationsCount"] });
              
              // Show toast notification
              toast({
                title: "Mesaj nou",
                description: "Ați primit un mesaj nou",
              });
            } catch (err) {
              console.error('Error processing new message notification:', err);
            }
          }
        }
      };
      
      // Add WebSocket handler for client side
      if (window.addWebSocketMessageHandler) {
        const removeHandler = window.addWebSocketMessageHandler(handleNewMessage);
        return () => {
          if (removeHandler) removeHandler();
        };
      }
    }
  }, [isClient, baseEndpoint, queryClient, toast]);

  return {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage,
    markConversationAsRead,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages: totalConversationPages,
    totalItems: allConversations.length,
    startIndex
  };
}