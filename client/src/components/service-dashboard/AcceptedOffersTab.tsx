import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SendHorizontal, Loader2, MessageSquare, Eye } from "lucide-react";

export default function AcceptedOffersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <SendHorizontal className="h-5 w-5" />
          Oferte Acceptate
        </CardTitle>
        <CardDescription>
          Gestionează ofertele acceptate de către clienți
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Lista ofertelor acceptate va apărea aici.
        </p>
      </CardContent>
    </Card>
  );
}
