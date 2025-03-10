import React from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types/message";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface MessageCardProps {
  message: Message;
  isMine: boolean;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, isMine }) => {
  // Format the date
  const formattedDate = format(new Date(message.createdAt), "d MMM, HH:mm", {
    locale: ro,
  });

  return (
    <div
      className={cn("flex", {
        "justify-end": isMine,
        "justify-start": !isMine,
      })}
    >
      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-2 shadow-sm",
          {
            "bg-primary text-primary-foreground": isMine,
            "bg-gray-100": !isMine,
          }
        )}
      >
        <div className="mb-1 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div
          className={cn("text-xs", {
            "text-primary-foreground/80": isMine,
            "text-gray-500": !isMine,
          })}
        >
          {formattedDate}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MessageCard);