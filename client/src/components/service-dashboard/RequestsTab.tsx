import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Clock,
  Eye,
  MessageSquare,
  SendHorizontal,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import type { Request as RequestType } from "@shared/schema";
import { SubmitOfferForm } from "./SubmitOfferForm";

export default function RequestsTab() {
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestType | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [selectedOfferRequest, setSelectedOfferRequest] = useState<RequestType | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_REQUEST') {
          // Invalidate and refetch requests when a new one is received
          queryClient.invalidateQueries({ queryKey: ['/api/service/requests'] });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, [queryClient]);

  // Fetch requests that match the service's location
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
    }
  });

  // Filter requests by those with and without offers
  const requestsWithOffers = requests.filter(req => req.hasReceivedOffer);
  const requestsWithoutOffers = requests.filter(req => !req.hasReceivedOffer);

  const handleSendOfferClick = (request: RequestType) => {
    setSelectedOfferRequest(request);
    setShowOfferForm(true);
  };

  const handleOfferSubmit = async (values: any) => {
    if (selectedOfferRequest) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No authentication token available');

        const response = await fetch(`/api/requests/${selectedOfferRequest.id}/offers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          throw new Error('Failed to submit offer');
        }

        toast({
          title: "Succes",
          description: "Oferta a fost trimisă cu succes.",
        });

        // Refetch requests to update the UI
        queryClient.invalidateQueries({ queryKey: ['/api/service/requests'] });
        setShowOfferForm(false);
        setSelectedOfferRequest(null);
      } catch (error) {
        console.error('Error submitting offer:', error);
        toast({
          title: "Eroare",
          description: "Nu s-a putut trimite oferta. Încercați din nou.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      toast({
        title: "Succes",
        description: "Cererea a fost respinsă.",
      });

      // Refetch requests to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/service/requests'] });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut respinge cererea. Încercați din nou.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#00aff5] flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cereri în Așteptare
            </CardTitle>
          </div>
          <CardDescription>
            Vezi și gestionează cererile care așteaptă ofertă
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Se încarcă...</div>
          ) : requestsWithoutOffers.length > 0 ? (
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
                {requestsWithoutOffers.map((request) => (
                  <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium">
                      {request.title}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/messages/${request.id}`}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Mesaj
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendOfferClick(request)}
                          className="text-green-500 hover:text-green-700 hover:bg-green-50 flex items-center gap-1"
                        >
                          <SendHorizontal className="h-4 w-4" />
                          Trimite ofertă
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRejectRequest(request.id)}
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
          ) : (
            <div className="text-center py-4 text-gray-500">
              Nu există cereri active în acest moment pentru locația dvs.
            </div>
          )}
        </CardContent>
      </Card>

      {requestsWithOffers.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-[#00aff5] flex items-center gap-2">
              <SendHorizontal className="h-5 w-5" />
              Cereri cu Oferte Trimise
            </CardTitle>
            <CardDescription>
              Cereri pentru care ai trimis deja oferte
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                {requestsWithOffers.map((request) => (
                  <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium">
                      {request.title}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/messages/${request.id}`}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Mesaj
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalii Cerere</DialogTitle>
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

      {selectedOfferRequest && (
        <SubmitOfferForm
          isOpen={showOfferForm}
          onClose={() => {
            setShowOfferForm(false);
            setSelectedOfferRequest(null);
          }}
          request={selectedOfferRequest}
          onSubmit={handleOfferSubmit}
        />
      )}
    </>
  );
}