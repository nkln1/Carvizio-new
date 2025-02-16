import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informații Cont</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Informațiile contului vor apărea aici.</p>
      </CardContent>
    </Card>
  );
}
