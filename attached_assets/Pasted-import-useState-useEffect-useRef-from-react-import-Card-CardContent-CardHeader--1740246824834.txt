import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  SendHorizontal,
  Loader2,
  Eye,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Calendar,
  CreditCard,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { Request, Message } from "@/types/service";
import { Separator } from "@/components/ui/separator";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MessageGroup {
  requestId: string;
  requestTitle: string;
  lastMessage: Message;
  unreadCount: number;
  clientName: string;
}

interface ServiceMessagesSectionProps {
  messageGroups: MessageGroup[];
  messages: Message[];
  selectedMessageRequest: Request | null;
  isViewingConversation: boolean;
  messageContent: string;
  sendingMessage: boolean;
  onMessageContentChange: (content: string) => void;
  onSendMessage: () => Promise<void>;
  onSelectConversation: (requestId: string) => void;
  onBackToList: () => void;
  onViewRequestDetails: (requestId: string) => void;
  userId: string;
  serviceName: string;
  markMessageAsRead?: (messageId: string) => Promise<void>;
}

interface Offer {
  id: string;
  requestId: string;
  serviceId: string;
  clientId: string;
  status: string;
  createdAt: any;
  title: string;
  details: string;
  availableDate: string;
  price: number;
  notes?: string;
}

const formatDateSafely = (dateValue: any) => {
  if (!dateValue) return "N/A";
  try {
    const date = dateValue && typeof dateValue.toDate === 'function'
      ? dateValue.toDate()
      : new Date(dateValue);
    return format(date, "dd.MM.yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "N/A";
  }
};

export function ServiceMessagesSection({
  messageGroups,
  messages,
  selectedMessageRequest,
  isViewingConversation,
  messageContent,
  sendingMessage,
  onMessageContentChange,
  onSendMessage,
  onSelectConversation,
  onBackToList,
  onViewRequestDetails,
  userId,
  serviceName,
  markMessageAsRead,
}: ServiceMessagesSectionProps) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      if (!selectedMessageRequest) return;

      try {
        const offersRef = collection(db, "offers");
        const q = query(
          offersRef,
          where("requestId", "==", selectedMessageRequest.id),
          where("serviceId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const offerData = querySnapshot.docs[0].data() as Offer;
          setOffer({ ...offerData, id: querySnapshot.docs[0].id });
        }
      } catch (error) {
        console.error("Error fetching offer:", error);
      }
    };

    fetchOffer();
  }, [selectedMessageRequest, userId]);

  const formatMessageDate = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp && typeof timestamp.toDate === 'function'
        ? timestamp.toDate()
        : new Date(timestamp);

      if (isToday(date)) {
        return "Astăzi";
      } else if (isYesterday(date)) {
        return "Ieri";
      }
      return format(date, "dd.MM.yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp && typeof timestamp.toDate === 'function'
        ? timestamp.toDate()
        : new Date(timestamp);

      return format(date, "HH:mm");
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    if (isScrolledToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isScrolledToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    setIsScrolledToBottom(Math.abs(scrollHeight - scrollTop - clientHeight) < 10);
  };

  const renderMessagesList = () => (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-2">
        {messageGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nu există conversații active
          </p>
        ) : (
          messageGroups.map((group) => (
            <motion.div
              key={group.requestId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onSelectConversation(group.requestId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(group.clientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{group.clientName}</h4>
                          <p className="text-sm text-muted-foreground">{group.requestTitle}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {formatMessageDate(group.lastMessage?.createdAt)} {formatMessageTime(group.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {group.lastMessage?.content || "No messages"}
                      </p>
                    </div>
                    {group.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        {group.unreadCount}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </ScrollArea>
  );

  const renderConversationHeader = () => {
    const currentGroup = messageGroups.find(
      (g) => g.requestId === selectedMessageRequest?.id
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToList}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi
            </Button>
            <Avatar>
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {getInitials(currentGroup?.clientName || "??")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-sm">
                {currentGroup?.clientName}
              </h3>
              <p className="text-xs text-muted-foreground">
                ID Cerere: {selectedMessageRequest?.id}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRequestDetails(true)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            Detalii cerere
          </Button>
        </div>

        {selectedMessageRequest && offer && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4 text-sm">
            <div>
              <h4 className="font-medium flex items-center gap-2 text-gray-700 mb-2">
                <FileText className="h-4 w-4" />
                Cererea Clientului
              </h4>
              <div className="space-y-2 pl-6">
                <p><span className="text-gray-600">Titlu:</span> {selectedMessageRequest.title}</p>
                <p><span className="text-gray-600">Descriere:</span> {selectedMessageRequest.description}</p>
                <p>
                  <span className="text-gray-600">Data Preferată:</span>{" "}
                  {formatDateSafely(selectedMessageRequest.preferredDate)}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium flex items-center gap-2 text-gray-700 mb-2">
                <MessageSquare className="h-4 w-4" />
                Oferta Trimisă
              </h4>
              <div className="space-y-2 pl-6">
                <p><span className="text-gray-600">Titlu:</span> {offer.title}</p>
                <p><span className="text-gray-600">Detalii:</span> {offer.details}</p>
                <div className="flex gap-4">
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {formatDateSafely(offer.availableDate)}
                  </p>
                  <p className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    {offer.price} RON
                  </p>
                </div>
                {offer.notes && (
                  <p><span className="text-gray-600">Note:</span> {offer.notes}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderConversation = () => {
    if (!selectedMessageRequest) return null;

    const conversationMessages = messages
      .filter((msg) => msg.requestId === selectedMessageRequest.id)
      .sort((a, b) => {
        const dateA = a.createdAt && typeof a.createdAt.toDate === 'function'
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt).getTime();
        const dateB = b.createdAt && typeof b.createdAt.toDate === 'function'
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt).getTime();
        return dateA - dateB;
      });


    conversationMessages.forEach((message) => {
      if (message.toId === userId && !message.read && markMessageAsRead) {
        markMessageAsRead(message.id);
      }
    });

    let currentDate: Date | null = null;

    return (
      <div className="space-y-4 h-full flex flex-col">
        {renderConversationHeader()}

        <ScrollArea
          className="flex-1 pr-4"
          style={{ height: "calc(600px - 180px)" }}
          onScrollCapture={handleScroll}
        >
          <div className="space-y-4">
            <AnimatePresence>
              {conversationMessages.map((message) => {
                const messageDate = message.createdAt && typeof message.createdAt.toDate === 'function'
                  ? message.createdAt.toDate()
                  : new Date(message.createdAt);

                const showDateSeparator = !currentDate || !isSameDay(currentDate, messageDate);

                if (showDateSeparator) {
                  currentDate = messageDate;
                  return (
                    <div key={`date-${message.id}`}>
                      <div className="flex items-center justify-center my-4">
                        <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
                          {formatMessageDate(message.createdAt)}
                        </div>
                      </div>
                      {renderMessage(message, messageGroups.find(g => g.requestId === message.requestId))}
                    </div>
                  );
                }

                return renderMessage(message, messageGroups.find(g => g.requestId === message.requestId));
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              value={messageContent}
              onChange={(e) => onMessageContentChange(e.target.value)}
              placeholder="Scrie un mesaj..."
              className="flex-1 min-h-[80px] resize-none rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (messageContent.trim()) {
                    onSendMessage();
                  }
                }
              }}
            />
            <Button
              onClick={onSendMessage}
              disabled={!messageContent.trim() || sendingMessage}
              className="bg-[#00aff5] hover:bg-[#0099d6] self-end h-10"
            >
              {sendingMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se trimite...
                </>
              ) : (
                <>
                  <SendHorizontal className="mr-2 h-4 w-4" />
                  Trimite
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Apasă Enter pentru a trimite mesajul. Shift + Enter pentru linie nouă.
          </p>
        </div>
      </div>
    );
  };

  const renderMessage = (message: Message, currentGroup: MessageGroup | undefined) => {
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${message.fromId === userId ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[80%] ${
            message.fromId === userId
              ? "bg-blue-500 text-white rounded-t-2xl rounded-l-2xl"
              : "bg-gray-100 rounded-t-2xl rounded-r-2xl"
          } p-3 relative`}
        >
          <div className="text-xs mb-1 font-medium">
            {message.fromId === userId ? serviceName : currentGroup?.clientName}
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
          <div className={`flex items-center gap-1 mt-1 text-xs ${
            message.fromId === userId ? "text-blue-100" : "text-gray-500"
          }`}>
            {formatMessageTime(message.createdAt)}
            {message.fromId === userId && (
              <CheckCircle2 className="h-3 w-3" />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className="border-[#00aff5]/20">
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Mesaje
        </CardTitle>
        <CardDescription>
          Comunicare directă cu clienții și gestionarea conversațiilor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isViewingConversation ? renderConversation() : renderMessagesList()}
        <Dialog open={showRequestDetails} onOpenChange={setShowRequestDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalii Cerere</DialogTitle>
            </DialogHeader>
            {selectedMessageRequest && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Titlu</h3>
                  <p>{selectedMessageRequest.title}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Descriere</h3>
                  <p className="whitespace-pre-wrap">{selectedMessageRequest.description}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Data Preferată</h3>
                  <p>{formatDateSafely(selectedMessageRequest.preferredDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Locație</h3>
                  <p>{selectedMessageRequest.county} - {selectedMessageRequest.cities?.join(", ")}</p>
                </div>
                {selectedMessageRequest.carDetails && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Detalii Mașină</h3>
                    <div className="space-y-2">
                      <p><span className="text-gray-600">Marcă:</span> {selectedMessageRequest.carDetails.make}</p>
                      <p><span className="text-gray-600">Model:</span> {selectedMessageRequest.carDetails.model}</p>
                      <p><span className="text-gray-600">An:</span> {selectedMessageRequest.carDetails.year}</p>
                      <p><span className="text-gray-600">Kilometraj:</span> {selectedMessageRequest.carDetails.mileage} km</p>
                      {selectedMessageRequest.carDetails.vin && (
                        <p><span className="text-gray-600">VIN:</span> {selectedMessageRequest.carDetails.vin}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default ServiceMessagesSection;