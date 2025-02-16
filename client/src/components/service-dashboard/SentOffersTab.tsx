import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SentOffersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Oferte Trimise</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Lista ofertelor trimise va apărea aici.</p>
      </CardContent>
    </Card>
  );
}
