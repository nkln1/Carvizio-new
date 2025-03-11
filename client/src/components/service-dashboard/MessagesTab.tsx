import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Loader2, Search } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessagesManagement } from "@/hooks/useMessagesManagement";
import { ConversationView } from "./messages/ConversationView";
import { ConversationList } from "./messages/ConversationList";
import { ConversationInfo } from "@/pages/ServiceDashboard";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import websocketService from "@/lib/websocket";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Request } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase";

interface MessagesTabProps {
  initialConversation?: ConversationInfo | null;
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

export default function MessagesTab({
  initialConversation = null,
  onConversationClear,
}: MessagesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [wsInitialized, setWsInitialized] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [offerData, setOfferData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage,
  } = useMessagesManagement(initialConversation);

  // Load request details function
  const loadRequestDetails = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load request details');
      }

      return response.json();
    } catch (error) {
      console.error('Error loading request details:', error);
      throw error;
    }
  };

  // Load offer details function
  const loadOfferDetails = async (offerId: number) => {
    try {
      console.log('Loading offer details for ID:', offerId);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // Use the same endpoint as used in the client dashboard
      const response = await fetch(`/api/client/offers/${offerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response for offer details:', errorText);
        throw new Error(`Failed to load offer details: ${errorText}`);
      }

      const data = await response.json();
      console.log('Loaded offer details:', data);
      return data;
    } catch (error) {
      console.error('Error loading offer details:', error);
      throw error;
    }
  };

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

  const handleConversationSelect = async (conv: {
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

    // Mark conversation as read
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      await fetch(`/api/service/conversations/${conv.requestId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: conv.userId })
      });

      // Invalidate conversations query to update unread counts
      queryClient.invalidateQueries({ queryKey: ['/api/service/conversations'] });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const handleViewDetails = async () => {
    if (!activeConversation?.requestId) return;

    setIsLoadingData(true);
    setRequestData(null);
    setOfferData(null);

    try {
      console.log('Loading details for request:', activeConversation.requestId);
      // Load request details
      const request = await loadRequestDetails(activeConversation.requestId);
      setRequestData(request);
      console.log('Request data set:', request);

      // If there's an offerId, load offer details
      if (activeConversation.offerId) {
        console.log('Loading details for offer:', activeConversation.offerId);
        const offer = await loadOfferDetails(activeConversation.offerId);
        console.log('Setting offer data:', offer);
        setOfferData(offer);
      }

      setShowDetailsDialog(true);
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
  };

  // Filtrarea conversațiilor pe baza termenului de căutare
  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (conv.userName && conv.userName.toLowerCase().includes(searchLower)) ||
      (conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchLower)) ||
      (conv.requestTitle && conv.requestTitle.toLowerCase().includes(searchLower))
    );
  });

  // Funcție pentru ștergerea unei conversații
  const handleDeleteConversation = async (requestId: number, userId: number) => {
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/messages/${requestId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId, userId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // Invalidăm query-ul pentru a reîncărca lista de conversații
      await queryClient.invalidateQueries({ queryKey: ['/api/service/conversations'] });

      // Dacă conversația ștearsă era cea activă, o resetăm
      if (activeConversation?.requestId === requestId && activeConversation?.userId === userId) {
        setActiveConversation(null);
      }

      toast({
        title: "Succes",
        description: "Conversația a fost ștearsă cu succes.",
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut șterge conversația. Vă rugăm să încercați din nou.",
      });
    }
  };

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
          Comunicare directă cu clienții și gestionarea conversațiilor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!activeConversation ? (
          <div className="flex flex-col gap-4 w-full">
            <ConversationList 
              conversations={filteredConversations}
              isLoading={isLoadingConversations}
              onSelectConversation={handleConversationSelect}
              onDeleteConversation={handleDeleteConversation}
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
          <DialogPortal>
            <DialogContent>
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

              <div className="max-h-[80vh] overflow-y-auto">
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
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Titlu
                          </h4>
                          <p>{requestData.title || "Nedisponibil"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Descriere
                          </h4>
                          <p className="whitespace-pre-line">{requestData.description || "Nedisponibil"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Data preferată
                          </h4>
                          <p>
                            {isValidDate(requestData.preferredDate) 
                              ? safeFormatDate(requestData.preferredDate) 
                              : "Dată nedisponibilă"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Data trimiterii
                          </h4>
                          <p>
                            {isValidDate(requestData.createdAt) 
                              ? safeFormatDate(requestData.createdAt) 
                              : "Dată nedisponibilă"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Locație
                          </h4>
                          <p>
                            {requestData.cities && Array.isArray(requestData.cities) 
                              ? `${requestData.cities.join(", ")}, ${requestData.county || ""}` 
                              : "Locație nedisponibilă"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Status
                          </h4>
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
                            {offerData.price ? `${offerId.price} RON` : "Nedisponibil"}
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