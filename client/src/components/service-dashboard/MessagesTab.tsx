
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
  ArrowLeft,
  FileText,
  Calendar,
  Eye,
  Info,
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

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/service/messages', activeConversation?.requestId],
    queryFn: async () => {
      if (!activeConversation?.requestId) return [];

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
      return data.sort((a: Message, b: Message) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
    enabled: !!activeConversation?.requestId
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

  const { data: offerDetails } = useQuery({
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          receiverId: activeConversation.userId,
          requestId: activeConversation.requestId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/service/messages', activeConversation.requestId] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite mesajul"
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

  const handleConversationSelect = (conv: { userId: number; userName: string; requestId: number }) => {
    setActiveConversation(conv);
    if (initialConversation) {
      onConversationClear?.();
    }
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

      <CardContent className="flex-1 flex p-0 min-h-0">
        <div className={`${activeConversation ? 'hidden md:block' : ''} w-1/3 border-r h-full flex flex-col`}>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Conversații</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
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

        {activeConversation ? (
          <div className="flex-1 flex flex-col h-full">
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
              <div className="space-y-4 py-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
                  </div>
                ) : (
                  renderMessages()
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t mt-auto">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Scrie un mesaj..."
                  className="flex-1"
                />
                <Button type="submit" className="bg-[#00aff5] text-white hover:bg-[#00aff5]/90">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Selectează o conversație pentru a începe
          </div>
        )}
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
                  <h3 className="font-medium text-lg mb-2">Detalii Cerere</h3>
                  <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Titlu Cerere</p>
                      <p className="font-medium">{offerDetails.requestTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Descriere Cerere</p>
                      <p className="font-medium">{offerDetails.requestDescription}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-lg mb-2">Detalii Ofertă</h3>
                  <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Titlu</p>
                      <p className="font-medium">{offerDetails.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Preț</p>
                      <p className="font-medium text-[#00aff5]">{offerDetails.price} RON</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Detalii</p>
                      <p className="font-medium whitespace-pre-wrap">{offerDetails.details}</p>
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
