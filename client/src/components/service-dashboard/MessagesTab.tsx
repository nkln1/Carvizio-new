import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react"; 
import { RequestDetailsDialog } from "./requests/RequestDetailsDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessagesManagement } from "@/hooks/useMessagesManagement";
import { ConversationView } from "./messages/ConversationView";
import { ConversationList } from "./messages/ConversationList";
import { ConversationInfo } from "@/pages/ServiceDashboard";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import websocketService from "@/lib/websocket";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Request } from "@shared/schema";
import { auth } from "@/lib/firebase";

interface MessagesTabProps {
  initialConversation?: ConversationInfo | null;
  onConversationClear?: () => void;
}

export default function MessagesTab({
  initialConversation = null,
  onConversationClear,
}: MessagesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage
  } = useMessagesManagement(initialConversation);

  const [wsInitialized, setWsInitialized] = useState(false);

  // Query for fetching request details when needed
  const { data: requestDetails, isLoading: isLoadingRequest } = useQuery<Request>({
    queryKey: ['request-details', activeConversation?.requestId],
    enabled: !!activeConversation?.requestId && !!showDetailsDialog,
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token || !activeConversation?.requestId) {
        throw new Error('Missing token or request ID');
      }

      const response = await fetch(`/api/service/requests/${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache' // Added for better cache control
        },
        next: { revalidateOnFocus: false } // added to prevent refetch on window focus
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Request details fetch failed:', {
          status: response.status,
          error: errorData
        });
        throw new Error('Failed to fetch request details');
      }

      const data = await response.json();
      return data;
    },
    staleTime: 15000,
    cacheTime: 30000,
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Error fetching request details:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca detaliile cererii. Vă rugăm să încercați din nou."
      });
    }
  });

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

  const handleBack = () => {
    setActiveConversation(null);
    if (initialConversation && onConversationClear) {
      onConversationClear();
    }
  };

  const handleConversationSelect = (conv: {
    userId: number;
    userName: string;
    requestId: number;
    sourceTab?: string;
  }) => {
    setActiveConversation(conv);
    if (initialConversation && onConversationClear) {
      onConversationClear();
    }
  };

  const handleViewDetails = () => {
    setShowDetailsDialog(true);
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="border-[#00aff5]/20">
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Mesaje
        </CardTitle>
        <CardDescription>
          Comunicare directă cu clienții și gestionarea conversațiilor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!activeConversation ? (
          <div className="flex flex-col gap-4 w-full">
            <ConversationList 
              conversations={conversations}
              isLoading={isLoadingConversations}
              activeConversationId={activeConversation?.userId}
              activeRequestId={activeConversation?.requestId}
              onSelectConversation={handleConversationSelect}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleBack}
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
                onSendMessage={sendMessage}
                onBack={handleBack}
                onViewDetails={handleViewDetails}
                showDetailsButton={!!activeConversation.requestId}
              />
            </Card>
          </div>
        )}

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalii Cerere</DialogTitle>
              <DialogDescription>
                Informații despre cererea selectată
              </DialogDescription>
            </DialogHeader>
            {isLoadingRequest ? (
              <div className="flex justify-center items-center py-8">
                <p className="text-muted-foreground">Se încarcă detaliile...</p>
              </div>
            ) : requestDetails ? (
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Titlu
                  </h3>
                  <p>{requestDetails.title}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Descriere
                  </h3>
                  <p className="whitespace-pre-line">{requestDetails.description}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Data preferată
                  </h3>
                  <p>
                    {format(new Date(requestDetails.preferredDate), "dd.MM.yyyy")}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Data trimiterii
                  </h3>
                  <p>
                    {format(new Date(requestDetails.createdAt), "dd.MM.yyyy")}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Locație
                  </h3>
                  <p>{requestDetails.cities?.join(", ")}, {requestDetails.county}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Status
                  </h3>
                  <span className="px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                    {requestDetails.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Nu s-au putut încărca detaliile cererii. Vă rugăm să încercați din nou.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}