import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare,
  SendHorizontal,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Calendar,
  CreditCard,
} from "lucide-react";

export function MessagesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Mesaje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Nu există mesaje noi.</p>
      </CardContent>
    </Card>
  );
}
