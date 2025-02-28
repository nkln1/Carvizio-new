import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Loader2, Search } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessagesManagement } from "@/hooks/useMessagesManagement";
import { ConversationView } from "@/components/service-dashboard/messages/ConversationView";
import { ConversationList } from "@/components/service-dashboard/messages/ConversationList";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import websocketService from "@/lib/websocket";
import { useQueryClient } from "@tanstack/react-query";

export interface InitialConversationProps {
  userId?: number;
  userName?: string;
  requestId?: number;
  offerId?: number;
}

interface MessagesTabProps {
  initialConversation?: InitialConversationProps;
  onConversationClear?: () => void;
}

export function MessagesTab({
  initialConversation = null,
  onConversationClear,
}: MessagesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [requestData, setRequestData] = useState<any>(null);
  const [offerData, setOfferData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
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
  } = useMessagesManagement(initialConversation, true);

  // Effect for handling initialConversation updates
  useEffect(() => {
    if (initialConversation?.userId && initialConversation?.requestId) {
      setActiveConversation({
        userId: initialConversation.userId,
        userName: initialConversation.userName || "Service Provider",
        requestId: initialConversation.requestId,
        offerId: initialConversation.offerId
      });
    }
  }, [initialConversation?.userId, initialConversation?.requestId, initialConversation?.offerId]);

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
    if (onConversationClear) {
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
    if (onConversationClear) {
      onConversationClear();
    }
  };

  const handleViewDetails = async () => {
    if (!activeConversation?.requestId) return;

    setIsLoadingData(true);
    setRequestData(null);
    setOfferData(null);

    try {
      // Load request details
      const request = await loadRequestDetails(activeConversation.requestId);
      setRequestData(request);

      // If there's an offerId, load offer details
      if (activeConversation.offerId) {
        const offer = await loadOfferDetails(activeConversation.requestId);
        setOfferData(offer);
      }
    } catch (error) {
      console.error("Error loading details:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca detaliile. Vă rugăm să încercați din nou."
      });
    } finally {
      setIsLoadingData(false);
    }

    setShowDetailsDialog(true);
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (conv.userName && conv.userName.toLowerCase().includes(searchLower)) ||
      (conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchLower)) ||
      (conv.requestTitle && conv.requestTitle.toLowerCase().includes(searchLower))
    );
  });

  if (!user) {
    return null;
  }

  // Create unique IDs for dialog accessibility
  const dialogTitleId = `message-details-dialog-title-${Math.random().toString(36).substring(2, 15)}`;
  const dialogDescriptionId = `message-details-dialog-description-${Math.random().toString(36).substring(2, 15)}`;

  return (
    <Card className="border-[#00aff5]/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mesaje
          </CardTitle>
          {!activeConversation && filteredConversations.length > 0 && (
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
          Comunicare directă cu service-urile și gestionarea conversațiilor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!activeConversation ? (
          <div className="flex flex-col gap-4 w-full">
            {isLoadingConversations ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
                <p className="text-muted-foreground ml-2">Se încarcă conversațiile...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nu există conversații încă.</p>
                <p className="text-sm mt-2">
                  Conversațiile vor apărea aici după ce veți interacționa cu service-urile.
                </p>
              </div>
            ) : (
              <ConversationList 
                conversations={filteredConversations}
                isLoading={false}
                onSelectConversation={handleConversationSelect}
                activeConversationId={activeConversation?.userId}
                activeRequestId={activeConversation?.requestId}
              />
            )}
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
                onSendMessage={(content) => sendMessage(content)}
                onBack={handleBack}
                onViewDetails={handleViewDetails}
                showDetailsButton={!!activeConversation.requestId}
              />
            </Card>
          </div>
        )}

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogPortal>
            <DialogContent
              className="max-h-[80vh] overflow-y-auto"
              aria-labelledby={dialogTitleId}
              aria-describedby={dialogDescriptionId}
            >
              <DialogHeader>
                <DialogTitle id={dialogTitleId}>
                  {activeConversation?.offerId ? "Detalii Complete" : "Detalii Cerere"}
                </DialogTitle>
                <DialogDescription id={dialogDescriptionId}>
                  {activeConversation?.offerId 
                    ? "Informații despre cererea și oferta selectată" 
                    : "Informații despre cererea selectată"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {isLoadingData ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
                    <p className="text-muted-foreground ml-2">Se încarcă detaliile...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {requestData && (
                      <div className="space-y-3">
                        <h3 className="font-medium text-md">Detalii Cerere</h3>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Titlu</h4>
                          <p>{requestData.title || "Nedisponibil"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Descriere</h4>
                          <p className="whitespace-pre-line">{requestData.description || "Nedisponibil"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Data preferată</h4>
                          <p>{requestData.preferredDate || "Nedisponibil"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Locație</h4>
                          <p>
                            {requestData.cities && Array.isArray(requestData.cities) 
                              ? `${requestData.cities.join(", ")}, ${requestData.county || ""}` 
                              : "Locație nedisponibilă"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                          <span className="px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                            {requestData.status || "Nedisponibil"}
                          </span>
                        </div>
                      </div>
                    )}

                    {activeConversation?.offerId && offerData && (
                      <div className="space-y-3 mt-6 pt-6 border-t">
                        <h3 className="font-medium text-md">Detalii Ofertă</h3>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Titlu</h4>
                          <p>{offerData.title || "Nedisponibil"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Preț</h4>
                          <p className="font-bold text-[#00aff5]">
                            {offerData.price ? `${offerData.price} RON` : "Nedisponibil"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Detalii</h4>
                          <p className="whitespace-pre-line">{offerData.details || "Nedisponibil"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            offerData.status && offerData.status.toLowerCase() === 'accepted' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {offerData.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    )}

                    {!requestData && (!activeConversation?.offerId || !offerData) && (
                      <div className="text-center py-4 text-gray-500">
                        Nu s-au putut încărca detaliile. Vă rugăm să încercați din nou.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default MessagesTab;