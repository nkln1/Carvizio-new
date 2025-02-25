import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";

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
    queryKey: ['/api/messages/service/conversation', activeConversation?.userId],
    enabled: !!activeConversation?.userId,
    queryFn: async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No authentication token available');

        console.log('Fetching messages for user:', activeConversation?.userId);
        const response = await fetch(`/api/messages/service/conversation/${activeConversation?.userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Messages response error:', errorText);
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();
        console.log('Fetched messages:', data);
        return data;
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    staleTime: MESSAGES_STALE_TIME,
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Conversations query
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/messages/service/conversations'],
    queryFn: async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No authentication token available');

        console.log('Fetching conversations');
        const response = await fetch('/api/messages/service/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Conversations response error:', errorText);
          throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
        console.log('Fetched conversations:', data);
        return data;
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
    },
    staleTime: CONVERSATIONS_STALE_TIME,
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false
  });

  const sendMessage = async (content: string) => {
    if (!activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // Get service provider ID
      const meResponse = await fetch('/api/service/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!meResponse.ok) {
        throw new Error('Failed to get service provider details');
      }

      const meData = await meResponse.json();

      console.log('Sending message to user:', activeConversation.userId);
      const response = await fetch('/api/messages/service/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          senderId: meData.id,
          receiverId: activeConversation.userId,
          content: content,
          requestId: activeConversation.requestId,
          senderRole: 'service_provider',
          receiverRole: 'client'
        })
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (error) {
        console.error('Invalid JSON response:', await response.text());
        throw new Error('Server returned invalid response format');
      }

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to send message');
      }

      console.log('Message sent successfully:', responseData);

      // Update messages cache with new message
      queryClient.setQueryData(
        ['/api/messages/service/conversation', activeConversation.userId],
        (old: Message[] | undefined) => [...(old || []), responseData]
      );

      // Invalidate conversations to update last message
      await queryClient.invalidateQueries({
        queryKey: ['/api/messages/service/conversations']
      });

      return responseData;
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
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load request details');
      }

      return response.json();
    } catch (error) {
      console.error('Error loading request details:', error);
      return null;
    }
  };

  const loadOfferDetails = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/offers/request/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load offer details');
      }

      return response.json();
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