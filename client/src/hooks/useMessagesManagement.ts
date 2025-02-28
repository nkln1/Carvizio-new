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
  } | null>(null);
  
  // Initialize with initial conversation if provided
  useEffect(() => {
    if (initialConversation && initialConversation.userId && initialConversation.requestId) {
      setActiveConversation({
        userId: initialConversation.userId,
        userName: initialConversation.userName || "Service Provider",
        requestId: initialConversation.requestId,
        offerId: initialConversation.offerId
      });
    }
  }, []);
  const [messages, setMessages] = useState<any[]>([]);

  // Query for fetching conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    refetch: refetchConversations
  } = useQuery({
    queryKey: [isClientContext ? "/api/client/conversations" : "/api/service/conversations"],
    queryFn: async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Authentication required");

        const endpoint = isClientContext 
          ? "/api/client/conversations" 
          : "/api/service/conversations";

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }

        return response.json();
      } catch (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }
    },
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
    if (fetchedMessages) {
      setMessages(fetchedMessages);
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
    mutationFn: async (messageData: {
      content: string;
      receiverId: number;
      receiverRole: string;
      requestId: number;
      offerId?: number;
    }) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Authentication required");

      const endpoint = isClientContext 
        ? "/api/messages" 
        : "/api/service/messages/send";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: (newMessage) => {
      // Update messages with the new message
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/messages", activeConversation?.requestId] });
      queryClient.invalidateQueries({ 
        queryKey: [isClientContext ? "/api/client/conversations" : "/api/service/conversations"] 
      });
    },
    onError: (error) => {
      console.error("Error in sendMessage:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Mesajul nu a putut fi trimis. Încercați din nou.",
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
      try {
        console.log("Sending message:", { content, receiverId, receiverRole, requestId, offerId });
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
  const loadRequestDetails = async (requestId: number) => {
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
  };

  // Function to load offer details
  const loadOfferDetails = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Authentication required");

      const endpoint = isClientContext
        ? `/api/client/offers?requestId=${requestId}`
        : `/api/service/offers/request/${requestId}`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load offer details");
      }

      const offers = await response.json();
      if (Array.isArray(offers) && offers.length > 0) {
        // Return the first offer or the accepted one if exists
        const acceptedOffer = offers.find(o => o.status === "Accepted");
        return acceptedOffer || offers[0];
      }
      return null;
    } catch (error) {
      console.error("Error loading offer details:", error);
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
    loadOfferDetails,
    refetchMessages,
    refetchConversations
  };
}