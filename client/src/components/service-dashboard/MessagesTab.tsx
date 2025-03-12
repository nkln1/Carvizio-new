import { useState, useEffect } from "react";
import { ConversationInfo } from "@/pages/ServiceDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMessagesManagement } from "@/hooks/useMessagesManagement";
import { Loader2, ArrowLeftCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchBar } from "./offers/SearchBar";

interface MessagesTabProps {
  initialConversation?: ConversationInfo | null;
  onConversationClear?: () => void;
}

export default function MessagesTab({ initialConversation, onConversationClear }: MessagesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<ConversationInfo | null>(null);
  const { messages, conversations, isLoadingMessages, isLoadingConversations, sendMessage, markConversationAsRead } = useMessagesManagement();

  // Pagination and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Set the initial conversation if provided
  useEffect(() => {
    if (initialConversation) {
      setSelectedConversation(initialConversation);
    }
  }, [initialConversation]);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversation) {
      const conversationId = conversations.find(
        (c) => c.userId === selectedConversation.userId && 
               c.requestId === selectedConversation.requestId && 
               c.offerId === selectedConversation.offerId
      )?.id;

      if (conversationId) {
        markConversationAsRead(conversationId);
      }
    }
  }, [selectedConversation, conversations, markConversationAsRead]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      await sendMessage({
        requestId: selectedConversation.requestId,
        userId: selectedConversation.userId,
        message: messageInput,
        offerId: selectedConversation.offerId,
      });
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Eroare la trimiterea mesajului. Încercați din nou.",
        variant: "destructive",
      });
    }
  };

  const filteredMessages = selectedConversation
    ? messages.filter(
        (message) => 
          message.requestId === selectedConversation.requestId && 
          ((message.fromUserId === selectedConversation.userId && message.toUserId === null) || 
          (message.toUserId === selectedConversation.userId && message.fromUserId === null)) &&
          (selectedConversation.offerId ? message.offerId === selectedConversation.offerId : true)
      )
    : [];

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation => {
    const searchString = searchTerm.toLowerCase();
    return (
      conversation.userName.toLowerCase().includes(searchString) ||
      conversation.lastMessage?.toLowerCase().includes(searchString) ||
      `cerere #${conversation.requestId}`.toLowerCase().includes(searchString) ||
      (conversation.offerId && `ofertă #${conversation.offerId}`.toLowerCase().includes(searchString))
    );
  });

  // Calculate pagination
  const totalConversations = filteredConversations.length;
  const totalPages = Math.ceil(totalConversations / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConversations = filteredConversations.slice(startIndex, startIndex + itemsPerPage);

  const clearConversation = () => {
    setSelectedConversation(null);
    if (onConversationClear) {
      onConversationClear();
    }
  };

  if (isLoadingConversations) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
            <p className="text-muted-foreground">Se încarcă conversațiile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#00aff5]">
            {selectedConversation ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={clearConversation}
                  className="mr-2"
                >
                  <ArrowLeftCircle className="h-5 w-5" />
                </Button>
                Conversație cu {selectedConversation.userName}
              </div>
            ) : (
              "Mesaje"
            )}
          </CardTitle>
          {!selectedConversation && (
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selectează numărul de conversații" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 conversații pe pagină</SelectItem>
                <SelectItem value="10">10 conversații pe pagină</SelectItem>
                <SelectItem value="20">20 conversații pe pagină</SelectItem>
                <SelectItem value="50">50 conversații pe pagină</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <CardDescription>
          {selectedConversation 
            ? `Cerere #${selectedConversation.requestId}${selectedConversation.offerId ? `, Ofertă #${selectedConversation.offerId}` : ''}`
            : "Selectați o conversație pentru a vedea mesajele"
          }
        </CardDescription>

        {!selectedConversation && (
          <div className="mt-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {selectedConversation ? (
          <div className="flex flex-col h-[600px]">
            <ScrollArea className="flex-1 p-4">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nu există mesaje în această conversație. Trimiteți primul mesaj!
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMessages.map((message) => {
                    const isOwn = message.fromUserId === null;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-2 items-start",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-slate-200 text-slate-700">
                              {selectedConversation.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 max-w-[80%]",
                            isOwn
                              ? "bg-[#00aff5] text-white"
                              : "bg-gray-100 text-gray-800"
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-sm">{message.message}</p>
                            <p className="text-xs opacity-70">
                              {message.createdAt ? format(new Date(message.createdAt), "dd MMM yyyy, HH:mm") : "Date unknown"}
                            </p>
                          </div>
                        </div>
                        {isOwn && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-[#00aff5] text-white">
                              S
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Scrieți un mesaj..."
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} className="bg-[#00aff5] hover:bg-[#0099d6]">
                  Trimite
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 divide-y">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nu s-au găsit conversații care să corespundă căutării." : "Nu există conversații."}
              </div>
            ) : (
              <>
                {paginatedConversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    variant="ghost"
                    className={`w-full justify-start py-3 rounded-none relative ${
                      conversation.unreadCount > 0 ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedConversation({
                        userId: conversation.userId,
                        userName: conversation.userName,
                        requestId: conversation.requestId,
                        offerId: conversation.offerId,
                      });
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-200 text-slate-700">
                          {conversation.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{conversation.userName}</p>
                        <p className="text-xs text-gray-500">
                          Cerere #{conversation.requestId}
                          {conversation.offerId && `, Ofertă #${conversation.offerId}`}
                        </p>
                        <p className="text-sm truncate text-gray-600">
                          {conversation.lastMessage || "Fără mesaje"}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {conversation.updatedAt ? format(new Date(conversation.updatedAt), "dd MMM") : "N/A"}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="absolute right-2 top-2 px-2 py-1 text-xs bg-[#00aff5] text-white rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </Button>
                ))}

                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 px-2">
                    <div className="text-sm text-gray-500">
                      Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalConversations)} din {totalConversations} conversații
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Anterior
                          </Button>
                        </PaginationItem>
                        {Array.from({ length: totalPages }).map((_, index) => (
                          <PaginationItem key={index}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(index + 1)}
                              className={currentPage === index + 1 ? "bg-[#00aff5] text-white" : ""}
                            >
                              {index + 1}
                            </Button>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Următor
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}