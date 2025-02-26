import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, FileText, Loader2 } from "lucide-react";
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
import type { Request as RequestType } from "@shared/schema";
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
  const { data: requestDetails, isLoading: isLoadingRequest } = useQuery<RequestType>({
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
          'Cache-Control': 'no-cache'
        }
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
        title: "Eroare la încărcarea detaliilor",
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
            <ScrollArea className="h-full max-h-[60vh] pr-4">
              {isLoadingRequest ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="ml-2 text-muted-foreground">Se încarcă detaliile...</p>
                </div>
              ) : requestDetails ? (
                <div className="space-y-6 p-2">
                  <div>
                    <h3 className="font-medium text-lg mb-2">Detalii Cerere</h3>
                    <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Titlu Cerere</p>
                        <p className="font-medium">{requestDetails.title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Descriere</p>
                        <p className="whitespace-pre-line font-medium">{requestDetails.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-medium">{requestDetails.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Data preferată</p>
                        <p className="font-medium">
                          {format(new Date(requestDetails.preferredDate), "dd.MM.yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Locație</p>
                        <p className="font-medium">
                          {Array.isArray(requestDetails.cities) 
                            ? `${requestDetails.cities.join(", ")}, ${requestDetails.county}`
                            : requestDetails.county}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="text-red-500">
                    <FileText className="h-12 w-12" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-900">Nu s-au putut încărca detaliile cererii</p>
                    <p className="text-sm text-gray-500">Vă rugăm să reîmprospătați pagina sau să încercați din nou mai târziu</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      setTimeout(() => setShowDetailsDialog(true), 100);
                    }}
                  >
                    Încearcă din nou
                  </Button>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}