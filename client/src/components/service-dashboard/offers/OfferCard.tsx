import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Phone, Eye } from "lucide-react";
import type { AcceptedOfferWithClient } from "@shared/schema";

interface OfferCardProps {
  offer: AcceptedOfferWithClient;
  onView: (offer: AcceptedOfferWithClient) => void;
  onMessage: (offer: AcceptedOfferWithClient) => void;
  onCall: (offer: AcceptedOfferWithClient) => void;
  onCancel: (offerId: number) => void;
  isNew: boolean;
}

export function OfferCard({
  offer,
  onView,
  onMessage,
  onCall,
  onCancel,
  isNew,
}: OfferCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[#00aff5]">{offer.title}</h3>
                {isNew && (
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
                onClick={() => onCall(offer)}
              >
                <Phone className="w-4 h-4 mr-1" />
                Sună
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMessage(offer)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Mesaj
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(offer)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Vezi detalii
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}