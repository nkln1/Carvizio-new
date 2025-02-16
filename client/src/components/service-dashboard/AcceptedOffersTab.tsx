import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AcceptedOffersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Oferte Acceptate</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Lista ofertelor acceptate va apărea aici.</p>
      </CardContent>
    </Card>
  );
}
