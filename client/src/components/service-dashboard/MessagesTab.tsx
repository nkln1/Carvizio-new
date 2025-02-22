import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  senderName: string;
  senderRole: 'client' | 'service';
}

interface ActiveConversation {
  userId: number;
  userName: string;
}

interface MessagesTabProps {
  initialConversation?: { userId: number; userName: string } | null;
  onConversationClear?: () => void;
}

export default function MessagesTab({ 
  initialConversation,
  onConversationClear
}: MessagesTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(initialConversation || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/messages/conversations'],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages', activeConversation?.userId],
    enabled: !!activeConversation,
  });

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log("WebSocket Connected");
    };

    newSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_message') {
        queryClient.invalidateQueries({ queryKey: ['/api/messages', activeConversation?.userId] });
      }
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

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
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: activeConversation.userId,
          content: newMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/messages', activeConversation.userId] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    }
  };

  const renderMessages = () => {
    if (!messages) return null;

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
              {message.senderName.substring(0, 2).toUpperCase()}
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
              {message.senderName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    ));
  };

  const handleConversationSelect = (conv: { userId: number; userName: string }) => {
    setActiveConversation(conv);
    if (initialConversation) {
      onConversationClear?.();
    }
  };

  const renderConversations = () => {
    if (!conversations) return null;

    return conversations.map((conv: any) => (
      <div
        key={conv.userId}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
          activeConversation?.userId === conv.userId
            ? 'bg-[#00aff5] text-white'
            : 'hover:bg-gray-100'
        }`}
        onClick={() => handleConversationSelect({
          userId: conv.userId,
          userName: conv.userName
        })}
      >
        <Avatar className="h-10 w-10">
          <AvatarFallback>{conv.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{conv.userName}</p>
          {conv.lastMessage && (
            <p className="text-sm opacity-70 truncate">{conv.lastMessage}</p>
          )}
        </div>
      </div>
    ));
  };

  return (
    <Card className="h-[calc(100vh-12rem)]">
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {activeConversation ? activeConversation.userName : "Mesaje"}
        </CardTitle>
        <CardDescription>
          {activeConversation 
            ? "Conversație activă"
            : "Selectează o conversație pentru a începe"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex h-[calc(100%-5rem)]">
        <div className="w-1/3 border-r p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Conversații</h3>
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
                  renderMessages()
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
                    placeholder="Scrie un mesaj..."
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
                <p>Selectează o conversație pentru a începe</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}