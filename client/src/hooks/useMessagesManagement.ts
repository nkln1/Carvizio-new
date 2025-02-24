import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useMessagesManagement(initialConversation: {
  userId: number;
  userName: string;
  requestId: number;
} | null) {
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/messages', activeConversation?.userId],
    enabled: !!activeConversation,
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      console.log('Fetching messages for user:', activeConversation?.userId);
      const response = await fetch(`/api/messages/${activeConversation?.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Error fetching messages:', response.status, response.statusText);
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      console.log('Received messages:', data);
      return data;
    }
  });

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      console.log('Fetching conversations');
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Error fetching conversations:', response.status, response.statusText);
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      console.log('Received conversations:', data);
      return data;
    }
  });

  const sendMessage = async (content: string) => {
    if (!activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      console.log('Sending message:', { content, recipientId: activeConversation.userId });
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
        console.error('Error sending message:', response.status, response.statusText);
        throw new Error('Failed to send message');
      }

      console.log('Message sent successfully');
      await queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });

    } catch (error) {
      console.error('Error sending message:', error);
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
      console.log('Loading request details for:', requestId);
      const response = await apiRequest('GET', `/api/requests/${requestId}`);
      console.log('Request details:', response);
      return response;
    } catch (error) {
      console.error('Error loading request details:', error);
      return null;
    }
  };

  const loadOfferDetails = async (requestId: number) => {
    try {
      console.log('Loading offer details for request:', requestId);
      const response = await apiRequest('GET', `/api/offers/request/${requestId}`);
      console.log('Offer details:', response);
      return response;
    } catch (error) {
      console.error('Error loading offer details:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('Active conversation changed:', activeConversation);
  }, [activeConversation]);

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