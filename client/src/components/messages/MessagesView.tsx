import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, InfoIcon } from "lucide-react";
import { format } from "date-fns";
import cn from 'classnames';
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
  formatMessageDate: (date: string | Date) => string; // Added function type
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
  showDetailsButton = false,
  formatMessageDate // Added parameter
}: MessagesViewProps) {
  const [isSending, setIsSending] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll doar în interiorul containerului de mesaje, fără a afecta scroll-ul paginii întregi
    if (endOfMessagesRef.current && messagesContainerRef.current) {
      // Folosim scrollTo al containerului în loc de scrollIntoView care afectează toată pagina
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const onSendMessage = async () => {
    if (!messageToSend.trim()) return;

    setIsSending(true);
    try {
      await handleSendMessage();

      // Focus pe textarea și scroll doar în containerul de mesaje
      if (textareaRef.current) {
        textareaRef.current.focus();
      }

      // Scroll manual în containerul de mesaje, fără a afecta pagina
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 100); // Un mic delay pentru a permite mesajului să fie adăugat în DOM
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

  // Log messages for debugging
  useEffect(() => {
    if (messages && messages.length > 0) {
      console.log("MessagesView: Rendering messages:", messages.length);
    } else {
      console.log("MessagesView: No messages to render or messages is empty", messages);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b">
        <div className="flex-1">
          <h3 className="text-lg font-medium">{activeConversation?.userName || 'Conversație'}</h3>
          {serviceProviderUsername && (
            <p className="text-sm text-gray-500">Service: {serviceProviderUsername}</p>
          )}
          <p className="text-xs text-gray-400">
            Conversație ID: {activeConversation?.requestId} | User ID: {activeConversation?.userId}
          </p>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]" 
        ref={messagesContainerRef}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            Nu există mesaje în această conversație. Trimiteți un mesaj pentru a începe.
          </div>
        ) : (
          Array.isArray(messages) && messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-md",
                  message.isFromCurrentUser 
                    ? "bg-[#00aff5] text-white" 
                    : "bg-gray-100 text-gray-900"
                )}
              >
                <div className="break-words">{message.content}</div>
                <div 
                  className={cn(
                    "text-xs mt-1",
                    message.isFromCurrentUser ? "text-white/80" : "text-gray-500"
                  )}
                >
                  {formatMessageDate(message.createdAt)}
                </div>
              </div>
            </div>
          ))
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