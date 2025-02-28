
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { InitialConversationProps } from "@/components/dashboard/MessagesTab";

export function useMessagesManagement(
  initialConversation: InitialConversationProps | null = null,
  isClientContext: boolean = false
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeConversation, setActiveConversation] = useState<{
    userId: number;
    userName: string;
    requestId: number;
    offerId?: number;
    sourceTab?: string;
  } | null>(initialConversation);
  const [messages, setMessages] = useState<any[]>([]);

  // Query for fetching conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    refetch: refetchConversations
  } = useQuery({
    queryKey: [isClientContext ? "/api/client/conversations" : "/api/service/conversations"],
    enabled: true,
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10 seconds
  });

  // Query for fetching messages for active conversation
  const {
    data: fetchedMessages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ["/api/messages", activeConversation?.requestId],
    queryFn: async () => {
      try {
        if (!activeConversation?.requestId) return [];

        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Authentication required");

        const endpoint = isClientContext 
          ? `/api/messages/${activeConversation.requestId}`
          : `/api/service/messages/${activeConversation.requestId}`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        return response.json();
      } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
    },
    enabled: !!activeConversation?.requestId,
    refetchInterval: 5000, // Poll every 5 seconds
    refetchOnWindowFocus: true,
  });

  // Update messages state when fetched messages change
  useEffect(() => {
    if (fetchedMessages && fetchedMessages.length > 0) {
      setMessages(fetchedMessages);
    } else {
      setMessages([]);
    }
  }, [fetchedMessages]);

  // Initialize with any provided initial conversation
  useEffect(() => {
    if (initialConversation && initialConversation.userId && initialConversation.requestId) {
      setActiveConversation({
        userId: initialConversation.userId,
        userName: initialConversation.userName || "User",
        requestId: initialConversation.requestId,
        offerId: initialConversation.offerId,
      });
    }
  }, [initialConversation]);

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: async (data: {
      content: string;
      receiverId: number;
      receiverRole: string;
      requestId: number;
      offerId?: number;
    }) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Authentication required");

      console.log("Sending message:", data);

      const endpoint = isClientContext ? "/api/messages" : "/api/service/messages/send";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: (newMessage) => {
      // Optimistically update the messages array
      setMessages(prev => [...prev, newMessage]);
      
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["/api/messages", activeConversation?.requestId] });
      queryClient.invalidateQueries({ 
        queryKey: [isClientContext ? "/api/client/conversations" : "/api/service/conversations"] 
      });
    },
    onError: (error) => {
      console.error("Error in sendMessage:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    },
  });

  // Function to send a message
  const sendMessage = useCallback(
    async (
      content: string,
      receiverId: number,
      receiverRole: string,
      requestId: number,
      offerId?: number
    ) => {
      if (!content.trim()) return;

      try {
        await sendMessageMutation.mutateAsync({
          content,
          receiverId,
          receiverRole,
          requestId,
          offerId,
        });
      } catch (error) {
        console.error("Error in sendMessage:", error);
      }
    },
    [sendMessageMutation]
  );

  // Function to load request details
  const loadRequestDetails = useCallback(async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Authentication required");

      const endpoint = isClientContext 
        ? `/api/requests/${requestId}`
        : `/api/service/requests/${requestId}`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load request details");
      }

      return response.json();
    } catch (error) {
      console.error("Error loading request details:", error);
      throw error;
    }
  }, [isClientContext]);

  // Function to load offer details
  const loadOfferDetails = useCallback(async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`/api/client/offers/request/${requestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load offer details");
      }

      const offers = await response.json();
      // Find the accepted offer if any
      const acceptedOffer = offers.find((offer: any) => offer.status === "Accepted");
      
      return acceptedOffer || offers[0]; // Return accepted offer or first offer
    } catch (error) {
      console.error("Error loading offer details:", error);
      throw error;
    }
  }, []);

  return {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage,
    loadRequestDetails,
    loadOfferDetails,
    refetchMessages,
    refetchConversations
  };
}
