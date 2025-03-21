import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Request } from "@/types/dashboard";

interface RequestDetailsDialogProps {
  request: Request | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestDetailsDialog({
  request,
  open,
  onOpenChange,
}: RequestDetailsDialogProps) {
  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[80vh] overflow-y-auto"
        aria-describedby="request-details-description"
      >
        <DialogHeader>
          <DialogTitle>Detalii Cerere</DialogTitle>
          <DialogDescription id="request-details-description">
            Informații complete despre cererea selectată
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">
                Titlu
              </h3>
              <p>{request.title}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">
                Descriere
              </h3>
              <p className="whitespace-pre-line">
                {request.description}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">
                Date preferate
              </h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {request.preferredDates && request.preferredDates.length > 0 ? (
                  request.preferredDates.map((date, index) => (
                    <Badge key={index} variant="outline">
                      {format(new Date(date), "dd.MM.yyyy")}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Nu există date specificate</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">
                Data trimiterii
              </h3>
              <p>
                {format(new Date(request.createdAt), "dd.MM.yyyy")}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">
                Locație
              </h3>
              <p>
                {request.cities?.join(", ")}, {request.county}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">
                Status
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  request.status === "Active"
                    ? "bg-yellow-100 text-yellow-800"
                    : request.status === "Rezolvat"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {request.status}
              </span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
