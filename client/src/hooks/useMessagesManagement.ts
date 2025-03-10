import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Message } from "@/types/message";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useWebSocketContext } from "@/context/websocket-context";

interface Conversation {
  userId: number;
  userName: string;
  requestId: number;
  requestTitle: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
  offerId?: number;
}

export function useMessagesManagement(isClient: boolean = true) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const queryClient = useQueryClient();
  const { socket } = useWebSocketContext();

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const endpoint = isClient ? "/client/conversations" : "/service/conversations";
      const response = await api.get(endpoint);

      if (response.status === 200) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Nu s-au putut încărca conversațiile");
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isClient]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (requestId: number) => {
    if (!requestId) return;

    try {
      setIsLoadingMessages(true);
      const endpoint = isClient ? `/client/messages/${requestId}` : `/service/messages/${requestId}`;
      const response = await api.get(endpoint);

      if (response.status === 200) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Nu s-au putut încărca mesajele");
    } finally {
      setIsLoadingMessages(false);
    }
  }, [isClient]);

  // Set active conversation and fetch its messages
  const setActiveConversationById = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation);
    fetchMessages(conversation.requestId);
  }, [fetchMessages]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation) {
      toast.error("Nu există o conversație activă");
      return;
    }

    try {
      const endpoint = isClient ? "/client/messages/send" : "/service/messages/send";
      const payload = {
        content,
        receiverId: activeConversation.userId,
        receiverRole: isClient ? "service" : "client",
        requestId: activeConversation.requestId,
        offerId: activeConversation.offerId
      };

      const response = await api.post(endpoint, payload);

      if (response.status === 200 || response.status === 201) {
        // Optimistically update UI without waiting for WebSocket
        setMessages(prev => [...prev, response.data]);

        // Refresh conversations list
        fetchConversations();
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
      toast.error("Mesajul nu a putut fi trimis");
    }
  }, [activeConversation, isClient, fetchConversations]);

  // Clear active conversation
  const clearActiveConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (!socket) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'NEW_MESSAGE') {
          const newMessage = data.payload;

          // If the message belongs to the active conversation, add it to messages
          if (activeConversation && newMessage.requestId === activeConversation.requestId) {
            setMessages(prev => {
              // Check if the message is already in the list to avoid duplicates
              const messageExists = prev.some(msg => msg.id === newMessage.id);
              if (messageExists) return prev;
              return [...prev, newMessage];
            });
          }

          // Refresh conversations list to update unread counts and last messages
          fetchConversations();
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    socket.addEventListener('message', handleWebSocketMessage);

    return () => {
      socket.removeEventListener('message', handleWebSocketMessage);
    };
  }, [socket, activeConversation, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    activeConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    fetchConversations,
    fetchMessages,
    setActiveConversationById,
    sendMessage,
    clearActiveConversation
  };
}