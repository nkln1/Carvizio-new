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
          <span>{isCurrentUser ? 'C' : 'S'}</span>
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