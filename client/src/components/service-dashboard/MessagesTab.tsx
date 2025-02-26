import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react"; 
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
    queryKey: ['request', activeConversation?.requestId],
    enabled: !!activeConversation?.requestId && showDetailsDialog,
    queryFn: async () => {
      if (!activeConversation?.requestId) {
        throw new Error('No request ID available');
      }

      console.log('Fetching request details for ID:', activeConversation.requestId);

      const response = await fetch(`/api/requests/${activeConversation.requestId}`);

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch request:', error);
        throw new Error('Failed to fetch request details');
      }

      const data = await response.json();
      console.log('Received request details:', data);
      return data;
    }
  });

  // Query pentru a obține detalii despre ofertă când este necesar
  const { data: offerDetails, isLoading: isLoadingOffer } = useQuery({
    queryKey: ['offer', activeConversation?.offerId],
    enabled: !!activeConversation?.offerId && showDetailsDialog,
    queryFn: async () => {
      if (!activeConversation?.offerId) {
        throw new Error('No offer ID available');
      }

      console.log('Fetching offer details for ID:', activeConversation.offerId);

      const response = await fetch(`/api/service/offers/${activeConversation.offerId}`);

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch offer:', error);
        throw new Error('Failed to fetch offer details');
      }

      const data = await response.json();
      console.log('Received offer details:', data);
      return data;
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
    offerId?: number;
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
              <DialogTitle>
                {activeConversation?.offerId ? "Detalii Complete" : "Detalii Cerere"}
              </DialogTitle>
              <DialogDescription>
                {activeConversation?.offerId 
                  ? "Informații despre cererea și oferta selectată" 
                  : "Informații despre cererea selectată"}
              </DialogDescription>
            </DialogHeader>

            {isLoadingRequest || (activeConversation?.offerId && isLoadingOffer) ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
                <p className="text-muted-foreground ml-2">Se încarcă detaliile...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Detalii cerere - afișate întotdeauna */}
                {requestDetails && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-md">Detalii Cerere</h3>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Titlu
                      </h4>
                      <p>{requestDetails.title}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Descriere
                      </h4>
                      <p className="whitespace-pre-line">{requestDetails.description}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Data preferată
                      </h4>
                      <p>
                        {format(new Date(requestDetails.preferredDate), "dd.MM.yyyy")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Data trimiterii
                      </h4>
                      <p>
                        {format(new Date(requestDetails.createdAt), "dd.MM.yyyy")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Locație
                      </h4>
                      <p>{requestDetails.cities?.join(", ")}, {requestDetails.county}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Status
                      </h4>
                      <span className="px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                        {requestDetails.status}
                      </span>
                    </div>
                  </div>
                )}

                {/* Detalii ofertă - afișate doar dacă există offerId */}
                {activeConversation?.offerId && offerDetails && (
                  <div className="space-y-3 mt-6 pt-6 border-t">
                    <h3 className="font-medium text-md">Detalii Ofertă</h3>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Titlu</h4>
                      <p>{offerDetails.title}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Preț</h4>
                      <p className="font-bold text-[#00aff5]">{offerDetails.price} RON</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Detalii</h4>
                      <p className="whitespace-pre-line">{offerDetails.details}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Date disponibile</h4>
                      <p>
                        {offerDetails.availableDates.map((date: string) => 
                          format(new Date(date), "dd.MM.yyyy")
                        ).join(", ")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        offerDetails.status.toLowerCase() === 'accepted' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {offerDetails.status}
                      </span>
                    </div>
                  </div>
                )}

                {!requestDetails && !offerDetails && (
                  <div className="text-center py-4 text-gray-500">
                    Nu s-au putut încărca detaliile. Vă rugăm să încercați din nou.
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}