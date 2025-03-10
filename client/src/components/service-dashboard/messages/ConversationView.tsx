import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Info } from "lucide-react";
import { MessageCard } from "./MessageCard";
import type { Message, MessageSchema } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import websocketService from "@/lib/websocket";
import ErrorBoundary from "@/components/ErrorBoundary"; // Changed to default import

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
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [wsInitialized, setWsInitialized] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialize WebSocket connection
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const initializeWebSocket = async () => {
      try {
        if (!wsInitialized && mounted) {
          await websocketService.ensureConnection();
          setWsInitialized(true);
          retryCount = 0; // Reset retry count on successful connection
        }
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        retryCount++;

        // Only retry if under max attempts and component still mounted
        if (retryCount < maxRetries && mounted) {
          setTimeout(initializeWebSocket, Math.min(1000 * Math.pow(2, retryCount), 10000));
        } else {
          toast({
            variant: "destructive",
            title: "Eroare de conexiune",
            description: "Nu s-a putut stabili conexiunea în timp real. Încercați să reîncărcați pagina.",
          });
        }
      }
    };

    initializeWebSocket();

    return () => {
      mounted = false;
    };
  }, [wsInitialized, toast]);

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
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite mesajul. Încercați din nou.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ErrorBoundary>
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
                {messages
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((message) => (
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
    </ErrorBoundary>
  );
}