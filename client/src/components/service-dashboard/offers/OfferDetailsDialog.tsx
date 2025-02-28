import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AcceptedOfferWithClient } from "@shared/schema";

interface OfferDetailsDialogProps {
  offer: AcceptedOfferWithClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (offerId: number) => void;
}

export function OfferDetailsDialog({
  offer,
  open,
  onOpenChange,
  onCancel,
}: OfferDetailsDialogProps) {
  if (!offer) return null;

  // Create static IDs for accessibility
  const dialogTitleId = `offer-details-title-${offer.id}`;
  const dialogDescriptionId = `offer-details-description-${offer.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogContent 
          className="max-h-[95vh] overflow-y-auto pr-4"
          aria-labelledby={dialogTitleId}
          aria-describedby={dialogDescriptionId}
        >
          <DialogHeader>
            <DialogTitle id={dialogTitleId}>
              Detalii Complete Ofertă
            </DialogTitle>
            <DialogDescription id={dialogDescriptionId}>
              Informații complete despre oferta selectată
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-full max-h-[60vh]">
            <div className="space-y-6 p-2">
              <div>
                <h3 className="font-medium text-lg mb-2">Informații Client</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Nume Client</p>
                    <p className="font-medium">{offer.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefon Client</p>
                    <p className="font-medium">{offer.clientPhone}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Detalii Cerere Client</h3>
                <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Titlu Cerere</p>
                    <p className="font-medium">{offer.requestTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Descriere Cerere</p>
                    <p className="font-medium">{offer.requestDescription}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Data Preferată Client</p>
                    <p className="font-medium">
                      {format(new Date(offer.requestPreferredDate), "dd.MM.yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Locație</p>
                    <p className="font-medium">
                      {offer.requestCities.join(", ")}, {offer.requestCounty}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Informații Ofertă</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Titlu</p>
                    <p className="font-medium">{offer.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Preț</p>
                    <p className="font-medium text-[#00aff5]">{offer.price} RON</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date disponibile</p>
                    <p className="font-medium">
                      {offer.availableDates.map(date =>
                        format(new Date(date), "dd.MM.yyyy")
                      ).join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium">{offer.status}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Detalii Ofertă</h3>
                <p className="whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                  {offer.details}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Istoric</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-32">Creat:</span>
                    <span>{format(new Date(offer.createdAt), "dd.MM.yyyy HH:mm")}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={() => onCancel(offer.id)}
                >
                  Anulează Oferta
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}