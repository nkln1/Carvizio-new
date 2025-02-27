import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientMessagesManagement } from "@/hooks/useClientMessagesManagement";
import { ConversationView } from "./messages/ConversationView";
import { ConversationList } from "./messages/ConversationList";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import websocketService from "@/lib/websocket";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface ClientMessagesTabProps {
  initialConversation?: {
    userId: number;
    userName: string;
    requestId: number;
    offerId?: number;
    sourceTab?: string;
  } | null;
  onConversationClear?: () => void;
}

// Funcție utilitară pentru a verifica dacă o dată este validă
const isValidDate = (date: any): boolean => {
  return date && !isNaN(new Date(date).getTime());
};

// Funcție utilitară pentru a formata data în siguranță
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
}: ClientMessagesTabProps) => {
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

  const [requestData, setRequestData] = useState<any>(null);
  const [offerData, setOfferData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

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
        const offer = await loadOfferDetails(activeConversation.offerId);
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
              conversations={filteredConversations}
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
          <DialogContent
            className="max-h-[80vh] overflow-y-auto"
            aria-describedby="message-details-description"
          >
            <DialogHeader>
              <DialogTitle>
                {activeConversation?.offerId ? "Detalii Ofertă" : "Detalii Cerere"}
              </DialogTitle>
              <DialogDescription id="message-details-description">
                {activeConversation?.offerId
                  ? "Informații despre oferta primită"
                  : "Informații despre cererea ta"}
              </DialogDescription>
            </DialogHeader>

            {isLoadingData ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
                <p className="text-muted-foreground ml-2">Se încarcă detaliile...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Request details - always displayed */}
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
                      <p>
                        {isValidDate(requestData.preferredDate)
                          ? safeFormatDate(requestData.preferredDate)
                          : "Dată nedisponibilă"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Data trimiterii</h4>
                      <p>
                        {isValidDate(requestData.createdAt)
                          ? safeFormatDate(requestData.createdAt)
                          : "Dată nedisponibilă"}
                      </p>
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

                {/* Offer details - only displayed if there's an offerId and offerData */}
                {activeConversation?.offerId && offerData && (
                  <div className="space-y-3 mt-6 pt-6 border-t">
                    <h3 className="font-medium text-md">Detalii Ofertă</h3>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Service Auto</h4>
                      <p>{offerData.serviceProviderName || "Nedisponibil"}</p>
                    </div>
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
                    {offerData.availableDates && Array.isArray(offerData.availableDates) && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Date disponibile</h4>
                        <p>
                          {offerData.availableDates.length > 0
                            ? offerData.availableDates
                                .filter((date: any) => isValidDate(date))
                                .map((date: string) => safeFormatDate(date))
                                .join(", ")
                            : "Nedisponibil"
                          }
                        </p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        offerData.status && offerData.status.toLowerCase() === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : offerData.status && offerData.status.toLowerCase() === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        {offerData.status === 'Accepted' ? 'Acceptată' :
                          offerData.status === 'Rejected' ? 'Respinsă' :
                            offerData.status === 'Pending' ? 'În așteptare' :
                              offerData.status || "Nedisponibil"}
                      </span>
                    </div>
                    {offerData.notes && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Observații</h4>
                        <p className="whitespace-pre-line">{offerData.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {!requestData && (!activeConversation?.offerId || !offerData) && (
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
};