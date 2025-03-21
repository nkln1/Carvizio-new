import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { useMessagesManagement } from "@/hooks/useMessagesManagement";
import MessagesView from "@/components/messages/MessagesView";
import { ConversationList } from "@/components/service-dashboard/messages/ConversationList";
import { MessageDetailsDialog } from "./MessageDetailsDialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import websocketService from "@/lib/websocket";
import { auth } from "@/lib/firebase";
import type { Message, Conversation } from "@shared/schema";
import { Link } from "react-router-dom"; // Added Link import


export interface InitialConversationProps {
  userId: number;
  userName: string;
  requestId: number;
  offerId?: number;
  serviceProviderUsername?: string;
}

interface MessagesTabProps {
  initialConversation?: InitialConversationProps | null;
  onConversationClear?: () => void;
}

export function MessagesTab({
  initialConversation,
  onConversationClear,
}: MessagesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [wsInitialized, setWsInitialized] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [offerData, setOfferData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [messageToSend, setMessageToSend] = useState('');

  const {
    activeConversation,
    setActiveConversation,
    messages,
    conversations,
    isLoadingMessages,
    isLoadingConversations,
    sendMessage,
    markConversationAsRead,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems,
    startIndex
  } = useMessagesManagement(initialConversation, true);

  // Effect for handling initialConversation updates
  useEffect(() => {
    if (initialConversation?.userId && initialConversation?.requestId) {
      setActiveConversation({
        userId: initialConversation.userId,
        userName: initialConversation.userName,
        requestId: initialConversation.requestId,
        offerId: initialConversation.offerId,
        serviceProviderUsername: initialConversation.serviceProviderUsername
      });

      // Mark conversation as read when opened directly
      markConversationAsRead(initialConversation.requestId, initialConversation.userId);
    }
  }, [initialConversation?.userId, initialConversation?.requestId, initialConversation?.offerId, markConversationAsRead, initialConversation?.serviceProviderUsername]);

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

  const handleConversationSelect = async (conv: {
    userId: number;
    userName: string;
    requestId: number;
    offerId?: number;
    serviceProviderUsername?: string;
  }) => {
    console.log("Selected conversation in MessagesTab:", conv);
    setActiveConversation(conv);
    if (onConversationClear) {
      onConversationClear();
    }

    // Mark conversation as read when selected
    await markConversationAsRead(conv.requestId, conv.userId);
  };

  const handleViewDetails = async () => {
    if (!activeConversation?.requestId) return;
    
    console.log("Viewing details for conversation:", activeConversation);
    
    setIsLoadingData(true);
    setRequestData(null);
    setOfferData(null);

    try {
      // Load request details
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      console.log("Fetching request details for requestId:", activeConversation.requestId);
      const response = await fetch(`/api/requests/${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response for request details:', errorText);
        throw new Error(`Failed to load request details: ${errorText}`);
      }

      const data = await response.json();
      console.log("Received request data:", data);
      setRequestData(data);

      // Try to fetch offers for this request even if no offerId is in the conversation
      console.log("Fetching offers for requestId:", activeConversation.requestId);
      const offersResponse = await fetch(`/api/client/offers?requestId=${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (offersResponse.ok) {
        const offersData = await offersResponse.json();
        console.log("Received offers data:", offersData);
        
        // Find an offer from this service provider
        if (offersData && offersData.length > 0) {
          // Use the offerId from the conversation if available, otherwise use the first offer
          const offerToShow = activeConversation.offerId 
            ? offersData.find(offer => offer.id === activeConversation.offerId) 
            : offersData[0];
          
          if (offerToShow) {
            setOfferData(offerToShow);
          }
        }
      } else {
        console.warn(`No offers found for request ID ${activeConversation.requestId}`);
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

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (conv.userName && conv.userName.toLowerCase().includes(searchLower)) ||
      (conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchLower))
    );
  });
  
  // Log conversation data for debugging
  useEffect(() => {
    if (conversations.length > 0) {
      console.log("All conversations with offerId:", conversations.map(c => ({ 
        requestId: c.requestId, 
        userId: c.userId, 
        offerId: c.offerId 
      })));
    }
  }, [conversations]);

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
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-500">
                    Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} din {totalItems} conversații
                  </div>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => setItemsPerPage(Number(value))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Număr de conversații" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 pe pagină</SelectItem>
                      <SelectItem value="10">10 pe pagină</SelectItem>
                      <SelectItem value="20">20 pe pagină</SelectItem>
                      <SelectItem value="50">50 pe pagină</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ConversationList 
                  conversations={filteredConversations}
                  isLoading={false}
                  onSelectConversation={handleConversationSelect}
                />
                {totalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, index) => (
                        <PaginationItem key={index}>
                          <Button
                            variant={currentPage === index + 1 ? "default" : "outline"}
                            onClick={() => setCurrentPage(index + 1)}
                            className="w-10"
                          >
                            {index + 1}
                          </Button>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
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
              <div>
                <Button 
                  onClick={handleViewDetails}
                  variant="outline"
                  className="ml-auto"
                >
                  {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vezi detalii cerere și ofertă"}
                </Button>
              </div>
            </div>

            {activeConversation && (
              <div className="flex flex-col h-[70vh] border rounded-md shadow">
                <MessagesView
                  messages={messages}
                  activeConversation={activeConversation}
                  isLoading={isLoadingMessages}
                  messageToSend={messageToSend}
                  setMessageToSend={setMessageToSend}
                  handleSendMessage={async () => {
                    if (!messageToSend.trim()) return Promise.resolve();
                    await sendMessage(messageToSend);
                    setMessageToSend('');
                    return Promise.resolve();
                  }}
                  serviceProviderUsername={activeConversation.serviceProviderUsername}
                />
              </div>
            )}
          </div>
        )}

        <MessageDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          requestData={requestData}
          offerData={offerData}
          isLoadingData={isLoadingData}
        />
      </CardContent>
    </Card>
  );
}

export default MessagesTab;