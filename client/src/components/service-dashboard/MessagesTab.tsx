import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessagesManagement } from "@/hooks/useMessagesManagement";
import { ConversationList } from "./messages/ConversationList";
import { ConversationView } from "./messages/ConversationView";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import websocketService from "@/lib/websocket";

interface MessagesTabProps {
  initialConversation?: {
    userId: number;
    userName: string;
    requestId: number;
  } | null;
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
        // Retry after a delay if initialization fails
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
    <Card className="h-[calc(100vh-12rem)] flex flex-col border-[#00aff5]/20">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          {activeConversation ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mr-2 hover:bg-gray-100 gap-2"
            >
              Înapoi
            </Button>
          ) : null}
          <MessageSquare className="h-5 w-5" />
          {activeConversation ? `Chat cu ${activeConversation.userName}` : "Mesaje"}
        </CardTitle>
        {activeConversation && (
          <div className="flex justify-between items-center">
            <CardDescription>Comunicare directă cu clienții</CardDescription>
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
              onClick={() => setShowDetailsDialog(true)}
            >
              <Info className="h-4 w-4 mr-2" />
              Vezi Detalii Cerere și Ofertă
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex flex-1 min-h-0">
        <div className={`${activeConversation ? "hidden md:block" : ""} w-1/3 border-r flex flex-col`}>
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium text-gray-500">Conversații</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              <ConversationList
                conversations={conversations}
                isLoading={isLoadingConversations}
                activeConversationId={activeConversation?.userId}
                onSelectConversation={handleConversationSelect}
              />
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {activeConversation ? (
            <ConversationView
              messages={messages}
              userName={activeConversation.userName}
              currentUserId={user.id}
              isLoading={isLoadingMessages}
              onBack={handleBack}
              onSendMessage={sendMessage}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Selectează o conversație pentru a începe
            </div>
          )}
        </div>
      </CardContent>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalii Complete Cerere și Ofertă</DialogTitle>
            <DialogDescription>
              Vizualizați toate detaliile cererii și ofertei asociate acestei conversații
            </DialogDescription>
          </DialogHeader>
          {offerDetails && (
            <ScrollArea className="h-full max-h-[60vh] pr-4">
              <div className="space-y-6 p-2">
                {/* Offer Details Content */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-lg mb-2">Detalii Ofertă</h3>
                    <div className="flex flex-col gap-4 w-full">
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
                    </div>
                  </div>

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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}