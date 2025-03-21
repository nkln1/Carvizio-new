import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface MessageDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestData: any;
    offerData: any;
    isLoadingData: boolean;
  }

  export function MessageDetailsDialog({
    open,
    onOpenChange,
    requestData,
    offerData,
    isLoadingData,
  }: MessageDetailsDialogProps) {
    const isValidDate = (date: any): boolean => {
      return date && !isNaN(new Date(date).getTime());
    };

    const safeFormatDate = (date: any, formatStr: string = "dd.MM.yyyy"): string => {
      if (!isValidDate(date)) {
        return "Dată nedisponibilă";
      }
      try {
        return format(new Date(date), formatStr);
      } catch (error) {
        console.error("Error formatting date:", error);
        return "Dată nedisponibilă";
      }
    };

    // loadOfferDetails function is now implemented in MessagesTab.tsx
    // and data is passed to this component via props


    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {offerData ? "Detalii Complete" : "Detalii Cerere"}
              </DialogTitle>
              <DialogDescription>
                {offerData 
                  ? "Informații despre cererea și oferta selectată" 
                  : "Informații despre cererea selectată"}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[80vh] overflow-y-auto">
              {isLoadingData ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
                  <p className="text-muted-foreground ml-2">Se încarcă detaliile...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {requestData && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-md">Detalii Cerere</h3>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Titlu
                        </h4>
                        <p>{requestData.title || "Nedisponibil"}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Descriere
                        </h4>
                        <p className="whitespace-pre-line">{requestData.description || "Nedisponibil"}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Data preferată
                        </h4>
                        <p>
                          {isValidDate(requestData.preferredDate) 
                            ? safeFormatDate(requestData.preferredDate) 
                            : "Dată nedisponibilă"}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Data trimiterii
                        </h4>
                        <p>
                          {isValidDate(requestData.createdAt) 
                            ? safeFormatDate(requestData.createdAt) 
                            : "Dată nedisponibilă"}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Locație
                        </h4>
                        <p>
                          {requestData.cities && Array.isArray(requestData.cities) 
                            ? `${requestData.cities.join(", ")}, ${requestData.county || ""}` 
                            : "Locație nedisponibilă"}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Status
                        </h4>
                        <span className="px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                          {requestData.status || "Nedisponibil"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Afișarea detaliilor ofertei */}
                  {offerData && (
                    <div className="space-y-3 mt-6 pt-6 border-t">
                      <h3 className="font-medium text-md">Detalii Ofertă</h3>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Titlu</h4>
                        <p>{offerData.title || "Nedisponibil"}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Preț</h4>
                        <p className="font-bold text-[#00aff5]">
                          {offerData.price ? `${offerData.price} RON` : "Nedisponibil"}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Detalii</h4>
                        <p className="whitespace-pre-line">{offerData.details || "Nedisponibil"}</p>
                      </div>
                      {offerData.availableDates && Array.isArray(offerData.availableDates) && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Date disponibile</h4>
                          <p>
                            {offerData.availableDates.length > 0
                              ? offerData.availableDates
                                .filter((date: any) => isValidDate(date))
                                .map((date: string) => safeFormatDate(date))
                                .join(", ")
                              : "Nedisponibil"
                            }
                          </p>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          offerData.status && offerData.status.toLowerCase() === 'accepted' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {offerData.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  )}

                  {!requestData && (!offerData) && (
                    <div className="text-center py-4 text-gray-500">
                      Nu s-au putut încărca detaliile. Vă rugăm să încercați din nou.
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }