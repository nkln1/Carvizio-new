      import { useState, useEffect } from "react";
      import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
      import { SendHorizontal, Loader2, MessageSquare, Eye } from "lucide-react";
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
        PaginationNext,
        PaginationPrevious,
      } from "@/components/ui/pagination";
      import { useQuery } from "@tanstack/react-query";
      import { auth } from "@/lib/firebase";
      import { useToast } from "@/hooks/use-toast";
      import type { SentOffer } from "@shared/schema";
      import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
      import { format } from "date-fns";
      import { SearchBar } from "./offers/SearchBar";
      import { Button } from "@/components/ui/button";
      import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
      import { ConversationInfo } from "@/pages/ServiceDashboard";

      interface SentOffersTabProps {
        onMessageClick?: (conversationInfo: ConversationInfo) => void;
      }

      export default function SentOffersTab({ onMessageClick }: SentOffersTabProps) {
        const [selectedOffer, setSelectedOffer] = useState<SentOffer | null>(null);
        const [activeTab, setActiveTab] = useState("pending");
        const [searchTerm, setSearchTerm] = useState("");
        const [currentPage, setCurrentPage] = useState(1);
        const [itemsPerPage, setItemsPerPage] = useState(10);
        const { toast } = useToast();

        const { data: offers = [], isLoading, error } = useQuery<SentOffer[]>({
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
        }, [searchTerm, itemsPerPage, activeTab]);

        const filterOffers = (offers: SentOffer[]) => {
          const pendingOffers = offers.filter(o => o.status.toLowerCase() === activeTab && o.status.toLowerCase() !== "accepted");
          if (!searchTerm) return pendingOffers;

          const searchLower = searchTerm.toLowerCase();
          return pendingOffers.filter(offer =>
            offer.title.toLowerCase().includes(searchLower) ||
            offer.details.toLowerCase().includes(searchLower) ||
            offer.price.toString().includes(searchLower) ||
            offer.requestTitle?.toLowerCase().includes(searchLower) ||
            offer.requestDescription?.toLowerCase().includes(searchLower)
          );
        };

        const handleViewOffer = (offer: SentOffer) => {
          setSelectedOffer(offer);
        };

        const handleMessageClick = (offer: SentOffer) => {
          if (onMessageClick && offer.requestUserId && offer.requestUserName) {
            onMessageClick({
              userId: offer.requestUserId,
              userName: offer.requestUserName,
              requestId: offer.requestId,
              sourceTab: 'sent-offer'
            });
          }
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
            <CardHeader className="border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#00aff5] flex items-center gap-2">
                  <SendHorizontal className="h-5 w-5" />
                  Oferte Trimise
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
              <CardDescription>Urmărește și gestionează ofertele trimise către clienți</CardDescription>
              <div className="mt-4">
                <SearchBar value={searchTerm} onChange={setSearchTerm} />
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {(() => {
                  const pendingOffersCount = filterOffers(offers).filter(o => o.status.toLowerCase() === "pending").length;
                  const rejectedOffersCount = filterOffers(offers).filter(o => o.status.toLowerCase() === "rejected").length;

                  return (
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="pending" className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white">
                        Oferte Trimise ({pendingOffersCount})
                      </TabsTrigger>
                      <TabsTrigger value="rejected" className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white">
                        Oferte Respinse ({rejectedOffersCount})
                      </TabsTrigger>
                    </TabsList>
                  );
                })()}

                <TabsContent value={activeTab}>
                  <div className="grid grid-cols-1 gap-4">
                    {paginatedOffers.map((offer) => (
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
                                  <p className="text-sm text-gray-600 mt-1">{offer.requestTitle}</p>
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
                                  onClick={() => handleViewOffer(offer)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Vezi detalii
                                </Button>
                                {onMessageClick && offer.requestUserId && offer.requestUserName && (
                                  <Button
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => handleMessageClick(offer)}
                                  >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Mesaj Client
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {totalPages > 1 && (
                      <div className="flex justify-between items-center mt-4">
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
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>

      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="max-h-[95vh] overflow-y-auto pr-4"> {/* Added max-height and overflow-y-auto */}
          <DialogHeader>
            <DialogTitle>Detalii Complete Ofertă</DialogTitle>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-6">
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