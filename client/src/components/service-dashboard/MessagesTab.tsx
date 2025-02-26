import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Info } from "lucide-react";
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

interface MessagesTabProps {
  initialConversation?: ConversationInfo | null;
  onConversationClear?: () => void;
}

export default function MessagesTab({
  initialConversation = null,
  onConversationClear,
}: MessagesTabProps) {
  const { user } = useAuth();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
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
  } = useMessagesManagement(initialConversation);

  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [offerDetails, setOfferDetails] = useState<any>(null);
  const [wsInitialized, setWsInitialized] = useState(false);

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

  useEffect(() => {
    const loadDetails = async () => {
      if (activeConversation?.requestId) {
        try {
          const requestData = await loadRequestDetails(activeConversation.requestId);
          if (requestData && typeof requestData === 'object') {
            setActiveRequest(requestData);
          }

          if (activeConversation.sourceTab && ['sent-offer', 'accepted-offer'].includes(activeConversation.sourceTab)) {
            try {
              const offerData = await loadOfferDetails(activeConversation.requestId);
              if (offerData && typeof offerData === 'object') {
                setOfferDetails(offerData);
              }
            } catch (error) {
              console.error('Error loading offer details:', error);
              setOfferDetails(null);
            }
          } else {
            setOfferDetails(null);
          }
        } catch (error) {
          console.error('Error loading request details:', error);
          setActiveRequest(null);
        }
      }
    };

    loadDetails();
  }, [activeConversation, loadRequestDetails, loadOfferDetails]);

  const handleBack = () => {
    setActiveConversation(null);
    if (initialConversation && onConversationClear) {
      onConversationClear();
    }
  };

  const handleConversationSelect = async (conv: ConversationInfo) => {
    setActiveConversation(conv);
    if (initialConversation && onConversationClear) {
      onConversationClear();
    }

    try {
      if (conv.requestId) {
        const request = await loadRequestDetails(conv.requestId);
        setActiveRequest(request);

        if (conv.sourceTab && ['sent-offer', 'accepted-offer'].includes(conv.sourceTab)) {
          const offer = await loadOfferDetails(conv.requestId);
          setOfferDetails(offer);
        } else {
          setOfferDetails(null);
        }
      }
    } catch (error) {
      console.error('Error loading conversation details:', error);
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
            <div className="flex items-center justify-between gap-4">
              <Button 
                onClick={handleBack}
                variant="ghost"
                className="hover:bg-gray-100"
              >
                ← Înapoi la conversații
              </Button>
              {activeRequest && (
                <Button
                  onClick={handleViewDetails}
                  variant="outline"
                  className="text-[#00aff5] hover:text-[#0099d6] hover:bg-[#00aff5]/10"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Vezi detalii
                </Button>
              )}
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {offerDetails ? "Detalii Complete Ofertă" : "Detalii Cerere"}
              </DialogTitle>
              <DialogDescription>
                {offerDetails
                  ? "Vizualizați toate detaliile cererii și ofertei asociate acestei conversații"
                  : "Vizualizați toate detaliile cererii asociate acestei conversații"
                }
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-full max-h-[60vh] pr-4">
              <div className="space-y-6 p-2">
                {offerDetails && (
                  <div>
                    <h3 className="font-medium text-lg mb-2">Detalii Ofertă</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Titlu</p>
                        <p className="font-medium">{offerDetails.title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Preț</p>
                        <p className="font-medium text-[#00aff5]">{offerDetails.price} RON</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-medium">{offerDetails.status}</p>
                      </div>
                      {offerDetails.details && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Detalii</p>
                          <p className="font-medium">{offerDetails.details}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeRequest && (
                  <div>
                    <h3 className="font-medium text-lg mb-2">Detalii Cerere</h3>
                    <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Titlu Cerere</p>
                        <p className="font-medium">{activeRequest.title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Descriere</p>
                        <p className="font-medium whitespace-pre-line">{activeRequest.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-medium">{activeRequest.status}</p>
                      </div>
                      {activeRequest.preferredDate && (
                        <div>
                          <p className="text-sm text-gray-600">Data preferată</p>
                          <p className="font-medium">
                            {format(new Date(activeRequest.preferredDate), "dd.MM.yyyy")}
                          </p>
                        </div>
                      )}
                      {activeRequest.cities && activeRequest.county && (
                        <div>
                          <p className="text-sm text-gray-600">Locație</p>
                          <p className="font-medium">
                            {activeRequest.cities.join(", ")}, {activeRequest.county}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}