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