import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, Loader2 } from "lucide-react";
import type { Conversation } from "@shared/schema";
import { Link } from "wouter"; //Import Link component

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  activeConversationId?: number;
  activeRequestId?: number;
  onSelectConversation: (conv: { 
    userId: number; 
    userName: string; 
    requestId: number; 
    offerId?: number; 
    sourceTab?: string;
    serviceProviderUsername?: string; // Add this property
  }) => void;
  onDeleteConversation?: (requestId: number, userId: number) => Promise<void>;
}

export function ConversationList({
  conversations,
  isLoading,
  activeConversationId,
  activeRequestId,
  onSelectConversation
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="text-center py-4 text-gray-500">
        Nu există conversații încă
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <div
          key={`${conv.userId}-${conv.requestId}`}
          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            activeConversationId === conv.userId && activeRequestId === conv.requestId
              ? "bg-[#00aff5] text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() =>
            onSelectConversation({
              userId: conv.userId,
              userName: conv.userName || `Client ${conv.userId}`,
              requestId: conv.requestId,
              offerId: conv.offerId,
              sourceTab: conv.sourceTab,
              serviceProviderUsername: conv.serviceProviderUsername // Add this line
            })
          }
        >
          <Avatar className="h-10 w-10 shrink-0">
            <span>
              {(conv.userName || `C${conv.userId}`).substring(0, 2).toUpperCase()}
            </span>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <p className="font-medium">
                {conv.serviceProviderUsername ? (
                  <a
                    href={`/service/${conv.serviceProviderUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${
                      activeConversationId === conv.userId && activeRequestId === conv.requestId
                        ? "text-white hover:text-blue-100"
                        : "text-blue-500 hover:text-blue-700"
                    } hover:underline`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {conv.userName || `Client ${conv.userId}`}
                  </a>
                ) : (
                  conv.userName || `Client ${conv.userId}`
                )}
              </p>
              <span className={`text-xs ${
                activeConversationId === conv.userId && activeRequestId === conv.requestId
                  ? "opacity-90"
                  : "opacity-70"
              }`}>
                {conv.lastMessageDate
                  ? format(new Date(conv.lastMessageDate), "dd.MM.yyyy HH:mm")
                  : ""}
              </span>
            </div>
            <p className={`text-sm truncate ${
              activeConversationId === conv.userId && activeRequestId === conv.requestId
                ? "opacity-90"
                : "opacity-70"
            }`}>{conv.lastMessage}</p>
            {conv.requestTitle && (
              <div className="flex items-center gap-1 mt-1">
                <FileText className="h-3 w-3 opacity-60" />
                <p
                  className={`text-xs truncate ${
                    activeConversationId === conv.userId && activeRequestId === conv.requestId
                      ? "opacity-90 font-medium"
                      : "opacity-60"
                  }`}
                >
                  {conv.requestTitle}
                </p>
              </div>
            )}
            {conv.unreadCount > 0 && (
              <Badge 
                variant="default" 
                className={`mt-1 ${
                  activeConversationId === conv.userId && activeRequestId === conv.requestId
                    ? "bg-white text-[#00aff5]"
                    : "bg-[#00aff5]"
                }`}
              >
                {conv.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}