import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import MessageCard from "./MessageCard";
import { Message } from "@/types/message";

interface ConversationViewProps {
  messages: Message[];
  userName: string;
  currentUserId: number;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onBack: () => void;
  onViewDetails?: () => void;
  showDetailsButton?: boolean;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  userName,
  currentUserId,
  isLoading,
  onSendMessage,
  onBack,
  onViewDetails,
  showDetailsButton = false,
}) => {
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="md:hidden"
            >
              <ArrowLeft size={18} />
            </Button>
            <CardTitle className="text-base md:text-lg">{userName}</CardTitle>
          </div>
          {showDetailsButton && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewDetails}
              className="flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Detalii</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea 
          className="flex-1 p-4"
          ref={scrollAreaRef}
        >
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                  <Skeleton className={`h-[60px] w-[200px] rounded-lg ${i % 2 === 0 ? 'bg-blue-100' : 'bg-gray-100'}`} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-6">
              <div className="text-gray-500">
                <p className="mb-2">Nu există mesaje încă.</p>
                <p>Trimite un mesaj pentru a începe o conversație.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  isMine={message.senderId === currentUserId}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <form 
          onSubmit={handleSendMessage} 
          className="p-3 border-t flex gap-2 sticky bottom-0 bg-white"
        >
          <Input
            ref={inputRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Scrie un mesaj..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!messageText.trim()}>
            <Send size={18} />
          </Button>
        </form>
      </CardContent>
    </div>
  );
};

export default ConversationView;