import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, Loader2 } from "lucide-react";
import type { Conversation } from "@shared/schema";

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  activeConversationId?: number;
  onSelectConversation: (conv: { userId: number; userName: string; requestId: number; }) => void;
}

export function ConversationList({
  conversations,
  isLoading,
  activeConversationId,
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
            activeConversationId === conv.userId
              ? "bg-[#00aff5] text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() =>
            onSelectConversation({
              userId: conv.userId,
              userName: conv.userName || `Client ${conv.userId}`,
              requestId: conv.requestId,
            })
          }
        >
          <Avatar className="h-10 w-10">
            <span>
              {(conv.userName || `C${conv.userId}`).substring(0, 2).toUpperCase()}
            </span>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <p className="font-medium">
                {conv.userName || `Client ${conv.userId}`}
              </p>
              <span className="text-xs opacity-70">
                {conv.lastMessageDate
                  ? format(new Date(conv.lastMessageDate), "dd.MM.yyyy HH:mm")
                  : ""}
              </span>
            </div>
            <p className="text-sm opacity-70 truncate">{conv.lastMessage}</p>
            {conv.requestTitle && (
              <div className="flex items-center gap-1 mt-1">
                <FileText className="h-3 w-3 opacity-60" />
                <p
                  className={`text-xs truncate ${
                    activeConversationId === conv.userId
                      ? "opacity-90"
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
                  activeConversationId === conv.userId
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