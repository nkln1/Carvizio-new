import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Info } from "lucide-react";
import { MessageCard } from "./MessageCard";
import type { Message } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import websocketService from "@/lib/websocket";

interface ConversationViewProps {
  messages: Message[];
  userName: string;
  currentUserId: number;
  isLoading?: boolean;
  onBack: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onViewDetails?: () => void;
  showDetailsButton?: boolean;
}

const MessagesLoading = () => (
  <div className="space-y-4 p-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export function ConversationView({
  messages,
  userName,
  currentUserId,
  isLoading,
  onBack,
  onSendMessage,
  onViewDetails,
  showDetailsButton = false
}: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [wsInitialized, setWsInitialized] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Removed automatic scroll effect

  useEffect(() => {
    let mounted = true;

    const initializeWebSocket = async () => {
      try {
        if (!wsInitialized && mounted) {
          await websocketService.ensureConnection();
          setWsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        // Retry after a delay if initialization fails
        if (mounted) {
          setTimeout(initializeWebSocket, 2000);
        }
      }
    };

    initializeWebSocket();

    return () => {
      mounted = false;
    };
  }, [wsInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(newMessage.trim());
      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{userName}</CardTitle>
          </div>
          {showDetailsButton && onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
              onClick={onViewDetails}
            >
              <Info className="h-4 w-4 mr-2" />
              Vezi Detalii
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          {isLoading ? (
            <MessagesLoading />
          ) : (
            <div className="space-y-4 p-4">
              {[...messages].sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              ).map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  isCurrentUser={message.senderId === currentUserId}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <form
        onSubmit={handleSubmit}
        className="border-t p-4 flex gap-2"
      >
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Scrie un mesaj..."
          className="flex-1"
          disabled={isSending}
        />
        <Button 
          type="submit" 
          disabled={!newMessage.trim() || isSending}
          className="bg-[#00aff5] hover:bg-[#0099d6]"
        >
          <Send className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
        </Button>
      </form>
    </Card>
  );
}
import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Info, FileText } from "lucide-react";
import { MessageCard } from "./MessageCard";
import type { Message } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import websocketService from "@/lib/websocket";

interface ConversationViewProps {
  messages: Message[];
  userName: string;
  currentUserId: number;
  isLoading?: boolean;
  onBack: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onViewDetails?: () => void;
  showDetailsButton?: boolean;
}

export function ConversationView({
  messages,
  userName,
  currentUserId,
  isLoading = false,
  onBack,
  onSendMessage,
  onViewDetails,
  showDetailsButton = false
}: ConversationViewProps) {
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!messageContent.trim()) return;
    
    setIsSending(true);
    try {
      await onSendMessage(messageContent);
      setMessageContent("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="border-b pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              onClick={onBack}
              variant="ghost"
              className="p-0 h-8 w-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg font-medium">{userName}</CardTitle>
          </div>
          {showDetailsButton && (
            <Button 
              onClick={onViewDetails}
              variant="outline"
              className="gap-1 h-8 text-xs"
              size="sm"
            >
              <Info className="h-3.5 w-3.5" />
              Detalii
            </Button>
          )}
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex items-start gap-2 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className={`h-16 w-48 rounded-lg ${i % 2 === 0 ? "bg-blue-50" : "bg-gray-50"}`} />
                  <div className="flex mt-1">
                    <Skeleton className="h-3 w-20 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p className="text-center">Nu există mesaje încă. Trimite primul mesaj!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                isCurrentUser={message.senderId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      <CardContent className="border-t p-3">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            placeholder="Scrie un mesaj..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="flex-1"
            disabled={isSending}
          />
          <Button 
            type="submit" 
            disabled={!messageContent.trim() || isSending}
            className="bg-[#00aff5] hover:bg-[#008fc8]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </div>
  );
}
