
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SendHorizontal, Clock, User, MessageSquare, Check, XCircle, Eye, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { OfferWithProvider } from "@shared/schema";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";

interface OffersTabProps {
  offers: OfferWithProvider[];
  onMessageClick?: (userId: number, userName: string, requestId: number, offerId?: number) => void;
  refreshRequests?: () => Promise<void>;
  viewedOffers: Set<number>;
  markOfferAsViewed?: (offerId: number) => Promise<void>;
}

export function OffersTab({ offers, onMessageClick, refreshRequests, viewedOffers, markOfferAsViewed }: OffersTabProps) {
  const [selectedOffer, setSelectedOffer] = useState<OfferWithProvider | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate offer counts and filter offers by status
  const pendingOffers = offers.filter(offer => offer.status === "Pending");
  const acceptedOffers = offers.filter(offer => offer.status === "Accepted");
  const rejectedOffers = offers.filter(offer => offer.status === "Rejected");

  const pendingCount = pendingOffers.length;
  const acceptedCount = acceptedOffers.length;
  const rejectedCount = rejectedOffers.length;

  // For debugging - log data to verify filtering
  useEffect(() => {
    console.log("All offers:", offers);
    console.log("Pending offers:", pendingOffers);
    console.log("Accepted offers:", acceptedOffers);
    console.log("Rejected offers:", rejectedOffers);
  }, [offers]);

  // Reset pagination when tab changes
  useEffect(() => { 
    setCurrentPage(1); 
  }, [activeTab]);

  const handleAction = async (offerId: number, action: () => Promise<void>) => {
    try {
      if (markOfferAsViewed && !viewedOffers.has(offerId)) {
        await markOfferAsViewed(offerId);
      }
      await action();
    } catch (error) {
      console.error("Error in handleAction:", error);
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "A apărut o eroare.",
        variant: "destructive",
      });
    }
  };

  const handleMessageClick = (offer: OfferWithProvider) => {
    if (onMessageClick && offer.serviceProviderId && offer.serviceProviderName) {
      return handleAction(offer.id, async () => {
        onMessageClick(offer.serviceProviderId, offer.serviceProviderName, offer.requestId, offer.id);
      });
    }
    return Promise.resolve();
  };

  const handleAcceptOffer = async (offer: OfferWithProvider) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // Import the fetchWithCsrf function from the csrfToken module
      const { fetchWithCsrf } = await import('@/lib/csrfToken');

      const response = await fetchWithCsrf(`/api/client/offers/${offer.id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          offerId: offer.id,
          requestId: offer.requestId,
          serviceProviderId: offer.serviceProviderId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept offer');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/client/offers'] });
      setActiveTab("accepted");
      if (refreshRequests) await refreshRequests();

      toast({
        title: "Succes!",
        description: "Oferta a fost acceptată cu succes.",
      });
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "A apărut o eroare la acceptarea ofertei.",
        variant: "destructive",
      });
    }
  };

  const handleRejectOffer = async (offer: OfferWithProvider) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // Import the fetchWithCsrf function from the csrfToken module
      const { fetchWithCsrf } = await import('@/lib/csrfToken');

      const response = await fetchWithCsrf(`/api/client/offers/${offer.id}/reject`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to reject offer');

      queryClient.invalidateQueries({ queryKey: ['/api/client/offers'] });
      setActiveTab("rejected");

      toast({
        title: "Ofertă respinsă",
        description: "Oferta a fost respinsă cu succes.",
      });
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la respingerea ofertei. Încercați din nou.",
        variant: "destructive",
      });
    }
  };

  const handleCancelOffer = async (offer: OfferWithProvider) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // Import the fetchWithCsrf function from the csrfToken module
      const { fetchWithCsrf } = await import('@/lib/csrfToken');

      const response = await fetchWithCsrf(`/api/client/offers/${offer.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel offer');
      }

      // Update cache and refresh data
      queryClient.setQueryData<OfferWithProvider[]>(['/api/client/offers'], 
        (oldOffers = []) => oldOffers.map(o => o.id === offer.id ? { ...o, status: "Pending" } : o)
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/client/offers'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/requests'] })
      ]);

      setActiveTab("pending");
      if (refreshRequests) await refreshRequests();

      toast({
        title: "Ofertă anulată",
        description: "Oferta a fost anulată cu succes.",
      });
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "A apărut o eroare la anularea ofertei.",
        variant: "destructive",
      });
    }
  };

  // Helpers for pagination
  const getPaginatedOffers = (filteredOffers: OfferWithProvider[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOffers.slice(startIndex, startIndex + itemsPerPage);
  };

  const renderOfferBox = (offer: OfferWithProvider) => {
    const isNew = !viewedOffers.has(offer.id);
    const statusColorClass = offer.status === "Pending" 
      ? "bg-yellow-100 text-yellow-800" 
      : offer.status === "Accepted" 
        ? "bg-green-100 text-green-800" 
        : "bg-red-100 text-red-800";

    return (
      <div key={offer.id} className="bg-white border-2 border-gray-200 rounded-lg hover:border-[#00aff5]/30 transition-all duration-200 relative h-[300px] flex flex-col overflow-hidden">
        {isNew && <Badge className="absolute -top-0 -right-0 bg-[#00aff5] text-white">Nou</Badge>}

        <div className="p-2 border-b bg-gray-50">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-md font-semibold line-clamp-1 flex-1 mr-2">{offer.title}</h3>
            <Badge variant="secondary" className={`${statusColorClass} flex-shrink-0 text-xs`}>
              {offer.status === "Rejected" ? "Respinsă" : offer.status}
            </Badge>
          </div>
          <div className="text-xs text-gray-600">
            <Clock className="inline-block w-3 h-3 mr-1 text-gray-500" />
            {format(new Date(offer.createdAt), "dd.MM.yyyy HH:mm")}
          </div>
        </div>

        <div className="p-2 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="mb-1">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <User className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-gray-700">Service Auto:</span>
              <a
                href={`/service/${offer.serviceProviderUsername}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-normal line-clamp-1 text-blue-500 hover:text-blue-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {offer.serviceProviderName}
              </a>
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-1">
            <div>
              <h4 className="text-xs font-medium text-gray-500">Date disponibile</h4>
              <p className="text-xs truncate">
                {offer.availableDates.map(date => format(new Date(date), "dd.MM.yyyy")).join(", ")}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500">Preț</h4>
              <p className="text-xs">{offer.price} RON</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">Detalii</h4>
            <p className="text-xs line-clamp-3">{offer.details}</p>
          </div>

          <div className="mt-auto pt-2 border-t">
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => handleAction(offer.id, async () => setSelectedOffer(offer))}
              >
                <Eye className="w-3 h-3 mr-1" />Vezi detalii
              </Button>

              {offer.status === "Pending" && (
                <>
                  <Button
                    variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => handleAction(offer.id, () => handleMessageClick(offer))}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />Mesaj
                  </Button>
                  <Button
                    variant="outline" size="sm" 
                    className="h-7 px-2 text-xs text-green-500 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleAction(offer.id, () => handleAcceptOffer(offer))}
                  >
                    <Check className="w-3 h-3 mr-1" />Acceptă
                  </Button>
                  <Button
                    variant="outline" size="sm" 
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleAction(offer.id, () => handleRejectOffer(offer))}
                  >
                    <XCircle className="w-3 h-3 mr-1" />Respinge
                  </Button>
                </>
              )}

              {offer.status === "Accepted" && (
                <>
                  <Button
                    variant="outline" size="sm" 
                    className="h-7 px-2 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                    onClick={() => handleAction(offer.id, () => handleCancelOffer(offer))}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />Anulează
                  </Button>
                  <Button
                    variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => handleAction(offer.id, () => handleMessageClick(offer))}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />Mesaj
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaginatedContent = (offers: OfferWithProvider[]) => {
    const paginatedOffers = getPaginatedOffers(offers);
    const totalPages = Math.ceil(offers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;

    return (
      <>
        {offers.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-500">
              Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, offers.length)} din {offers.length} oferte
            </div>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Număr de oferte" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num} pe pagină</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedOffers.map(renderOfferBox)}
        </div>

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

  // Empty state
  if (offers.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6 flex justify-center items-center min-h-[200px]">
          <p className="text-muted-foreground">Nu există oferte.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <SendHorizontal className="h-5 w-5" />Oferte Primite
        </CardTitle>
        <CardDescription>Vezi și gestionează ofertele primite de la service-uri auto</CardDescription>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs 
          defaultValue="pending" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-0 mb-4 h-auto sm:h-10">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white px-2 py-1.5 sm:py-2 text-sm whitespace-nowrap"
            >
              Oferte Primite ({pendingCount})
            </TabsTrigger>
            <TabsTrigger
              value="accepted"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white px-2 py-1.5 sm:py-2 text-sm whitespace-nowrap"
            >
              Oferte Acceptate ({acceptedCount})
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white px-2 py-1.5 sm:py-2 text-sm whitespace-nowrap"
            >
              Oferte Respinse ({rejectedCount})
            </TabsTrigger>
          </TabsList>

          {activeTab === "pending" && (
            <div className="mt-2">
              {renderPaginatedContent(pendingOffers)}
            </div>
          )}

          {activeTab === "accepted" && (
            <div className="mt-2">
              {renderPaginatedContent(acceptedOffers)}
            </div>
          )}

          {activeTab === "rejected" && (
            <div className="mt-2">
              {renderPaginatedContent(rejectedOffers)}
            </div>
          )}
        </Tabs>
      </CardContent>

      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalii Complete Ofertă</DialogTitle>
            <DialogDescription>Informații detaliate despre oferta selectată</DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <ScrollArea className="h-full max-h-[60vh] pr-4">
              <div className="space-y-6 p-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Service Auto</h3>
                  <a
                    href={`/service/${selectedOffer.serviceProviderUsername}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {selectedOffer.serviceProviderName}
                  </a>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Detalii Ofertă</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedOffer.details}</p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Date Disponibile</h3>
                    <p className="text-sm text-gray-600">
                      {selectedOffer.availableDates.map(date => format(new Date(date), "dd.MM.yyyy")).join(", ")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Preț</h3>
                    <p className="text-sm text-gray-600">{selectedOffer.price} RON</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Istoric</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-32">Creat:</span>
                    <span>{format(new Date(selectedOffer.createdAt), "dd.MM.yyyy HH:mm")}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
