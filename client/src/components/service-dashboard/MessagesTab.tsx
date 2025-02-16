import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function MessagesTab() {
  return (
    <Card>
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
        <p className="text-muted-foreground">Mesajele vor apărea aici.</p>
      </CardContent>
    </Card>
  );
}
