
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMessagesManagement } from '@/hooks/useMessagesManagement';
import MessagesView from '@/components/messages/MessagesView';

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
    markConversationAsRead
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
              conversations.map((conversation) => (
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
              ))
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
