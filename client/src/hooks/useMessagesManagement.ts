import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";
import NotificationHelper from '@/lib/notifications';
import { fetchWithCsrf } from "@/lib/csrfToken";

const MESSAGES_STALE_TIME = 1000 * 5;
const UNREAD_CONVERSATIONS_STALE_TIME = 1000 * 10;
const CONVERSATIONS_STALE_TIME = 1000 * 10;

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

  const baseEndpoint = isClient ? '/api/client' : '/api/service';
  const startIndex = (currentPage - 1) * itemsPerPage;

  const totalPages = <T extends Array<unknown>>(items: T): number => {
    return Math.ceil(items.length / itemsPerPage);
  };

  const markConversationAsRead = useCallback(async (requestId: number, userId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      await fetchWithCsrf(`${baseEndpoint}/conversations/${requestId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      await queryClient.invalidateQueries({ queryKey: [`${baseEndpoint}/messages`] });
      await queryClient.invalidateQueries({ queryKey: [`${baseEndpoint}/conversations`] });
      await queryClient.invalidateQueries({ 
        queryKey: ["unreadConversationsCount"],
        exact: true
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [baseEndpoint, queryClient]);

  useEffect(() => {
    if (initialConversation && initialConversation.userId && initialConversation.requestId) {
      setActiveConversation({
        userId: initialConversation.userId,
        userName: initialConversation.userName || 'Unknown User',
        requestId: initialConversation.requestId,
        offerId: initialConversation.offerId,
        serviceProviderUsername: initialConversation.serviceProviderUsername
      });

      markConversationAsRead(initialConversation.requestId, initialConversation.userId);
    }
  }, [initialConversation, markConversationAsRead]);

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: [`${baseEndpoint}/messages`, activeConversation?.requestId],
    queryFn: async () => {
      if (!activeConversation?.requestId) return [];

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/messages/${activeConversation.requestId}`, {
        method: 'GET',
        credentials: 'include',
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

  const { data: allConversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: [`${baseEndpoint}/conversations`],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${baseEndpoint}/conversations`, {
        method: 'GET',
        credentials: 'include',
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

  const getPaginatedConversations = <T extends Array<unknown>>(conversations: T): T => {
    return conversations.slice(startIndex, startIndex + itemsPerPage) as T;
  };

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

      try {
        console.log('[Message] Reîmprospătăm token-ul CSRF înainte de a trimite mesajul...');
        await import('../lib/csrfToken').then(({ refreshCsrfToken }) => refreshCsrfToken());
      } catch (error) {
        console.error('[Message] Eroare la reîmprospătarea tokenului CSRF:', error);
      }

      console.log('[Message] Trimitem mesajul la:', `${baseEndpoint}/messages/send`);
      const response = await fetchWithCsrf(`${baseEndpoint}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(messagePayload)
      });

      console.log('[Message] Răspuns primit:', response.status);

      if (!response.ok) {
        let errorMessage = "Eroare la trimiterea mesajului";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          try {
            errorMessage = await response.text() || errorMessage;
          } catch {
          }
        }

        console.error('[Message] Error sending message:', {
          status: response.status,
          message: errorMessage
        });

        throw new Error(`Failed to send message: ${errorMessage}`);
      }

      const newMessage = await response.json();
      const messageId = newMessage.id;

      queryClient.setQueryData(
        [`${baseEndpoint}/messages`, activeConversation.requestId],
        (old: Message[] | undefined) => {
          if (!old) return [newMessage];

          const messageExists = old.some(msg => msg.id === messageId);
          if (messageExists) return old;

          const currentMessages = [...old];
          currentMessages.push(newMessage);
          return currentMessages;
        }
      );

      await queryClient.invalidateQueries({
        queryKey: [`${baseEndpoint}/conversations`]
      });

      return newMessage;
    } catch (error) {
      console.error('[Message] Error in sendMessage:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error instanceof Error 
          ? error.message 
          : "Nu s-a putut trimite mesajul. Încercați din nou."
      });
      throw error;
    }
  }, [activeConversation, baseEndpoint, queryClient, isClient, toast]);

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