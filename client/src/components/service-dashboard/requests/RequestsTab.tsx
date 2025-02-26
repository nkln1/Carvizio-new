import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { SearchBar } from "../offers/SearchBar";
import type { Request } from "@/types/dashboard";
import { RequestCard } from "./RequestCard";
import { RequestDetailsDialog } from "./RequestDetailsDialog";
import { useRequestsManagement } from "@/hooks/useRequestsManagement";
import type { ConversationInfo } from "@/pages/ServiceDashboard";

interface RequestsTabProps {
  onMessageClick?: (conversationInfo: ConversationInfo) => void;
}

export function RequestsTab({ onMessageClick }: RequestsTabProps) {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [viewedRequests, setViewedRequests] = useState<Set<number>>(new Set());
  const {
    requests,
    totalRequests,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    startIndex,
    handleCancelRequest,
    markRequestViewed
  } = useRequestsManagement();

  // Calculate request counts
  const activeCount = requests.filter((req: Request) => req.status === "Active").length;
  const solvedCount = requests.filter((req: Request) => req.status === "Rezolvat").length;
  const canceledCount = requests.filter((req: Request) => req.status === "Anulat").length;

  // Function to handle marking a request as viewed
  const handleRequestView = async (request: Request) => {
    if (!viewedRequests.has(request.id)) {
      await markRequestViewed(request.id);
      setViewedRequests(prev => new Set([...prev, request.id]));
    }
  };

  const handleMessageClick = (request: Request) => {
    if (onMessageClick) {
      const conversationInfo: ConversationInfo = {
        userId: request.clientId,
        userName: request.clientName || `Client ${request.clientId}`,
        requestId: request.id,
        sourceTab: 'request'
      };
      onMessageClick(conversationInfo);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6 flex justify-center items-center min-h-[200px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
            <p className="text-muted-foreground">Se încarcă cererile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-2">A apărut o eroare la încărcarea cererilor</p>
            <Button onClick={() => window.location.reload()}>Reîncearcă</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              Active ({activeCount})
            </TabsTrigger>
            <TabsTrigger
              value="solved"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white transition-colors"
            >
              Rezolvate ({solvedCount})
            </TabsTrigger>
            <TabsTrigger
              value="canceled"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white transition-colors"
            >
              Anulate ({canceledCount})
            </TabsTrigger>
          </TabsList>

          <div className="flex justify-between items-center mb-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => setItemsPerPage(Number(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selectează numărul de cereri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 cereri pe pagină</SelectItem>
                <SelectItem value="10">10 cereri pe pagină</SelectItem>
                <SelectItem value="20">20 cereri pe pagină</SelectItem>
                <SelectItem value="50">50 cereri pe pagină</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {["active", "solved", "canceled"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="grid grid-cols-1 gap-4">
                {requests
                  .filter((req: Request) => {
                    if (tab === "active") return req.status === "Active";
                    if (tab === "solved") return req.status === "Rezolvat";
                    if (tab === "canceled") return req.status === "Anulat";
                    return false;
                  })
                  .map((request: Request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onView={(request) => {
                        handleRequestView(request);
                        setSelectedRequest(request);
                      }}
                      onCancel={handleCancelRequest}
                      onMessage={handleMessageClick}
                      isViewed={viewedRequests.has(request.id)}
                    />
                  ))}

                {requests.filter((req: Request) => {
                  if (tab === "active") return req.status === "Active";
                  if (tab === "solved") return req.status === "Rezolvat";
                  if (tab === "canceled") return req.status === "Anulat";
                  return false;
                }).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nu există cereri în această categorie.
                  </p>
                )}
              </div>
            </TabsContent>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalRequests)} din {totalRequests} cereri
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <PaginationItem key={index}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(index + 1)}
                        className={currentPage === index + 1 ? "bg-[#00aff5] text-white" : ""}
                      >
                        {index + 1}
                      </Button>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Următor
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Tabs>
      </CardContent>

      <RequestDetailsDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      />
    </Card>
  );
}