import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  clientName: string;
  requestTitle: string;
  lastMessage: Message;
  unreadCount: number;
}

const MessageCard = ({ conversation }: { conversation: Conversation }) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="mb-4 cursor-pointer hover:shadow-md transition-shadow duration-200">
      <div className="p-4 flex items-start gap-4">
        <Avatar className="h-10 w-10 bg-blue-100 text-blue-700">
          <span>{getInitials(conversation.clientName || "Client Necunoscut")}</span>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-medium text-sm">
                {conversation.clientName || "Client Necunoscut"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {conversation.requestTitle}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">
                {format(new Date(conversation.lastMessage.timestamp), "HH:mm", {
                  locale: ro,
                })}
              </span>
              {conversation.unreadCount > 0 && (
                <Badge variant="default" className="bg-blue-500">
                  {conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-1">
            {conversation.lastMessage.content}
          </p>
        </div>
      </div>
    </Card>
  );
};

const MessagesSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-start gap-4 p-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

export const MessagesTab = () => {
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-lg font-medium mb-4">Mesaje</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Comunicare directă cu clienții și gestionarea conversațiilor
      </p>

      {isLoading ? (
        <MessagesSkeleton />
      ) : (
        <div className="space-y-4">
          {conversations?.map((conversation: Conversation) => (
            <MessageCard key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </div>
  );
};