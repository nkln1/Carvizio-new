import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SendHorizontal, Loader2 } from "lucide-react";

export default function SentOffersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <SendHorizontal className="h-5 w-5" />
          Oferte Trimise
        </CardTitle>
        <CardDescription>Urmărește și gestionează ofertele trimise către clienți</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Lista ofertelor trimise va apărea aici.</p>
      </CardContent>
    </Card>
  );
}
