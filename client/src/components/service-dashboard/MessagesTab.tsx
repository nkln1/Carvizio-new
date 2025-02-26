import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessagesManagement } from "@/hooks/useMessagesManagement";
import { ConversationView } from "./messages/ConversationView";
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
        const request = await loadRequestDetails(activeConversation.requestId);
        setActiveRequest(request);

        if (activeConversation.sourceTab && ['sent-offer', 'accepted-offer'].includes(activeConversation.sourceTab)) {
          const offer = await loadOfferDetails(activeConversation.requestId);
          setOfferDetails(offer);
        }
      }
    };

    loadDetails();
  }, [activeConversation]);

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
  }) => {
    setActiveConversation(conv);
    if (initialConversation && onConversationClear) {
      onConversationClear();
    }

    if (conv.requestId) {
      const request = await loadRequestDetails(conv.requestId);
      setActiveRequest(request);

      const offer = await loadOfferDetails(conv.requestId);
      setOfferDetails(offer);
    }
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
            {conversations.map((conv) => (
              <Card 
                key={`${conv.userId}-${conv.requestId}`}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleConversationSelect({
                  userId: conv.userId,
                  userName: conv.userName || `Client ${conv.userId}`,
                  requestId: conv.requestId,
                })}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-[#00aff5]" />
                    {conv.userName || `Client ${conv.userId}`}
                  </CardTitle>
                  {conv.requestTitle && (
                    <CardDescription className="truncate">
                      {conv.requestTitle}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {conv.lastMessageDate
                        ? format(new Date(conv.lastMessageDate), "dd.MM.yyyy HH:mm")
                        : ""}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-[#00aff5] text-white px-2 py-0.5 rounded-full text-xs">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
              {activeRequest && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                  onClick={() => setShowDetailsDialog(true)}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Vezi Detalii
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
                        <p className="font-medium">{activeRequest.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-medium">{activeRequest.status}</p>
                      </div>
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