import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, InfoIcon } from "lucide-react";
import { format } from "date-fns";
import type { Message } from "@shared/schema";

interface MessagesViewProps {
  messages: Message[];
  isLoading: boolean;
  activeConversation: {
    userId: number | string;
    userName: string;
    requestId: number | string;
    offerId?: number | string;
    serviceProviderUsername?: string;
  };
  messageToSend: string;
  setMessageToSend: (message: string) => void;
  handleSendMessage: () => Promise<void>;
  serviceProviderUsername?: string;
  onViewDetails?: () => void;
  showDetailsButton?: boolean;
}

export default function MessagesView({
  messages,
  isLoading,
  activeConversation,
  messageToSend,
  setMessageToSend,
  handleSendMessage,
  serviceProviderUsername,
  onViewDetails,
  showDetailsButton = false
}: MessagesViewProps) {
  const [isSending, setIsSending] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endOfMessagesRef.current && messagesContainerRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const onSendMessage = async () => {
    if (!messageToSend.trim()) return;

    setIsSending(true);
    try {
      await handleSendMessage();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const renderMessageTime = (createdAt: Date | string) => {
    return format(new Date(createdAt), 'dd.MM.yyyy HH:mm');
  };

  return (
    <div className="flex flex-col h-[70vh]">
      <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <span>
              {typeof activeConversation.userName === 'string'
                ? activeConversation.userName.substring(0, 2).toUpperCase()
                : 'US'}
            </span>
          </Avatar>
          <div className="font-medium">
            {serviceProviderUsername ? (
              <a
                href={`/service/${serviceProviderUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {activeConversation.userName}
              </a>
            ) : (
              activeConversation.userName
            )}
          </div>
        </div>
        {showDetailsButton && onViewDetails && (
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            <InfoIcon className="h-4 w-4 mr-1" />
            {activeConversation.offerId ? "Vezi detalii cerere și ofertă" : "Vezi detalii cerere"}
          </Button>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-50" ref={messagesContainerRef} style={{ minHeight: "200px" }}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            Trimite primul mesaj pentru a începe conversația
          </div>
        ) : (
          <div className="space-y-4">
            {messages.slice().reverse().map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === Number(activeConversation.userId) ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.senderId === Number(activeConversation.userId)
                      ? 'bg-white border border-gray-200'
                      : 'bg-[#00aff5] text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.senderId === Number(activeConversation.userId) ? 'text-gray-500' : 'text-blue-100'
                    }`}
                  >
                    {renderMessageTime(message.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endOfMessagesRef} />
          </div>
        )}
      </div>

      <div className="p-3 border-t mt-auto sticky bottom-0 bg-white">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Scrie un mesaj..."
            value={messageToSend}
            onChange={(e) => setMessageToSend(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[2.5rem] max-h-[7.5rem] resize-none flex-1"
            disabled={isSending}
          />
          <Button
            onClick={onSendMessage}
            disabled={!messageToSend.trim() || isSending}
            className="self-end shrink-0"
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}