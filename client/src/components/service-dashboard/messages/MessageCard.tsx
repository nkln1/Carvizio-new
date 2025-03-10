import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Message } from "@shared/schema";

interface MessageCardProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageCard({ message, isCurrentUser }: MessageCardProps) {
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[80%]`}>
        <Avatar className="h-8 w-8">
          <span>{isCurrentUser ? 'S' : 'C'}</span>
        </Avatar>
        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          <Card className={`p-3 ${
            isCurrentUser ? 'bg-[#00aff5] text-white' : 'bg-gray-100'
          }`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </Card>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), "dd.MM.yyyy HH:mm")}
            </span>
            {!message.isRead && !isCurrentUser && (
              <Badge variant="default" className="bg-blue-500">Nou</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Message } from "@shared/schema";

interface MessageCardProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageCard({ message, isCurrentUser }: MessageCardProps) {
  const formattedTime = format(new Date(message.createdAt), "HH:mm");
  const displayName = isCurrentUser ? "You" : message.senderName;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={cn(
      "flex items-start gap-2 max-w-[80%] mb-4",
      isCurrentUser ? "ml-auto flex-row-reverse" : ""
    )}>
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback className={isCurrentUser ? "bg-[#00aff5]" : "bg-gray-500"}>
          {initial}
        </AvatarFallback>
      </Avatar>
      <div>
        <div className={cn(
          "px-3 py-2 rounded-lg",
          isCurrentUser 
            ? "bg-[#00aff5] text-white rounded-tr-none" 
            : "bg-gray-100 text-gray-800 rounded-tl-none"
        )}>
          <p className="text-sm">{message.content}</p>
        </div>
        <div className="flex items-center mt-1 text-xs text-gray-500">
          <p className="font-medium">{displayName}</p>
          <span className="mx-1">•</span>
          <p>{formattedTime}</p>
        </div>
      </div>
    </div>
  );
}
