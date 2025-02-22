import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import {
  MessageSquare,
  Send,
  Loader2,
  User,
} from "lucide-react";
import { format } from "date-fns";
import websocketService from "@/lib/websocket";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  senderName: string;
  senderRole: 'client' | 'service';
  requestId: number;
}

interface ActiveConversation {
  userId: number;
  userName: string;
  requestId: number;
}

interface MessagesTabProps {
  initialConversation?: { userId: number; userName: string; requestId: number } | null;
  onConversationClear?: () => void;
}

export default function MessagesTab({
  initialConversation,
  onConversationClear
}: MessagesTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(initialConversation || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/service/conversations'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      return response.json();
    }
  });

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/service/messages', activeConversation?.userId, activeConversation?.requestId],
    queryFn: async () => {
      if (!activeConversation) return [];

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/messages/${activeConversation.userId}?requestId=${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      return response.json();
    },
    enabled: !!activeConversation
  });

  useEffect(() => {
    const handleWebSocketMessage = (data: any) => {
      if (data.type === 'new_message') {
        queryClient.invalidateQueries({ queryKey: ['/api/service/messages', activeConversation?.userId, activeConversation?.requestId] });
        queryClient.invalidateQueries({ queryKey: ['/api/service/conversations'] });
      }
    };

    const removeHandler = websocketService.addMessageHandler(handleWebSocketMessage);
    return () => {
      removeHandler();
    };
  }, [activeConversation?.userId, activeConversation?.requestId, queryClient]);

  useEffect(() => {
    if (initialConversation) {
      setActiveConversation(initialConversation);
    }
  }, [initialConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: activeConversation.userId,
          content: newMessage,
          requestId: activeConversation.requestId,
          receiverRole: 'client',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      setNewMessage("");
      await queryClient.invalidateQueries({ queryKey: ['/api/service/messages', activeConversation.userId, activeConversation.requestId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/service/conversations'] });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
      });
    }
  };

  const renderMessages = () => {
    if (!messages.length) return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No messages yet</p>
      </div>
    );

    return messages.map((message: Message) => (
      <div
        key={message.id}
        className={`flex gap-3 mb-4 ${
          message.senderRole === 'service' ? 'justify-end' : 'justify-start'
        }`}
      >
        {message.senderRole !== 'service' && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {message.senderName?.substring(0, 2).toUpperCase() || 'CL'}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`max-w-[70%] rounded-lg p-3 ${
            message.senderRole === 'service'
              ? 'bg-[#00aff5] text-white'
              : 'bg-gray-100'
          }`}
        >
          <p className="text-sm break-words">{message.content}</p>
          <span className="text-xs opacity-70 mt-1 block">
            {format(new Date(message.createdAt), "HH:mm")}
          </span>
        </div>
        {message.senderRole === 'service' && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {message.senderName?.substring(0, 2).toUpperCase() || 'SP'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    ));
  };

  const handleConversationSelect = (conv: { userId: number; userName: string; requestId: number }) => {
    setActiveConversation(conv);
    if (initialConversation) {
      onConversationClear?.();
    }
  };

  const renderConversations = () => {
    if (!conversations.length) return (
      <div className="text-center py-4 text-gray-500">
        No conversations yet
      </div>
    );

    return conversations.map((conv: any) => (
      <div
        key={`${conv.userId}-${conv.requestId}`}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
          activeConversation?.userId === conv.userId && activeConversation?.requestId === conv.requestId
            ? 'bg-[#00aff5] text-white'
            : 'hover:bg-gray-100'
        }`}
        onClick={() => handleConversationSelect({
          userId: conv.userId,
          userName: conv.userName || `Client ${conv.userId}`,
          requestId: conv.requestId
        })}
      >
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            {(conv.userName || `C${conv.userId}`).substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{conv.userName || `Client ${conv.userId}`}</p>
          {conv.lastMessage && (
            <p className="text-sm opacity-70 truncate">{conv.lastMessage}</p>
          )}
          <p className="text-xs opacity-60">Request #{conv.requestId}</p>
        </div>
      </div>
    ));
  };

  return (
    <Card className="h-[calc(100vh-12rem)]">
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {activeConversation ? `${activeConversation.userName} - Request #${activeConversation.requestId}` : "Messages"}
        </CardTitle>
        <CardDescription>
          {activeConversation
            ? "Active conversation"
            : "Select a conversation to start messaging"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex h-[calc(100%-5rem)]">
        <div className="w-1/3 border-r p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Conversations</h3>
          </div>
          <ScrollArea className="h-full">
            {conversationsLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
              </div>
            ) : (
              renderConversations()
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {renderMessages()}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}