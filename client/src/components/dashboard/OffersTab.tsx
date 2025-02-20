import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  SendHorizontal,
  Clock,
  User,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  MessageSquare,
  Check,
  XCircle,
  Eye,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { SentOffer } from "@shared/schema";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";

type OfferWithProvider = SentOffer & { serviceProviderName: string };

interface OffersTabProps {
  onMessageService?: (serviceId: number, requestId: number) => void;
}

export function OffersTab({ onMessageService }: OffersTabProps) {
  const [selectedOffer, setSelectedOffer] = useState<OfferWithProvider | null>(null);
  const [viewedOffers, setViewedOffers] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("pending");
  const { toast } = useToast();

  const { data: offers = [], isLoading, error } = useQuery<OfferWithProvider[]>({
    queryKey: ['/api/client/offers'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/client/offers', {
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

  // Load viewed offers from localStorage
  useEffect(() => {
    const savedViewedOffers = localStorage.getItem('viewedOffers');
    if (savedViewedOffers) {
      setViewedOffers(new Set(JSON.parse(savedViewedOffers)));
    }
  }, []);

  const markOfferAsViewed = (offerId: number) => {
    const newViewedOffers = new Set(viewedOffers).add(offerId);
    setViewedOffers(newViewedOffers);
    localStorage.setItem('viewedOffers', JSON.stringify(Array.from(newViewedOffers)));
  };

  const handleAcceptOffer = async (offer: OfferWithProvider) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/client/offers/${offer.id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to accept offer');
      }

      toast({
        title: "Succes!",
        description: "Oferta a fost acceptată cu succes.",
      });
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la acceptarea ofertei. Încercați din nou.",
        variant: "destructive",
      });
    }
  };

  const handleRejectOffer = async (offer: OfferWithProvider) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/client/offers/${offer.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reject offer');
      }

      toast({
        title: "Ofertă respinsă",
        description: "Oferta a fost respinsă cu succes.",
      });
    } catch (error) {
      console.error("Error rejecting offer:", error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la respingerea ofertei. Încercați din nou.",
        variant: "destructive",
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

  const pendingOffers = offers.filter((offer) => offer.status === "Pending");
  const acceptedOffers = offers.filter((offer) => offer.status === "Accepted");
  const rejectedOffers = offers.filter((offer) => offer.status === "Rejected");

  const renderOfferBox = (offer: OfferWithProvider) => {
    const isNew = !viewedOffers.has(offer.id);

    return (
      <div
        key={offer.id}
        className="bg-white border-2 border-gray-200 rounded-lg hover:border-[#00aff5]/30 transition-all duration-200 relative h-[300px] flex flex-col overflow-hidden"
        onMouseEnter={() => isNew && markOfferAsViewed(offer.id)}
      >
        {isNew && (
          <Badge className="absolute -top-0 -right-0 bg-[#00aff5] text-white">
            Nou
          </Badge>
        )}

        <div className="p-2 border-b bg-gray-50">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-md font-semibold line-clamp-1 flex-1 mr-2">
              {offer.title}
            </h3>
            <Badge
              variant="secondary"
              className={`${
                offer.status === "Pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : offer.status === "Accepted"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
              } flex-shrink-0 text-xs`}
            >
              {offer.status}
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
              <span className="text-xs font-normal line-clamp-1">
                {offer.serviceProviderName}
              </span>
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-1">
            <div>
              <h4 className="text-xs font-medium text-gray-500">
                Date disponibile
              </h4>
              <p className="text-xs truncate">
                {offer.availableDates.map(date =>
                  format(new Date(date), "dd.MM.yyyy")
                ).join(", ")}
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
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedOffer(offer)}
              >
                <Eye className="w-3 h-3 mr-1" />
                Vezi detalii
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onMessageService?.(offer.serviceProviderId, offer.requestId)}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Mesaj
              </Button>

              {offer.status === "Pending" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs text-green-500 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleAcceptOffer(offer)}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Acceptă
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRejectOffer(offer)}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Respinge
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <SendHorizontal className="h-5 w-5" />
          Oferte Primite
        </CardTitle>
        <CardDescription>
          Vezi și gestionează ofertele primite de la service-uri auto
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs
          defaultValue="pending"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white"
            >
              Oferte Primite ({pendingOffers.length})
            </TabsTrigger>
            <TabsTrigger
              value="accepted"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white"
            >
              Oferte Acceptate ({acceptedOffers.length})
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white"
            >
              Oferte Respinse ({rejectedOffers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingOffers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nu există oferte în așteptare
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOffers.map((offer) => renderOfferBox(offer))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {acceptedOffers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nu există oferte acceptate
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptedOffers.map((offer) => renderOfferBox(offer))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedOffers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nu există oferte respinse
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rejectedOffers.map((offer) => renderOfferBox(offer))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog for complete offer details */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalii Complete Ofertă</DialogTitle>
          </DialogHeader>
          {selectedOffer && (
            <ScrollArea className="h-full max-h-[60vh] pr-4">
              <div className="space-y-6 p-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Service Auto
                  </h3>
                  <p className="text-sm text-gray-600">{selectedOffer.serviceProviderName}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Detalii Ofertă
                  </h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedOffer.details}
                  </p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">
                      Date Disponibile
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedOffer.availableDates.map(date =>
                        format(new Date(date), "dd.MM.yyyy")
                      ).join(", ")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Preț</h3>
                    <p className="text-sm text-gray-600">{selectedOffer.price} RON</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Istoric
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-32">Creat:</span>
                      <span>{format(new Date(selectedOffer.createdAt), "dd.MM.yyyy HH:mm")}</span>
                    </div>
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