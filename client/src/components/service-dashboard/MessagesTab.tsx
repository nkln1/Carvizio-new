import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessagesManagement } from "@/hooks/useMessagesManagement";
import { ConversationList } from "./messages/ConversationList";
import { ConversationView } from "./messages/ConversationView";
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

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        await websocketService.ensureConnection();
      } catch (error) {
        console.error('Failed to setup WebSocket connection:', error);
      }
    };

    setupWebSocket();
  }, []);

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
          <MessageSquare className="h-5 w-5" />
          {activeConversation ? `Chat cu ${activeConversation.userName}` : "Mesaje"}
        </CardTitle>
        <CardDescription>Comunicare directă cu clienții și gestionarea conversațiilor</CardDescription>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4">
            <ConversationList
              conversations={conversations}
              isLoading={isLoadingConversations}
              activeConversationId={activeConversation?.userId}
              onSelectConversation={handleConversationSelect}
            />
          </div>
        </ScrollArea>
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