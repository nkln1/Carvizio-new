import { z } from "zod";

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  senderName: string;
  receiverName: string;
  senderRole: "client" | "service";
  receiverRole: "client" | "service";
  requestId: number;
}

export interface Conversation {
  userId: number;
  userName: string;
  requestId: number;
  lastMessage: string;
  lastMessageDate: string;
  requestTitle?: string;
  unreadCount: number;
}
