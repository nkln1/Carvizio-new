import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  Eye,
  MessageSquare,
  SendHorizontal,
  X,
  ArrowUpDown,
  Loader2,
} from "lucide-react";

export default function RequestsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Cereri în Așteptare
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Lista cererilor va apărea aici.</p>
      </CardContent>
    </Card>
  );
}
