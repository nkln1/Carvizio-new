import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMessagesManagement } from '@/hooks/useMessagesManagement';
import MessagesView from '@/components/messages/MessagesView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

interface MessagesListProps {
  setActiveTab?: (tab: string) => void;
  initialConversation?: {
    userId: string;
    userName?: string;
    requestId: string;
    offerId?: string;
  } | null;
}

export default function MessagesList({ setActiveTab, initialConversation }: MessagesListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [messageToSend, setMessageToSend] = useState('');
  const {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    isLoadingConversations,
    isLoadingMessages,
    sendMessage,
    markConversationAsRead,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems,
    startIndex
  } = useMessagesManagement({ initialConversation });

  // Invalidarea query-ului când se selectează o conversație
  const handleSelectConversation = (conversation: any) => {
    setActiveConversation({
      userId: conversation.userId,
      userName: conversation.userName,
      requestId: conversation.requestId,
      offerId: conversation.offerId
    });

    // Invalidare expresă pentru contorul de mesaje necitite
    markConversationAsRead(conversation.requestId, conversation.userId);
    queryClient.invalidateQueries({ 
      queryKey: ["unreadConversationsCount"],
      exact: true
    });

    // Forțează o revalidare imediată
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["unreadConversationsCount"] });
    }, 500);
  };

  const handleSendMessage = async () => {
    if (!messageToSend.trim() || !activeConversation) return;

    try {
      await sendMessage(messageToSend);
      setMessageToSend('');

      // Invalidare pentru a actualiza contorul după trimiterea unui mesaj
      queryClient.invalidateQueries({ queryKey: ["unreadConversationsCount"] });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="grid h-full flex-1 md:grid-cols-7 lg:grid-cols-5">
      <div className="col-span-2 h-full md:border-r lg:col-span-1">
        <div className="flex h-full flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Conversații</h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-muted-foreground">Încărcare conversații...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">Nu aveți conversații active</div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4 px-2">
                  <div className="text-sm text-gray-500">
                    Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} din {totalItems} conversații
                  </div>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => setItemsPerPage(Number(value))}
                  >
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
                </div>

                {conversations.map((conversation) => (
                  <div
                    key={`${conversation.requestId}-${conversation.userId}`}
                    className={`mb-2 cursor-pointer rounded-lg p-3 transition-colors ${
                      activeConversation?.requestId === conversation.requestId &&
                      activeConversation?.userId === conversation.userId
                        ? 'bg-accent/30'
                        : 'hover:bg-accent/10'
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="font-medium">{conversation.userName}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage || "Fără mesaje"}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="mt-1 text-xs font-medium text-[#00aff5]">
                        {conversation.unreadCount} mesaje necitite
                      </div>
                    )}
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex justify-center mt-4">
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
        </div>
      </div>
      <div className="col-span-5 h-full lg:col-span-4">
        <MessagesView
          messages={messages}
          isLoading={isLoadingMessages}
          activeConversation={activeConversation}
          messageToSend={messageToSend}
          setMessageToSend={setMessageToSend}
          handleSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}