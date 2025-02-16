import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MessagesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mesaje</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Mesajele vor apărea aici.</p>
      </CardContent>
    </Card>
  );
}
