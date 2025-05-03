import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrFetchCsrfToken } from "@/lib/csrfToken";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Clock,
  Eye,
  MessageSquare,
  SendHorizontal,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import type { Request as RequestType } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { SubmitOfferForm } from "./SubmitOfferForm";
import websocketService from "@/lib/websocket";
import { ConversationInfo } from "@/pages/ServiceDashboard";
import type { Offer } from "@shared/schema";

const ITEMS_PER_PAGE = 5;

interface RequestsTabProps {
  onMessageClick?: (conversationInfo: ConversationInfo) => void;
}

export default function RequestsTab({ onMessageClick }: RequestsTabProps) {
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestType | null>(null);

  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<RequestType[]>({
    queryKey: ['/api/service/requests'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      return response.json();
    },
    staleTime: 0
  });

  const { data: viewedRequestIds = [], isFetching: isFetchingViewedRequests } = useQuery<number[]>({
    queryKey: ['/api/service/viewed-requests'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/viewed-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch viewed requests');
      }

      const viewedRequests = await response.json();
      return viewedRequests.map((vr: any) => vr.requestId);
    }
  });

  const { data: serviceOffers = [] } = useQuery<Offer[]>({
    queryKey: ['/api/service/offers'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/offers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      return response.json();
    }
  });


  const markRequestAsViewed = async (requestId: number) => {
    try {
      // Import the fetchWithCsrf function from the csrfToken module
      const { fetchWithCsrf } = await import('@/lib/csrfToken');
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetchWithCsrf(`/api/service/mark-request-viewed/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // fetchWithCsrf will automatically add the CSRF token
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark request as viewed');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/service/viewed-requests'] });
    } catch (error) {
      console.error('Error marking request as viewed:', error);
      throw error; // Rethrow to allow the calling function to handle it
    }
  };

  const handleViewRequest = async (request: RequestType) => {
    try {
      const isNew = !viewedRequestIds.includes(request.id);
      if (isNew) {
        await markRequestAsViewed(request.id);
      }
      setSelectedRequest(request);
      setShowViewDialog(true);
    } catch (error) {
      console.error("Error viewing request details:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut marca cererea ca vizualizată. Încercați din nou.",
      });
    }
  };

  const handleSubmitOfferClick = async (request: RequestType) => {
    const isNew = !viewedRequestIds.includes(request.id);
    if (isNew) {
      await markRequestAsViewed(request.id);
    }
    setSelectedRequest(request);
    setShowOfferDialog(true);
  };

  const handleSubmitOffer = async (values: any) => {
    try {
      // Import the fetchWithCsrf function from the csrfToken module
      const { fetchWithCsrf } = await import('@/lib/csrfToken');
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      console.log("[Debug] Submitting offer with fetchWithCsrf");
      
      // Use fetchWithCsrf which handles CSRF tokens properly
      const response = await fetchWithCsrf(`/api/service/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
          // fetchWithCsrf will automatically add the CSRF token
        },
        body: JSON.stringify({
          requestId: selectedRequest?.id,
          ...values
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to submit offer');
      }

      const offerData = await response.json();
      console.log("Offer submitted successfully:", offerData);

      // Invalidate relevant queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/service/offers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/service/requests"] });

      setShowOfferDialog(false);
      toast({
        title: "Succes",
        description: "Oferta a fost trimisă cu succes!",
      });
    } catch (error: any) {
      console.error("Error submitting offer:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message || "Nu s-a putut trimite oferta. Încercați din nou.",
      });
    }
  };

  const handleCloseOfferDialog = () => {
    setShowOfferDialog(false);
  };

  const handleMessageClick = async (request: RequestType) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      let clientName = `Client ${request.clientId}`;

      try {
        const response = await fetch(`/api/service/client/${request.clientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const clientData = await response.json();
            if (clientData && clientData.name) {
              clientName = clientData.name;
            }
          }
        }
      } catch (clientError) {
        console.warn('Could not fetch client details, using default name:', clientError);
      }

      const isNew = !viewedRequestIds.includes(request.id);
      if (isNew) {
        await markRequestAsViewed(request.id);
      }

      if (onMessageClick) {
        onMessageClick({
          userId: request.clientId,
          userName: clientName,
          requestId: request.id,
          sourceTab: 'request'
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut începe conversația. Încercați din nou.",
      });
    }
  };

  const filteredRequests = requests.filter(req => {
    if (req.status !== "Active") return false;
    if (showOnlyNew && viewedRequestIds.includes(req.id)) return false;
    const hasExistingOffer = serviceOffers.some(offer => offer.requestId === req.id);
    if (hasExistingOffer) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const newRequestsCount = filteredRequests.filter(req => !viewedRequestIds.includes(req.id)).length;

  if (isLoading || isFetchingViewedRequests) {
    return (
      <div className="text-center py-4 text-gray-500">Se încarcă...</div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#00aff5]" />
            <CardTitle className="text-[#00aff5]">
              Cereri în Așteptare
              {newRequestsCount > 0 && (
                <span className="ml-3 px-3 py-1 text-sm bg-[#00aff5] text-white rounded-full">
                  {newRequestsCount}
                </span>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Doar cereri noi</span>
            <Switch
              checked={showOnlyNew}
              onCheckedChange={setShowOnlyNew}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentRequests.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titlu</TableHead>
                    <TableHead>Data preferată</TableHead>
                    <TableHead>Data trimiterii</TableHead>
                    <TableHead>Locație</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {request.title}
                          {!viewedRequestIds.includes(request.id) && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                              NOU
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.preferredDate), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.createdAt), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell>
                        {request.cities?.join(", ")}, {request.county}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                          {request.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRequest(request)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Detalii
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMessageClick(request)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Mesaj
                          </Button>
                          {request.status === "Active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSubmitOfferClick(request)}
                              className="text-green-500 hover:text-green-700 hover:bg-green-50 flex items-center gap-1"
                            >
                              <SendHorizontal className="h-4 w-4" />
                              Trimite ofertă
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "În curând",
                                description: "Funcționalitatea de respingere va fi disponibilă în curând.",
                              });
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                          >
                            <X className="h-4 w-4" />
                            Respinge
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Pagina {currentPage} din {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Nu există cereri active în acest moment pentru locația dvs.
          </div>
        )}

        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalii Cerere</DialogTitle>
              <DialogDescription>
                Informații despre cererea selectată
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-3">
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
                  <p className="whitespace-pre-line">{selectedRequest.description}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Data preferată
                  </h3>
                  <p>
                    {format(new Date(selectedRequest.preferredDate), "dd.MM.yyyy")}
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
                  <p>{selectedRequest.cities?.join(", ")}, {selectedRequest.county}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {selectedRequest && (
          <SubmitOfferForm
            isOpen={showOfferDialog}
            onClose={handleCloseOfferDialog}
            request={selectedRequest}
            onSubmit={handleSubmitOffer}
          />
        )}
      </CardContent>
    </Card>
  );
}