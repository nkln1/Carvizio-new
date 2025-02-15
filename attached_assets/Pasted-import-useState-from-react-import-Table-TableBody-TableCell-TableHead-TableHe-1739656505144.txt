import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { type Car } from "@/types/dashboard";

interface Request {
  id: string;
  title: string;
  description: string;
  carId: string;
  preferredDate: string;
  county: string;
  cities?: string[];
  status: "Active" | "Rezolvat" | "Anulat";
  createdAt: string;
}

interface RequestsTableProps {
  requests: Request[];
  cars: Record<string, Car>;
  onDelete?: (id: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
  hideDeleteButton?: boolean;
}

export function RequestsTable({
  requests,
  cars,
  onDelete,
  refreshRequests,
  hideDeleteButton = false,
}: RequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const { toast } = useToast();

  const handleDelete = async (requestId: string) => {
    if (!onDelete) return;
    try {
      await onDelete(requestId);
      toast({
        title: "Success",
        description: "Cererea a fost anulată cu succes.",
      });
      await refreshRequests();
    } catch (error) {
      console.error("Error canceling request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nu s-a putut anula cererea. Încercați din nou.",
      });
    }
    setShowDeleteDialog(false);
  };

  const getLocationDisplay = (request: Request) => {
    const citiesDisplay = request.cities?.length ? request.cities.join(", ") : "";
    return citiesDisplay ? `${citiesDisplay}, ${request.county}` : request.county;
  };

  // Sort requests by createdAt in descending order (newest first)
  const sortedRequests = [...requests].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titlu</TableHead>
            <TableHead>Data preferată</TableHead>
            <TableHead>Data trimiterii</TableHead>
            <TableHead>Locație</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Acțiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRequests.map((request) => (
            <TableRow
              key={request.id}
              className="hover:bg-gray-50 transition-colors"
            >
              <TableCell className="font-medium">
                {request.title}
              </TableCell>
              <TableCell>
                {format(new Date(request.preferredDate), "dd.MM.yyyy")}
              </TableCell>
              <TableCell>
                {format(new Date(request.createdAt), "dd.MM.yyyy")}
              </TableCell>
              <TableCell>{getLocationDisplay(request)}</TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowViewDialog(true);
                    }}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    Detalii
                  </Button>
                  {!hideDeleteButton && request.status !== "Anulat" && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDeleteDialog(true);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Anulează
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nu există cereri în această categorie.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulați această cerere?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Cererea va fi mutată în categoria
              "Anulate".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nu</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRequest && handleDelete(selectedRequest.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Da, anulează cererea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalii Cerere</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Titlu
                </h3>
                <p>{selectedRequest.title}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Descriere
                </h3>
                <p>{selectedRequest.description}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Mașină
                </h3>
                <p>
                  {cars[selectedRequest.carId]?.brand}{" "}
                  {cars[selectedRequest.carId]?.model}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Data preferată
                </h3>
                <p>
                  {format(
                    new Date(selectedRequest.preferredDate),
                    "dd.MM.yyyy"
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Data trimiterii
                </h3>
                <p>
                  {format(
                    new Date(selectedRequest.createdAt),
                    "dd.MM.yyyy"
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Locație
                </h3>
                <p>{getLocationDisplay(selectedRequest)}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Status
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-sm ${
                    selectedRequest.status === "Active"
                      ? "bg-yellow-100 text-yellow-800"
                      : selectedRequest.status === "Rezolvat"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedRequest.status}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}