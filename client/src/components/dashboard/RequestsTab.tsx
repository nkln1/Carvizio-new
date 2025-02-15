
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Request as RequestType } from "@shared/schema";

interface RequestsTabProps {
  requests: RequestType[];
  isLoading: boolean;
  onCreateRequest: () => void;
}

export function RequestsTab({ requests, isLoading, onCreateRequest }: RequestsTabProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-blue-600 bg-blue-100";
      case "Rezolvat":
        return "text-green-600 bg-green-100";
      case "Anulat":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const filterRequestsByStatus = (status: string) => {
    return requests.filter(request => request.status === status);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Cererile mele
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="Active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="Active">Active</TabsTrigger>
            <TabsTrigger value="Rezolvat">Rezolvate</TabsTrigger>
            <TabsTrigger value="Anulat">Anulate</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
            </div>
          ) : (
            <>
              {["Active", "Rezolvat", "Anulat"].map((status) => (
                <TabsContent key={status} value={status}>
                  {filterRequestsByStatus(status).length > 0 ? (
                    <div className="space-y-4">
                      {filterRequestsByStatus(status).map((request) => (
                        <div
                          key={request.id}
                          className="p-4 bg-white rounded-lg border border-gray-200 hover:border-[#00aff5] transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">#{request.id}</p>
                              <p className="text-sm text-gray-600">{request.description}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(request.createdAt).toLocaleDateString('ro-RO')}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                                request.status
                              )}`}
                            >
                              {request.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500">Nu aveți cereri {status.toLowerCase()} în acest moment.</p>
                      {status === "Active" && (
                        <Button
                          onClick={onCreateRequest}
                          variant="outline"
                          className="mt-4"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Creează prima cerere
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
