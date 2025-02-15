import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MessagesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mesaje</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Nu există mesaje noi.</p>
      </CardContent>
    </Card>
  );
}
