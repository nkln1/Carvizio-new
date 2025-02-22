import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import {
  MessageSquare,
  Send,
  Loader2,
  User,
  ArrowLeft,
  FileText,
  Calendar,
  Eye,
  Info,
  Clock,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import websocketService from "@/lib/websocket";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  senderName: string;
  receiverName: string;
  senderRole: 'client' | 'service';
  receiverRole: 'client' | 'service';
  requestId: number;
}

interface ActiveConversation {
  userId: number;
  userName: string;
  requestId: number;
}

interface MessagesTabProps {
  initialConversation?: { userId: number; userName: string; requestId: number } | null;
  onConversationClear?: () => void;
}

export default function MessagesTab({
  initialConversation,
  onConversationClear
}: MessagesTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(initialConversation || null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/service/conversations'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      return response.json();
    }
  });

  const { data: activeRequest } = useQuery({
    queryKey: ['/api/service/requests', activeConversation?.requestId],
    queryFn: async () => {
      if (!activeConversation?.requestId) return null;

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/requests/${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch request details');
      }

      return response.json();
    },
    enabled: !!activeConversation?.requestId
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/service/messages', activeConversation?.requestId],
    queryFn: async () => {
      if (!activeConversation) return [];

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/messages/${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      // Sort messages by date, oldest first
      return data.sort((a: Message, b: Message) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
    enabled: !!activeConversation
  });

  const { data: offerDetails, isLoading: offerLoading } = useQuery({
    queryKey: ['/api/service/offers', activeConversation?.requestId],
    queryFn: async () => {
      if (!activeConversation?.requestId) return null;
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/offers/${activeConversation.requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch offer details');
      }

      return response.json();
    },
    enabled: !!activeConversation?.requestId
  });

  useEffect(() => {
    const handleWebSocketMessage = (data: any) => {
      if (data.type === 'NEW_MESSAGE') {
        queryClient.invalidateQueries({ queryKey: ['/api/service/messages', activeConversation?.requestId] });
      }
    };

    const removeHandler = websocketService.addMessageHandler(handleWebSocketMessage);
    return () => {
      removeHandler();
    };
  }, [activeConversation?.requestId, queryClient]);

  useEffect(() => {
    if (initialConversation) {
      setActiveConversation(initialConversation);
    }
  }, [initialConversation]);

  useEffect(() => {
    if (messages?.length && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, activeConversation]);


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          requestId: activeConversation.requestId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage("");
      await queryClient.invalidateQueries({ queryKey: ['/api/service/messages', activeConversation.requestId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/service/conversations'] });

      // Scroll to bottom after sending a message
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
      });
    }
  };

  const handleBack = () => {
    setActiveConversation(null);
    if (initialConversation) {
      onConversationClear?.();
    }
  };

  const renderMessages = () => {
    if (!messages.length) return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Nu există mesaje încă</p>
      </div>
    );

    return (
      <AnimatePresence>
        {messages.map((message: Message, index: number) => {
          const currentDate = new Date(message.createdAt).toDateString();
          const previousDate = index > 0
            ? new Date(messages[index - 1].createdAt).toDateString()
            : null;
          const showDateSeparator = currentDate !== previousDate;

          return (
            <>
              {showDateSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
                    {format(new Date(message.createdAt), "d MMMM yyyy")}
                  </div>
                </div>
              )}
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 mb-4 ${
                  message.senderRole === 'service' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.senderRole !== 'service' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.senderName?.substring(0, 2).toUpperCase() || 'CL'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] relative ${
                    message.senderRole === 'service'
                      ? 'bg-[#00aff5] text-white rounded-t-2xl rounded-l-2xl'
                      : 'bg-gray-100 rounded-t-2xl rounded-r-2xl'
                  } p-3`}
                >
                  <div className="text-xs mb-1 font-medium">
                    {message.senderName}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${
                    message.senderRole === 'service' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {format(new Date(message.createdAt), "HH:mm")}
                  </div>
                </div>
                {message.senderRole === 'service' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.senderName?.substring(0, 2).toUpperCase() || 'SP'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            </>
          );
        })}
      </AnimatePresence>
    );
  };

  const handleConversationSelect = (conv: { userId: number; userName: string; requestId: number }) => {
    setActiveConversation(conv);
    if (initialConversation) {
      onConversationClear?.();
    }
  };

  const renderConversations = () => {
    if (!conversations.length) return (
      <div className="text-center py-4 text-gray-500">
        Nu există conversații încă
      </div>
    );

    return conversations.map((conv: any) => (
      <motion.div
        key={`${conv.userId}-${conv.requestId}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => handleConversationSelect({
            userId: conv.userId,
            userName: conv.userName || `Client ${conv.userId}`,
            requestId: conv.requestId
          })}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {(conv.userName || `C${conv.userId}`).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{conv.userName || `Client ${conv.userId}`}</h4>
                    <p className="text-sm text-muted-foreground">{conv.requestTitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {conv.lastMessageDate ? format(new Date(conv.lastMessageDate), "dd.MM.yyyy HH:mm") : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {conv.lastMessage}
                </p>
                {conv.requestTitle && (
                  <div className="flex items-center gap-1 mt-1">
                    <FileText className="h-3 w-3 opacity-60" />
                    <p className="text-xs truncate opacity-60">
                      {conv.requestTitle}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ));
  };

  return (
    <Card className="h-[calc(100vh-12rem)] flex flex-col border-[#00aff5]/20">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          {activeConversation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mr-2 hover:bg-gray-100 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Înapoi
            </Button>
          )}
          <MessageSquare className="h-5 w-5" />
          {activeConversation
            ? `Chat cu ${activeConversation.userName}`
            : "Mesaje"}
        </CardTitle>
        {activeConversation && (
          <div className="flex justify-between items-center">
            <CardDescription>
              Comunicare directă cu clienții
            </CardDescription>
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
        <div className={`${activeConversation ? 'hidden md:block' : ''} w-1/3 border-r flex flex-col`}>
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium text-gray-500">Conversații</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {conversationsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
                </div>
              ) : (
                renderConversations()
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {activeConversation ? (
            <>
              <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
                <div className="py-4">
                  {messagesLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {renderMessages()}
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t mt-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Scrie un mesaj..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" className="bg-[#00aff5] hover:bg-[#0099d6]">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2">
                  Apasă Enter pentru a trimite mesajul
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Începe o conversație dintr-o ofertă acceptată</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalii Complete Cerere și Ofertă</DialogTitle>
          </DialogHeader>

          {offerDetails && (
            <ScrollArea className="h-full max-h-[60vh] pr-4">
              <div className="space-y-6 p-2">
                <div>
                  <h3 className="font-medium text-lg mb-2">Informații Client</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Nume Client</p>
                      <p className="font-medium">{offerDetails.clientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Telefon Client</p>
                      <p className="font-medium">{offerDetails.clientPhone}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-lg mb-2">Detalii Cerere Client</h3>
                  <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Titlu Cerere</p>
                      <p className="font-medium">{offerDetails.requestTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Descriere Cerere</p>
                      <p className="font-medium">{offerDetails.requestDescription}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Data Preferată Client</p>
                      <p className="font-medium">
                        {format(new Date(offerDetails.requestPreferredDate), "dd.MM.yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Locație</p>
                      <p className="font-medium">
                        {offerDetails.requestCities.join(", ")}, {offerDetails.requestCounty}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-lg mb-2">Informații Ofertă</h3>
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
                      <p className="text-sm text-gray-600">Date disponibile</p>
                      <p className="font-medium">
                        {offerDetails.availableDates.map((date: string) =>
                          format(new Date(date), "dd.MM.yyyy")
                        ).join(", ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className={`font-medium ${
                        offerDetails.status === 'Accepted' ? 'text-green-600' :
                          offerDetails.status === 'Rejected' ? 'text-red-600' :
                            'text-yellow-600'
                      }`}>
                        {offerDetails.status}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-lg mb-2">Detalii Ofertă</h3>
                  <p className="whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                    {offerDetails.details}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-lg mb-2">Istoric</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-32">Creat:</span>
                      <span>{format(new Date(offerDetails.createdAt), "dd.MM.yyyy HH:mm")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}