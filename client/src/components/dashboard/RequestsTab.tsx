import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { auth } from "@/lib/firebase";
import type { Request as RequestType } from "@shared/schema";
import websocketService from "@/lib/websocket";

interface RequestsTabProps {
  requests: RequestType[];
  isLoading: boolean;
  onCreateRequest: () => void;
}

export function RequestsTab({
  requests,
  isLoading,
  onCreateRequest,
}: RequestsTabProps) {
  const [selectedRequest, setSelectedRequest] = useState<RequestType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();

  // Calculate request counts and filter requests by status
  const activeRequests = requests.filter(req => req.status === "Active");
  const solvedRequests = requests.filter(req => req.status === "Rezolvat");
  const canceledRequests = requests.filter(req => req.status === "Anulat");

  const activeCount = activeRequests.length;
  const solvedCount = solvedRequests.length;
  const canceledCount = canceledRequests.length;

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Pentru debugging - verifică dacă datele vin corect și se filtrează corespunzător
  useEffect(() => {
    console.log("All requests:", requests);
    console.log("Active requests:", activeRequests);
    console.log("Solved requests:", solvedRequests);
    console.log("Canceled requests:", canceledRequests);
  }, [requests]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const handleWebSocketMessage = (data: any) => {
      if (data.type === 'REQUEST_STATUS_CHANGED') {
        queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      }
    };

    const removeHandler = websocketService.addMessageHandler(handleWebSocketMessage);

    return () => {
      removeHandler();
    };
  }, []);

  const handleDelete = async (requestId: number) => {
    try {
      // Import the fetchWithCsrf function from the csrfToken module
      const { fetchWithCsrf } = await import('@/lib/csrfToken');

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetchWithCsrf(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "Anulat" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel request");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/requests"] });

      toast({
        title: "Success",
        description: "Cererea a fost anulată cu succes.",
      });
    } catch (error) {
      console.error("Error canceling request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nu s-a putut anula cererea. Încercați din nou.",
      });
    }
    setShowDeleteDialog(false);
  };

  // Helpers for pagination
  const getPaginatedRequests = (filteredRequests: RequestType[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  };

  // Helper function to render request row
  const renderRequestRow = (request: RequestType) => (
    <TableRow
      key={request.id}
      className="hover:bg-gray-50 transition-colors"
    >
      <TableCell className="font-medium">
        {request.title}
      </TableCell>
      <TableCell>
        {format(
          new Date(request.preferredDate),
          "dd.MM.yyyy",
        )}
      </TableCell>
      <TableCell>
        {format(new Date(request.createdAt), "dd.MM.yyyy")}
      </TableCell>
      <TableCell>
        {request.cities?.join(", ")}, {request.county}
      </TableCell>
      <TableCell>
        <span
          className={`px-2 py-1 rounded-full text-sm ${
            request.status === "Active"
              ? "bg-yellow-100 text-yellow-800"
              : request.status === "Rezolvat"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {request.status}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedRequest(request);
              setShowViewDialog(true);
            }}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            Detalii
          </Button>
          {request.status !== "Anulat" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRequest(request);
                setShowDeleteDialog(true);
              }}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Anulează
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Helper function to render paginated content
  const renderPaginatedTable = (filteredRequests: RequestType[], emptyMessage: string) => {
    const paginatedRequests = getPaginatedRequests(filteredRequests);
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;

    return (
      <>
        {filteredRequests.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-500">
              Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRequests.length)} din {filteredRequests.length} cereri
            </div>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Număr de cereri" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num} pe pagină</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titlu</TableHead>
              <TableHead>Data preferată</TableHead>
              <TableHead>Data trimiterii</TableHead>
              <TableHead>Locație</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequests.length > 0 ? (
              paginatedRequests.map(renderRequestRow)
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline" size="icon"
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
                    onClick={() => setCurrentPage(index + 1)}
                    className="w-10"
                  >
                    {index + 1}
                  </Button>
                </PaginationItem>
              ))}

              <PaginationItem>
                <Button
                  variant="outline" size="icon"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </>
    );
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
        <Tabs 
          defaultValue="active" 
          className="w-full" 
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            console.log("Tab changed to:", value);
          }}
        >
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

          {activeTab === "active" && (
            <div className="mt-2">
              {renderPaginatedTable(activeRequests, "Nu există cereri active.")}
            </div>
          )}

          {activeTab === "solved" && (
            <div className="mt-2">
              {renderPaginatedTable(solvedRequests, "Nu există cereri rezolvate.")}
            </div>
          )}

          {activeTab === "canceled" && (
            <div className="mt-2">
              {renderPaginatedTable(canceledRequests, "Nu există cereri anulate.")}
            </div>
          )}
        </Tabs>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Anulați această cerere?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Cererea va fi mutată în
              categoria "Anulate".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nu</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedRequest && handleDelete(selectedRequest.id)
              }
              className="bg-red-500 hover:bg-red-600"
            >
              Da, anulează cererea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalii Cerere</DialogTitle>
            <DialogDescription>
              Vizualizați toate detaliile cererii selectate
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Titlu
                </h3>
                <p>{selectedRequest.title}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Descriere
                </h3>
                <p className="whitespace-pre-line">
                  {selectedRequest.description}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Data preferată
                </h3>
                <p>
                  {format(
                    new Date(selectedRequest.preferredDate),
                    "dd.MM.yyyy",
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Data trimiterii
                </h3>
                <p>
                  {format(new Date(selectedRequest.createdAt), "dd.MM.yyyy")}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Locație
                </h3>
                <p>
                  {selectedRequest.cities?.join(", ")}, {selectedRequest.county}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Status
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-sm ${
                    selectedRequest.status === "Active"
                      ? "bg-yellow-100 text-yellow-800"
                      : selectedRequest.status === "Rezolvat"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedRequest.status}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}