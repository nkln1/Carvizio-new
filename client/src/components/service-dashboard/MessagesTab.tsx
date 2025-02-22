import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  id: number;
  content: string;
  senderId: number;
  senderRole: "client" | "service";
  receiverId: number;
  receiverRole: "client" | "service";
  createdAt: string;
  senderName: string;
  receiverName: string;
}

interface MessagesTabProps {
  selectedUserId?: number;
  selectedUserName?: string;
  selectedRequestId?: number;
}

export default function MessagesTab({ selectedUserId, selectedUserName, selectedRequestId }: MessagesTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: messages = [], isLoading, error, refetch } = useQuery<Message[]>({
    queryKey: [`/api/messages/${selectedRequestId}`],
    queryFn: async () => {
      if (!selectedRequestId) return [];

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/messages/${selectedRequestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      return response.json();
    },
    enabled: !!selectedRequestId,
    refetchInterval: 5000
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId || !selectedRequestId) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          receiverId: selectedUserId,
          receiverRole: "client",
          requestId: selectedRequestId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage("");
      refetch();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite mesajul. Încercați din nou."
      });
    }
  };

  if (!selectedRequestId || !selectedUserId) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Mesaje
          </CardTitle>
          <CardDescription>
            Selectați o cerere din secțiunea Oferte pentru a începe o conversație
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg flex flex-col h-[calc(100vh-180px)]">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Conversație cu {selectedUserName}
        </CardTitle>
        <CardDescription>
          Scrieți un mesaj pentru a comunica cu clientul
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500">
            A apărut o eroare la încărcarea mesajelor
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">
            Nu există mesaje în această conversație
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderRole === "service" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.senderRole === "service"
                      ? "bg-[#00aff5] text-white"
                      : "bg-gray-100"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {format(new Date(message.createdAt), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t mt-auto">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Scrieți un mesaj..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            Trimite
          </Button>
        </div>
      </div>
    </Card>
  );
}