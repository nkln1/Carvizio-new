import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SendHorizontal, Loader2, Eye, MessageSquare, Phone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { AcceptedOfferWithClient } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { SearchBar } from "./offers/SearchBar";
import { Button } from "@/components/ui/button";
import { useOfferManagement } from "@/hooks/useOfferManagement";

interface AcceptedOffersTabProps {
  onMessageClient?: (clientId: number, requestId: number) => void;
}

export default function AcceptedOffersTab({ onMessageClient }: AcceptedOffersTabProps) {
  const [selectedOffer, setSelectedOffer] = useState<AcceptedOfferWithClient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const { viewedOffers, markOfferAsViewed, newOffersCount } = useOfferManagement();

  const { data: offers = [], isLoading, error } = useQuery<AcceptedOfferWithClient[]>({
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

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare la încărcarea ofertelor",
        description: "A apărut o eroare la încărcarea ofertelor. Vă rugăm să încercați din nou.",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const filterOffers = (offers: AcceptedOfferWithClient[]) => {
    const acceptedOffers = offers.filter(o => o.status.toLowerCase() === "accepted");
    if (!searchTerm) return acceptedOffers;

    const searchLower = searchTerm.toLowerCase();
    return acceptedOffers.filter(offer =>
      offer.title.toLowerCase().includes(searchLower) ||
      offer.details.toLowerCase().includes(searchLower) ||
      offer.price.toString().includes(searchLower) ||
      offer.requestTitle?.toLowerCase().includes(searchLower) ||
      offer.requestDescription?.toLowerCase().includes(searchLower) ||
      offer.clientName?.toLowerCase().includes(searchLower)
    );
  };

  const handleAction = (offerId: number) => {
    markOfferAsViewed(offerId);
  };

  const filteredOffers = filterOffers(offers);
  const totalPages = Math.ceil(filteredOffers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOffers = filteredOffers.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6 flex justify-center items-center min-h-[200px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
            <p className="text-muted-foreground">Se încarcă ofertele...</p>
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
            <p className="text-red-600 mb-2">A apărut o eroare la încărcarea ofertelor</p>
            <Button onClick={() => window.location.reload()}>Reîncearcă</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50 space-y-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <SendHorizontal className="h-5 w-5" />
            Oferte Acceptate
            {newOffersCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {newOffersCount} noi
              </span>
            )}
          </CardTitle>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selectează numărul de oferte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 oferte pe pagină</SelectItem>
              <SelectItem value="10">10 oferte pe pagină</SelectItem>
              <SelectItem value="20">20 oferte pe pagină</SelectItem>
              <SelectItem value="50">50 oferte pe pagină</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription>Urmărește ofertele acceptate de către clienți</CardDescription>
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
      </CardHeader>

      <CardContent className="p-2">
        <div className="grid grid-cols-1 gap-2">
          {paginatedOffers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nu există oferte acceptate</p>
          ) : (
            paginatedOffers.map((offer) => (
              <Card key={offer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[#00aff5]">{offer.title}</h3>
                          {!viewedOffers.has(offer.id) && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                              Nou
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-[#00aff5]">{offer.price} RON</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Client:</span> {offer.clientName}<br />
                          <span className="text-gray-600">Telefon:</span> {offer.clientPhone}
                        </div>
                        <div>
                          <span className="text-gray-600">Dată disponibilă:</span><br />
                          {offer.availableDates.map(date =>
                            format(new Date(date), "dd.MM.yyyy")
                          ).join(", ")}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleAction(offer.id);
                            window.location.href = `tel:${offer.clientPhone}`;
                          }}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Sună
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleAction(offer.id);
                            onMessageClient?.(offer.clientId, offer.requestId);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Mesaj
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleAction(offer.id);
                            setSelectedOffer(offer);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Vezi detalii
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 px-2">
            <div className="text-sm text-gray-500">
              Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredOffers.length)} din {filteredOffers.length} oferte
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
      </CardContent>

      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalii Complete Ofertă</DialogTitle>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-lg mb-2">Informații Client</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Nume Client</p>
                    <p className="font-medium">{selectedOffer.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefon Client</p>
                    <p className="font-medium">{selectedOffer.clientPhone}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Detalii Cerere Client</h3>
                <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Titlu Cerere</p>
                    <p className="font-medium">{selectedOffer.requestTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Descriere Cerere</p>
                    <p className="font-medium">{selectedOffer.requestDescription}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Data Preferată Client</p>
                    <p className="font-medium">
                      {format(new Date(selectedOffer.requestPreferredDate), "dd.MM.yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Locație</p>
                    <p className="font-medium">
                      {selectedOffer.requestCities.join(", ")}, {selectedOffer.requestCounty}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Informații Ofertă</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Titlu</p>
                    <p className="font-medium">{selectedOffer.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Preț</p>
                    <p className="font-medium text-[#00aff5]">{selectedOffer.price} RON</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date disponibile</p>
                    <p className="font-medium">
                      {selectedOffer.availableDates.map(date =>
                        format(new Date(date), "dd.MM.yyyy")
                      ).join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium">{selectedOffer.status}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Detalii Ofertă</h3>
                <p className="whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                  {selectedOffer.details}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Istoric</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-32">Creat:</span>
                    <span>{format(new Date(selectedOffer.createdAt), "dd.MM.yyyy HH:mm")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}