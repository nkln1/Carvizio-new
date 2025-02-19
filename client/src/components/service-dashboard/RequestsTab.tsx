import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  X
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import type { Request as RequestType } from "@shared/schema";

export default function RequestsTab() {
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestType | null>(null);
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

  const markRequestAsViewed = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/service/requests/${requestId}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark request as viewed');
      }

      // Invalidate and refetch requests
      queryClient.invalidateQueries({ queryKey: ['/api/service/requests'] });
    } catch (error) {
      console.error('Error marking request as viewed:', error);
    }
  };

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
    },
    gcTime: 0,
    staleTime: 0
  });

  // Filter only active requests
  const activeRequests = requests?.filter(req => req.status === "Active") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Cereri în Așteptare
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Se încarcă...</div>
        ) : activeRequests.length > 0 ? (
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
              {activeRequests.map((request) => (
                <TableRow 
                  key={request.id} 
                  className={`transition-colors ${
                    !request.viewed 
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {request.title}
                      {!request.viewed && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-semibold">
                          Nou
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowViewDialog(true);
                          if (!request.viewed) {
                            markRequestAsViewed(request.id);
                          }
                        }}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Detalii
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!request.viewed) {
                            markRequestAsViewed(request.id);
                          }
                          toast({
                            title: "În curând",
                            description: "Funcționalitatea de mesaje va fi disponibilă în curând.",
                          });
                        }}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Mesaj
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-[#00aff5] hover:bg-[#0099d6] flex items-center gap-1"
                        onClick={() => {
                          if (!request.viewed) {
                            markRequestAsViewed(request.id);
                          }
                          toast({
                            title: "În curând",
                            description: "Funcționalitatea de trimitere ofertă va fi disponibilă în curând.",
                          });
                        }}
                      >
                        <SendHorizontal className="h-4 w-4" />
                        Trimite Ofertă
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!request.viewed) {
                            markRequestAsViewed(request.id);
                          }
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
        ) : (
          <div className="text-center py-4 text-gray-500">
            Nu există cereri active în acest moment pentru locația dvs.
          </div>
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
      </CardContent>
    </Card>
  );
}