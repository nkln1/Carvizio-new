import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CarForm } from "@/components/car/CarForm";
import type { CarType } from "@shared/schema";

interface CarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCar?: CarType;
  onSubmit: (data: Omit<CarType, "id" | "userId" | "createdAt">) => Promise<void>;
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedCar ? "Editează mașina" : "Adaugă mașină nouă"}
          </DialogTitle>
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
