import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SendHorizontal, Loader2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { SentOffer, Request as RequestType } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchBar } from "./offers/SearchBar";

const ITEMS_PER_PAGE = 9;

export default function SentOffersTab() {
  const [selectedOffer, setSelectedOffer] = useState<SentOffer | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // Fetch sent offers
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
          {/* Calculate counts */}
          {(() => {
            const pendingCount = filterOffers(offers).filter(o => o.status.toLowerCase() === "pending").length;
            const rejectedCount = filterOffers(offers).filter(o => o.status.toLowerCase() === "rejected").length;
            const acceptedCount = filterOffers(offers).filter(o => o.status.toLowerCase() === "accepted").length;

            return (
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="pending" className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white">
                  Oferte trimise ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white">
                  Oferte Respinse ({rejectedCount})
                </TabsTrigger>
              </TabsList>
            );
          })()}

          <TabsContent value={activeTab}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedOffers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{offer.title}</CardTitle>
                    <CardDescription>
                      Preț: {offer.price} RON
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {offer.details}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {format(new Date(offer.createdAt), "dd.MM.yyyy")}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        offer.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                        offer.status === "Accepted" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {offer.status}
                      </span>
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
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                        disabled={currentPage === 1} 
                      />
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
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                        disabled={currentPage === totalPages} 
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalii Ofertă</DialogTitle>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Titlu</h3>
                <p>{selectedOffer.title}</p>
              </div>
              <div>
                <h3 className="font-medium">Detalii</h3>
                <p className="whitespace-pre-line">{selectedOffer.details}</p>
              </div>
              <div>
                <h3 className="font-medium">Preț</h3>
                <p>{selectedOffer.price} RON</p>
              </div>
              <div>
                <h3 className="font-medium">Status</h3>
                <p>{selectedOffer.status}</p>
              </div>
              <div>
                <h3 className="font-medium">Data trimiterii</h3>
                <p>{format(new Date(selectedOffer.createdAt), "dd.MM.yyyy")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}