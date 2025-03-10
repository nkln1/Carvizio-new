import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Loader2, Send, FileText } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import type { Message } from "@shared/schema";

// Message card component
function MessageCard({ message, isCurrentUser }: { message: Message; isCurrentUser: boolean }) {
  const messageDate = new Date(message.createdAt);
  const formattedDate = format(messageDate, "dd MMM, HH:mm", { locale: ro });

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[80%]`}>
        <Avatar className={`h-8 w-8 ${isCurrentUser ? 'bg-[#00aff5]' : 'bg-gray-600'}`}>
          <div className="text-xs font-medium text-white">
            {isCurrentUser ? 'You' : message.senderName?.charAt(0) || '?'}
          </div>
        </Avatar>

        <div className={`rounded-lg p-3 ${
          isCurrentUser 
            ? 'bg-[#00aff5] text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <div className="flex flex-col">
            <div className="text-sm font-medium">
              {isCurrentUser ? 'Tu' : message.senderName || 'Necunoscut'}
            </div>
            <div className="mt-1 text-sm whitespace-pre-wrap">{message.content}</div>
            <div className={`text-xs mt-1 ${
              isCurrentUser ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {formattedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConversationViewProps {
  messages: Message[];
  userName: string;
  currentUserId: number;
  isLoading?: boolean;
  onBack: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onViewDetails?: () => void;
  showDetailsButton?: boolean;
}

export function ConversationView({
  messages,
  userName,
  currentUserId,
  isLoading = false,
  onBack,
  onSendMessage,
  onViewDetails,
  showDetailsButton = false
}: ConversationViewProps) {
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Log messages to debug
  console.log("ConversationView messages:", messages);
  console.log("ConversationView currentUserId:", currentUserId);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!messageContent.trim()) return;

    setIsSending(true);
    try {
      await onSendMessage(messageContent);
      setMessageContent("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <CardHeader className="py-2 px-4 bg-gray-50 border-b flex flex-row justify-between items-center">
        <div className="flex items-center">
          <div className="font-semibold">{userName}</div>
        </div>

        {showDetailsButton && onViewDetails && (
          <Button 
            onClick={onViewDetails}
            variant="outline"
            size="sm"
            className="text-xs flex items-center gap-1"
          >
            <FileText className="h-3 w-3" />
            Detalii
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-grow relative overflow-hidden">
        <ScrollArea className="h-[400px] p-4" ref={scrollAreaRef}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-[#00aff5] mb-2" />
              <p className="text-sm text-gray-500">Se încarcă mesajele...</p>
            </div>
          ) : !Array.isArray(messages) || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <p>Nu există mesaje încă.</p>
              <p className="text-sm mt-2">Trimite un mesaj pentru a începe o conversație.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                // For client dashboard, the client is the current user
                const isCurrentUser = message.senderRole === "client";
                // Use the message's senderName property if available, otherwise fallback
                const senderName = isCurrentUser ? "You" : (message.senderName || userName);

                return (
                  <MessageCard
                    key={index}
                    message={message}
                    isCurrentUser={isCurrentUser}
                    senderName={senderName}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-2 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <Input
            placeholder="Scrie un mesaj..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            disabled={isSending}
            className="flex-grow"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isSending || !messageContent.trim()}
            className="bg-[#00aff5] hover:bg-[#0099e6]"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardFooter>
    </>
  );
}