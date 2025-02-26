import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SendHorizontal, Loader2 } from "lucide-react";
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
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import type { AcceptedOfferWithClient } from "@shared/schema";
import { SearchBar } from "./offers/SearchBar";
import { OfferCard } from "./offers/OfferCard";
import { OfferDetailsDialog } from "./offers/OfferDetailsDialog";
import { useServiceOfferManagement } from "@/hooks/useServiceOfferManagement";
import { useAcceptedOffers } from "@/hooks/useAcceptedOffers";
import { ConversationInfo } from "@/pages/ServiceDashboard";

interface AcceptedOffersTabProps {
  onMessageClick?: (conversationInfo: ConversationInfo) => void;
}

export default function AcceptedOffersTab({ onMessageClick }: AcceptedOffersTabProps) {
  const [selectedOffer, setSelectedOffer] = useState<AcceptedOfferWithClient | null>(null);
  const { viewedAcceptedOffers, markAcceptedOfferAsViewed, newAcceptedOffersCount } = useServiceOfferManagement();

  const {
    offers,
    totalOffers,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    startIndex,
    handleCancelOffer,
  } = useAcceptedOffers();

  const handleAction = async (offerId: number) => {
    try {
      // Only mark as viewed if it hasn't been viewed yet
      if (!viewedAcceptedOffers.some(vo => vo.offerId === offerId)) {
        await markAcceptedOfferAsViewed(offerId);
      }
    } catch (error) {
      console.error('Error marking accepted offer as viewed:', error);
    }
  };

  const handleMessageClick = (offer: AcceptedOfferWithClient) => {
    if (onMessageClick && offer.requestUserId && offer.requestUserName && offer.requestId) {
      handleAction(offer.id);
      onMessageClick({
        userId: offer.requestUserId,
        userName: offer.requestUserName,
        requestId: offer.requestId,
        offerId: offer.id,  // Adăugăm offerId pentru a arăta detaliile ofertei acceptate
        sourceTab: 'accepted-offer'
      });
    }
  };

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
            {newAcceptedOffersCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {newAcceptedOffersCount} noi
              </span>
            )}
          </CardTitle>
          <Select 
            value={itemsPerPage.toString()} 
            onValueChange={(value) => setItemsPerPage(Number(value))}
          >
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
          {offers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nu există oferte acceptate</p>
          ) : (
            offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                isNew={!viewedAcceptedOffers.some(vo => vo.offerId === offer.id)}
                onView={async (offer) => {
                  await handleAction(offer.id);
                  setSelectedOffer(offer);
                }}
                onMessage={handleMessageClick}
                onCall={async (offer) => {
                  await handleAction(offer.id);
                  window.location.href = `tel:${offer.clientPhone}`;
                }}
                onCancel={handleCancelOffer}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 px-2">
            <div className="text-sm text-gray-500">
              Afișare {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalOffers)} din {totalOffers} oferte
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

      <OfferDetailsDialog
        offer={selectedOffer}
        open={!!selectedOffer}
        onOpenChange={(open) => !open && setSelectedOffer(null)}
        onCancel={handleCancelOffer}
      />
    </Card>
  );
}