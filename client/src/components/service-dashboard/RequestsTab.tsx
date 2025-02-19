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

const ITEMS_PER_PAGE = 5;

export default function RequestsTab() {
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestType | null>(null);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [viewedRequests, setViewedRequests] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load viewed requests from localStorage on component mount
  useEffect(() => {
    const loadViewedRequests = () => {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const storedViewed = localStorage.getItem(`viewed_requests_${userId}`);
        if (storedViewed) {
          setViewedRequests(new Set(JSON.parse(storedViewed)));
        }
      }
    };
    loadViewedRequests();
  }, []);

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
    staleTime: 0
  });

  // Handle request viewing
  const handleViewRequest = (request: RequestType) => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const newViewedRequests = new Set(viewedRequests);
      newViewedRequests.add(request.id);
      setViewedRequests(newViewedRequests);
      localStorage.setItem(`viewed_requests_${userId}`, JSON.stringify([...newViewedRequests]));
    }
    setSelectedRequest(request);
    setShowViewDialog(true);
  };

  // Filter active and unviewed requests
  const filteredRequests = requests.filter(req => {
    if (req.status !== "Active") return false;
    if (showOnlyNew && viewedRequests.has(req.id)) return false;
    return true;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  // Calculate new requests count
  const newRequestsCount = filteredRequests.filter(req => !viewedRequests.has(req.id)).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#00aff5]" />
            <CardTitle className="text-[#00aff5]">
              Cereri în Așteptare
              {newRequestsCount > 0 && (
                <span className="ml-2 px-2 py-1 text-sm bg-[#00aff5] text-white rounded-full">
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
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Se încarcă...</div>
        ) : currentRequests.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Titlu</TableHead>
                    <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Data preferată</TableHead>
                    <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Data trimiterii</TableHead>
                    <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Locație</TableHead>
                    <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="px-2">
                      <div className="flex justify-end gap-6">
                        <span className="text-xs text-muted-foreground w-10 text-center">Detalii</span>
                        <span className="text-xs text-muted-foreground w-10 text-center">Mesaj</span>
                        <span className="text-xs text-muted-foreground w-16 text-center">Trimite ofertă</span>
                        <span className="text-xs text-muted-foreground w-10 text-center">Respinge</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="p-2">
                        <div className="flex items-center gap-2">
                          {request.title}
                          {!viewedRequests.has(request.id) && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                              NOU
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        {format(new Date(request.preferredDate), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell className="p-2">
                        {format(new Date(request.createdAt), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell className="p-2">
                        {request.cities?.join(", ")}, {request.county}
                      </TableCell>
                      <TableCell className="p-2">
                        <span className="px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                          {request.status}
                        </span>
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex justify-end gap-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRequest(request)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            title="Detalii"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "În curând",
                                description: "Funcționalitatea de mesaje va fi disponibilă în curând.",
                              });
                            }}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            title="Mesaj"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-[#00aff5] hover:bg-[#0099d6]"
                            title="Trimite Ofertă"
                            onClick={() => {
                              toast({
                                title: "În curând",
                                description: "Funcționalitatea de trimitere ofertă va fi disponibilă în curând.",
                              });
                            }}
                          >
                            <SendHorizontal className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "În curând",
                                description: "Funcționalitatea de respingere va fi disponibilă în curând.",
                              });
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Respinge"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
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