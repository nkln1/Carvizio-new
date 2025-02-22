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
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import websocketService from "@/lib/websocket";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

      return response.json();
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        {messages.map((message: Message) => (
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
        ))}
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
      <div
        key={`${conv.userId}-${conv.requestId}`}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
          activeConversation?.userId === conv.userId && activeConversation?.requestId === conv.requestId
            ? 'bg-[#00aff5] text-white'
            : 'hover:bg-gray-100'
        }`}
        onClick={() => handleConversationSelect({
          userId: conv.userId,
          userName: conv.userName || `Client ${conv.userId}`,
          requestId: conv.requestId
        })}
      >
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            {(conv.userName || `C${conv.userId}`).substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{conv.userName || `Client ${conv.userId}`}</p>
          {conv.lastMessage && (
            <p className="text-sm opacity-70 truncate">{conv.lastMessage}</p>
          )}
        </div>
      </div>
    ));
  };

  return (
    <Card className="h-[calc(100vh-12rem)] border-[#00aff5]/20">
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          {activeConversation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mr-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
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
      <CardContent className="p-0 flex h-[calc(100%-5rem)]">
        <div className={`${activeConversation ? 'hidden md:block' : ''} w-1/3 border-r p-4`}>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Conversații</h3>
          </div>
          <ScrollArea className="h-full">
            {conversationsLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
              </div>
            ) : (
              renderConversations()
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {activeRequest && (
                <div className="bg-gray-50 m-4 rounded-lg p-4 space-y-4 text-sm">
                  <h4 className="font-medium flex items-center gap-2 text-gray-700">
                    <FileText className="h-4 w-4" /> Cererea Clientului
                  </h4>
                  <p><span className="text-gray-600">Titlu:</span> {activeRequest.title}</p>
                  <p><span className="text-gray-600">Descriere:</span> {activeRequest.description}</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Data Preferată:</span>
                    {format(new Date(activeRequest.preferredDate), "dd.MM.yyyy")}
                  </p>
                </div>
              )}
              <ScrollArea className="flex-1 px-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    {renderMessages()}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <div className="p-4 border-t">
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
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalii Cerere și Ofertă</DialogTitle>
            <DialogDescription>
              Informații complete despre cererea clientului și oferta trimisă
            </DialogDescription>
          </DialogHeader>

          {activeRequest && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Detalii Cerere
                </h3>
                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="font-medium">Titlu:</span> {activeRequest.title}
                  </div>
                  <div>
                    <span className="font-medium">Descriere:</span> {activeRequest.description}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Data Preferată:</span>
                    {format(new Date(activeRequest.preferredDate), "dd.MM.yyyy")}
                  </div>
                </div>
              </div>

              {offerDetails && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Detalii Ofertă
                  </h3>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="font-medium">Preț Estimat:</span> {offerDetails.price} RON
                    </div>
                    <div>
                      <span className="font-medium">Detalii:</span> {offerDetails.details}
                    </div>
                    <div>
                      <span className="font-medium">Note:</span> {offerDetails.notes || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{' '}
                      <span className={
                        offerDetails.status === 'Accepted' ? 'text-green-600' :
                        offerDetails.status === 'Rejected' ? 'text-red-600' :
                        'text-yellow-600'
                      }>
                        {offerDetails.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}