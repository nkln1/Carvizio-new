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
      console.log('Setting initial conversation:', initialConversation);
      setActiveConversation({
        userId: initialConversation.userId,
        userName: initialConversation.userName || 'Unknown User',
        requestId: initialConversation.requestId,
        offerId: initialConversation.offerId
      });
    }
  }, [initialConversation]);

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
        receiverRole: isClient ? 'service' : 'client',
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

      if (!response.ok) {
        const errorMessage = await response.text();
        console.error('Error response:', {
          status: response.status,
          body: errorMessage
        });
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const newMessage = await response.json();

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
      throw error;
    }
  }, [activeConversation, baseEndpoint, queryClient, isClient]);

  return {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage
  };
}