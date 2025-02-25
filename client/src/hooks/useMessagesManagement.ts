import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Cache time constants
const MESSAGES_CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const MESSAGES_STALE_TIME = 1000 * 15; // 15 seconds
const CONVERSATIONS_CACHE_TIME = 1000 * 60 * 10; // 10 minutes
const CONVERSATIONS_STALE_TIME = 1000 * 30; // 30 seconds

export function useMessagesManagement(initialConversation: {
  userId: number;
  userName: string;
  requestId: number;
} | null) {
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimized messages query
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/messages', activeConversation?.userId],
    enabled: !!activeConversation,
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/messages/${activeConversation?.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      return response.json();
    },
    staleTime: MESSAGES_STALE_TIME,
    cacheTime: MESSAGES_CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Optimized conversations query
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      return response.json();
    },
    staleTime: CONVERSATIONS_STALE_TIME,
    cacheTime: CONVERSATIONS_CACHE_TIME,
    refetchOnWindowFocus: false
  });

  const sendMessage = async (content: string) => {
    if (!activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // Optimistic update for messages
      const optimisticMessage = {
        id: Date.now(),
        content,
        senderId: activeConversation.userId,
        recipientId: activeConversation.userId,
        createdAt: new Date().toISOString(),
        requestId: activeConversation.requestId,
        isOptimistic: true
      };

      queryClient.setQueryData(['/api/messages', activeConversation.userId], 
        (old: Message[] | undefined) => [...(old || []), optimisticMessage]);

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: activeConversation.userId,
          content,
          requestId: activeConversation.requestId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Only invalidate if the optimistic update wasn't sufficient
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/messages', activeConversation.userId]
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations']
      });

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic update on error
      queryClient.setQueryData(['/api/messages', activeConversation.userId], 
        (old: Message[] | undefined) => 
          old?.filter(msg => !(msg as any).isOptimistic) || []);

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
      const response = await apiRequest('GET', `/api/requests/${requestId}`);
      return response;
    } catch (error) {
      console.error('Error loading request details:', error);
      return null;
    }
  };

  const loadOfferDetails = async (requestId: number) => {
    try {
      const response = await apiRequest('GET', `/api/offers/request/${requestId}`);
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