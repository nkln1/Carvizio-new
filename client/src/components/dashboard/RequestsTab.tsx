import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSearch, Clock, Filter, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRequestsManagement } from "@/hooks/useRequestsManagement";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RequestsTab() {
  const [activeTab, setActiveTab] = useState("active");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { requests, cancelRequest } = useRequestsManagement();

  // Calculate request counts by status
  const activeRequests = requests.filter((req) => req.status === "Active");
  const completedRequests = requests.filter((req) => req.status === "Completed");
  const cancelledRequests = requests.filter((req) => req.status === "Cancelled");

  // Helper function to get filtered requests based on status
  const getFilteredRequests = () => {
    switch (activeTab) {
      case "active":
        return activeRequests;
      case "resolved":
        return completedRequests;
      case "cancelled":
        return cancelledRequests;
      default:
        return activeRequests;
    }
  };

  const filteredRequests = getFilteredRequests();
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-blue-500">Activă</Badge>;
      case "Completed":
        return <Badge className="bg-green-500">Rezolvată</Badge>;
      case "Cancelled":
        return <Badge className="bg-red-500">Anulată</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
  };

  const handleCloseDialog = () => {
    setSelectedRequest(null);
  };

  const handleCancelRequest = async (requestId) => {
    if (window.confirm("Sigur doriți să anulați această cerere?")) {
      await cancelRequest(requestId);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          Cererile Mele
        </CardTitle>
        <CardDescription>Istoricul și statusul cererilor tale</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4 bg-slate-100 p-1">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white"
            >
              Active ({activeRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white"
            >
              Rezolvate ({completedRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="cancelled"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white"
            >
              Anulate ({cancelledRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {renderRequestsList(paginatedRequests, "Active")}
          </TabsContent>
          <TabsContent value="resolved">
            {renderRequestsList(paginatedRequests, "Completed")}
          </TabsContent>
          <TabsContent value="cancelled">
            {renderRequestsList(paginatedRequests, "Cancelled")}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalii Cerere</DialogTitle>
            <DialogDescription>
              Informații complete despre cererea ta
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-lg font-medium">
                  {selectedRequest.title} {getStatusBadge(selectedRequest.status)}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Creată la: {format(new Date(selectedRequest.createdAt), "dd.MM.yyyy")}
                </p>
              </div>
              <div>
                <h4 className="text-md font-medium mb-2">Descriere</h4>
                <p className="whitespace-pre-line">{selectedRequest.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-md font-medium mb-2">Detalii</h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Data preferată:</span>{" "}
                      {format(new Date(selectedRequest.preferredDate), "dd.MM.yyyy")}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Orașe:</span> {selectedRequest.cities.join(", ")}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Județ:</span> {selectedRequest.county}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium mb-2">Vehicul</h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Marcă:</span> {selectedRequest.carMake}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Model:</span> {selectedRequest.carModel}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">An:</span> {selectedRequest.carYear}
                    </p>
                  </div>
                </div>
              </div>

              {selectedRequest.status === "Active" && (
                <div className="flex justify-end mt-4">
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelRequest(selectedRequest.id)}
                  >
                    Anulează Cererea
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );

  function renderRequestsList(requests, expectedStatus) {
    const currentRequests = requests.filter(req => req.status === expectedStatus);

    if (currentRequests.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Nu există cereri în această categorie</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid gap-4">
          {currentRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-lg">{request.title}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {request.description}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(request.preferredDate), "dd.MM.yyyy")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Filter className="h-4 w-4" />
                        {request.cities.join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      onClick={() => handleViewRequest(request)}
                    >
                      Vezi detalii
                    </Button>
                    {request.status === "Active" && (
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        Anulează
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-500">
              Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRequests.length)} din {filteredRequests.length} cereri
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, index) => (
                  <PaginationItem key={index}>
                    <Button
                      variant={currentPage === index + 1 ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(index + 1)}
                      className={currentPage === index + 1 ? "bg-[#00aff5]" : ""}
                    >
                      {index + 1}
                    </Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </>
    );
  }
}