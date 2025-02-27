import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientMessagesManagement } from "@/hooks/useClientMessagesManagement";
import { ConversationView } from "./messages/ConversationView";
import { ConversationList } from "./messages/ConversationList";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import websocketService from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";

interface MessagesTabProps {
  initialConversation?: {
    userId: number;
    userName: string;
    requestId: number;
    offerId?: number;
    sourceTab?: string;
  } | null;
  onConversationClear?: () => void;
}

// Utility function to check if a date is valid
const isValidDate = (date: any): boolean => {
  return date && !isNaN(new Date(date).getTime());
};

// Utility function to safely format dates
const safeFormatDate = (date: any, formatStr: string = "dd.MM.yyyy"): string => {
  if (!isValidDate(date)) {
    return "Dată nedisponibilă";
  }
  try {
    return format(new Date(date), formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Dată nedisponibilă";
  }
};

export const MessagesTab = ({
  initialConversation = null,
  onConversationClear,
}: MessagesTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [wsInitialized, setWsInitialized] = useState(false);

  const {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage,
    loadRequestDetails,
    loadOfferDetails
  } = useClientMessagesManagement(initialConversation);

  // WebSocket initialization
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


  if (!user) {
    return null;
  }

  return (
    <Card className="border-[#00aff5]/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mesaje
          </CardTitle>
          {!activeConversation && (
            <div className="relative w-[300px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Caută conversații..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>
        <CardDescription>
          Comunicare directă cu service-urile auto
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!activeConversation ? (
          <div className="flex flex-col gap-4 w-full">
            <ConversationList
              conversations={conversations}
              isLoading={isLoadingConversations}
              onSelectConversation={(conv) => setActiveConversation(conv)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => {
                  setActiveConversation(null);
                  if (onConversationClear) {
                    onConversationClear();
                  }
                }}
                variant="ghost"
                className="hover:bg-gray-100"
              >
                ← Înapoi la conversații
              </Button>
            </div>

            <Card className="fixed-height-card overflow-hidden">
              <ConversationView
                messages={messages}
                userName={activeConversation.userName}
                currentUserId={user.id}
                isLoading={isLoadingMessages}
                onBack={() => {
                  setActiveConversation(null);
                  if (onConversationClear) {
                    onConversationClear();
                  }
                }}
                onSendMessage={sendMessage}
                showDetailsButton={!!activeConversation.requestId}
              />
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MessagesTab;