import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RequestsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cereri de Service</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Lista cererilor va apărea aici.</p>
      </CardContent>
    </Card>
  );
}
