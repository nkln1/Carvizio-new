import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SendHorizontal, Loader2, Eye, MessageSquare, Phone } from "lucide-react";
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

const ITEMS_PER_PAGE = 9;

interface AcceptedOffersTabProps {
  onMessageClient?: (clientId: number, requestId: number) => void;
}

export default function AcceptedOffersTab({ onMessageClient }: AcceptedOffersTabProps) {
  const [selectedOffer, setSelectedOffer] = useState<AcceptedOfferWithClient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

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
  }, [searchTerm]);

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

  const filteredOffers = filterOffers(offers);
  const totalPages = Math.ceil(filteredOffers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOffers = filteredOffers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <SendHorizontal className="h-5 w-5" />
          Oferte Acceptate
        </CardTitle>
        <CardDescription>Urmărește ofertele acceptate de către clienți</CardDescription>
        <div className="mt-4">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="grid grid-cols-1 gap-4">
          {paginatedOffers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nu există oferte acceptate</p>
          ) : (
            paginatedOffers.map((offer) => (
              <Card key={offer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-4">
                        <h3 className="font-medium text-lg text-[#00aff5]">
                          {offer.title}
                        </h3>
                        <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium text-gray-700">Detalii cerere client:</p>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm text-gray-600">Client: {offer.clientName}</p>
                            <p className="text-sm text-gray-600">Telefon: {offer.clientPhone}</p>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{offer.requestTitle}</p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{offer.requestDescription}</p>
                          <div className="mt-2 text-sm text-gray-500">
                            <p>Data preferată: {format(new Date(offer.requestPreferredDate), "dd.MM.yyyy")}</p>
                            <p>Locație: {offer.requestCities.join(", ")}, {offer.requestCounty}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Răspunsul dvs.:</span> {offer.details}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm text-gray-500">
                          Data disponibilă: {offer.availableDates.map(date =>
                            format(new Date(date), "dd.MM.yyyy")
                          ).join(", ")}
                        </span>
                        <span className="text-sm text-gray-500">
                          Trimisă: {format(new Date(offer.createdAt), "dd.MM.yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-lg text-[#00aff5]">
                        {offer.price} RON
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            // Open phone dialer
                            window.location.href = `tel:${offer.clientPhone}`;
                          }}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Sună
                        </Button>
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => onMessageClient?.(offer.clientId, offer.requestId)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Mesaj
                        </Button>
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => setSelectedOffer(offer)}
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
          <div className="flex justify-center mt-4">
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

      {/* Dialog for complete offer details */}
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