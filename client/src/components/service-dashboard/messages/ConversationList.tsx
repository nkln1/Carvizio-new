import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Conversation } from "@shared/schema";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: number;
  onSelectConversation: (conversation: Conversation) => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation
}: ConversationListProps) {
  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors duration-200 ${
            activeConversationId === conversation.userId ? 'bg-accent' : ''
          }`}
          onClick={() => onSelectConversation(conversation)}
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <span>{conversation.userName[0].toUpperCase()}</span>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{conversation.userName}</h3>
                  <p className="text-sm text-muted-foreground">{conversation.requestTitle}</p>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {conversation.lastMessage.content}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(conversation.lastMessage.timestamp), "dd.MM.yyyy HH:mm")}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="default" className="bg-blue-500">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
