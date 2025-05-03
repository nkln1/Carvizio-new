import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CarForm } from "@/components/car/CarForm";
import type { Car } from "@shared/schema";

interface CarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCar?: Car;
  onSubmit: (data: Omit<Car, "id" | "clientId" | "createdAt">) => Promise<void>;
  onCancel: () => void;
  pendingRequestData?: any;
}

export function CarDialog({
  open,
  onOpenChange,
  selectedCar,
  onSubmit,
  onCancel,
  pendingRequestData,
}: CarDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open && pendingRequestData) {
          setTimeout(() => {
            onCancel();
          }, 100);
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-2 sm:mb-4">
          <DialogTitle className="text-lg sm:text-xl text-[#00aff5]">
            {selectedCar ? "Editează mașina" : "Adaugă mașină nouă"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm opacity-80">
            {selectedCar 
              ? "Modificați detaliile mașinii dumneavoastră" 
              : "Completați detaliile mașinii pentru a o adăuga în contul dumneavoastră"}
          </DialogDescription>
        </DialogHeader>
        <CarForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          initialData={selectedCar}
        />
      </DialogContent>
    </Dialog>
  );
}
