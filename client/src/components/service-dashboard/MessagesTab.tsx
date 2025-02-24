import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  senderName: string;
  receiverName: string;
  senderRole: "client" | "service";
  receiverRole: "client" | "service";
  requestId: number;
  read: boolean;
}

interface Conversation {
  userId: number;
  userName: string;
  requestId: number;
  requestTitle: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

export default function MessagesTab() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { toast } = useToast();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/service/conversations"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No authentication token available");

      const response = await fetch("/api/service/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      return response.json();
    },
  });

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  if (isLoading) {
    return (
      <Card className="h-[calc(100vh-12rem)]">
        <CardHeader>
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mesaje
          </CardTitle>
          <CardDescription>
            Comunicare directă cu clienții și gestionarea conversațiilor
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-12rem)]">
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
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <AnimatePresence>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nu există conversații
              </div>
            ) : (
              conversations.map((conversation) => (
                <motion.div
                  key={`${conversation.userId}-${conversation.requestId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="mb-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleConversationClick(conversation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-[#00aff5] text-white">
                            {(conversation.userName || "CN").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {conversation.userName || "Client necunoscut"}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-[#00aff5] text-white text-xs rounded-full">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(new Date(conversation.lastMessageDate), "dd.MM.yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-600 mt-1">
                            {conversation.requestTitle}
                          </p>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}