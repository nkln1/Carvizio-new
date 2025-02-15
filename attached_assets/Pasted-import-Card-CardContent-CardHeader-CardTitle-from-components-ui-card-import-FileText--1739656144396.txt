import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestsTable } from "./RequestsTable";
import type { Car, Request } from "@/types/dashboard";

interface MyRequestsProps {
  requests: Request[];
  cars: Car[];
  onDelete?: (id: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
}

export function MyRequests({
  requests,
  cars,
  onDelete,
  refreshRequests,
}: MyRequestsProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Cererile mele
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4 bg-slate-100 p-1">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white transition-colors"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="solved"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white transition-colors"
            >
              Rezolvate
            </TabsTrigger>
            <TabsTrigger
              value="canceled"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white transition-colors"
            >
              Anulate
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <RequestsTable
              requests={requests.filter((req) => req.status === "Active")}
              cars={cars}
              onDelete={onDelete}
              refreshRequests={refreshRequests}
            />
          </TabsContent>
          <TabsContent value="solved">
            <RequestsTable
              requests={requests.filter((req) => req.status === "Rezolvat")}
              cars={cars}
              onDelete={onDelete}
              refreshRequests={refreshRequests}
            />
          </TabsContent>
          <TabsContent value="canceled">
            <RequestsTable
              requests={requests.filter((req) => req.status === "Anulat")}
              cars={cars}
              onDelete={onDelete}
              refreshRequests={refreshRequests}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default MyRequests;
