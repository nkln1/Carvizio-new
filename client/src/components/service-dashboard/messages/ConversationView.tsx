import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, InfoIcon, Send } from "lucide-react";
import { format } from "date-fns";
import type { Message } from "@shared/schema";

interface ConversationViewProps {
  messages: Message[];
  currentUserId: number;
  userName: string;
  isLoading: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onBack?: () => void;
  onViewDetails?: () => void;
  showDetailsButton?: boolean;
  serviceProviderUsername?: string; // Add this property
}

export function ConversationView({
  messages,
  currentUserId,
  userName,
  isLoading,
  onSendMessage,
  onBack,
  onViewDetails,
  showDetailsButton = false,
  serviceProviderUsername // Add to destructuring
}: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      await onSendMessage(newMessage);
      setNewMessage('');

      // Focus back on textarea after sending
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
      handleSendMessage();
    }
  };

  const renderMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'dd.MM.yyyy HH:mm');
  };

  return (
    <div className="flex flex-col h-[70vh]">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <span>{userName.substring(0, 2).toUpperCase()}</span>
          </Avatar>
          {serviceProviderUsername ? (
            <a
              href={`/service/${serviceProviderUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-blue-600 hover:underline"
            >
              {userName}
            </a>
          ) : (
            <span className="font-medium">{userName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showDetailsButton && (
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              <InfoIcon className="h-4 w-4 mr-1" />
              Detalii
            </Button>
          )}
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden">
              ← Înapoi
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
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
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.senderId === currentUserId
                      ? 'bg-[#00aff5] text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.senderId === currentUserId ? 'text-blue-100' : 'text-gray-500'
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

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Scrie un mesaj..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[2.5rem] max-h-[7.5rem] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="self-end"
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