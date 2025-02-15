import { useState } from "react";
import { auth } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Car, Request } from "@shared/schema";

interface RequestsTableProps {
  requests: Request[];
  cars: Car[];
  onDelete?: (id: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
}

export function RequestsTable({
  requests,
  cars,
  onDelete,
  refreshRequests,
}: RequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const handleCancelRequest = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: "Anulat" }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel request');
      }

      await refreshRequests();
    } catch (error) {
      console.error('Error canceling request:', error);
    }
  };

  const getCarDetails = (carId: number) => {
    const car = cars.find(c => c.id === carId);
    return car ? `${car.brand} ${car.model} (${car.year})` : 'N/A';
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Titlu</TableHead>
              <TableHead>Mașină</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nu există cereri
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {format(new Date(request.preferredDate), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>{request.title}</TableCell>
                  <TableCell>{getCarDetails(request.carId)}</TableCell>
                  <TableCell>{request.status}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      onClick={() => setSelectedRequest(request)}
                    >
                      Detalii
                    </Button>
                    {request.status === "În așteptare" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        Anulează
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalii cerere</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Titlu</h4>
                  <p>{selectedRequest.title}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Data preferată</h4>
                  <p>{format(new Date(selectedRequest.preferredDate), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Mașină</h4>
                  <p>{getCarDetails(selectedRequest.carId)}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Status</h4>
                  <p>{selectedRequest.status}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="font-semibold">Județ</h4>
                  <p>{selectedRequest.county}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="font-semibold">Orașe</h4>
                  <p>{selectedRequest.cities.join(', ')}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="font-semibold">Descriere</h4>
                  <p className="whitespace-pre-wrap">{selectedRequest.description}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}