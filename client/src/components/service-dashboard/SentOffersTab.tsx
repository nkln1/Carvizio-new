import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SendHorizontal, Loader2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { SentOffer } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchBar } from "./offers/SearchBar";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 9;

export default function SentOffersTab() {
  const [selectedOffer, setSelectedOffer] = useState<SentOffer | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data: offers = [], isLoading } = useQuery<SentOffer[]>({
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
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const filterOffers = (offers: SentOffer[]) => {
    if (!searchTerm) return offers;

    const searchLower = searchTerm.toLowerCase();
    return offers.filter(offer =>
      offer.title.toLowerCase().includes(searchLower) ||
      offer.details.toLowerCase().includes(searchLower) ||
      offer.price.toString().includes(searchLower)
    );
  };

  const filteredOffers = filterOffers(offers).filter(o => o.status.toLowerCase() === activeTab);
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

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <SendHorizontal className="h-5 w-5" />
          Oferte Trimise
        </CardTitle>
        <CardDescription>Urmărește și gestionează ofertele trimise către clienți</CardDescription>
        <div className="mt-4">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {(() => {
            const pendingCount = filterOffers(offers).filter(o => o.status.toLowerCase() === "pending").length;
            const rejectedCount = filterOffers(offers).filter(o => o.status.toLowerCase() === "rejected").length;

            return (
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="pending" className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white">
                  Oferte Trimise ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white">
                  Oferte Respinse ({rejectedCount})
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
                        <h3 className="font-medium text-lg">{offer.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {offer.details}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-gray-500">
                            Data disponibilă: {format(new Date(offer.availableDate), "dd.MM.yyyy")}
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
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => setSelectedOffer(offer)}
                        >
                          Vezi detalii complete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <PaginationPrevious />
                      </Button>
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          onClick={() => setCurrentPage(index + 1)}
                          isActive={currentPage === index + 1}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        <PaginationNext />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalii Complete Ofertă</DialogTitle>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-6">
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
                    <p className="text-sm text-gray-600">Data disponibilă</p>
                    <p className="font-medium">
                      {format(new Date(selectedOffer.availableDate), "dd.MM.yyyy")}
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
                  {selectedOffer.updatedAt && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-32">Ultima actualizare:</span>
                      <span>{format(new Date(selectedOffer.updatedAt), "dd.MM.yyyy HH:mm")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}