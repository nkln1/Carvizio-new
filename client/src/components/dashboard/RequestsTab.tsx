import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { queryClient } from "@/lib/queryClient";
import { auth } from "@/lib/firebase";
import type { Request as RequestType } from "@shared/schema";

interface RequestsTabProps {
  requests: RequestType[];
  isLoading: boolean;
  onCreateRequest: () => void;
}

export function RequestsTab({ requests, isLoading, onCreateRequest }: RequestsTabProps) {
  const [selectedRequest, setSelectedRequest] = useState<RequestType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const { toast } = useToast();

  const handleDelete = async (requestId: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Anulat' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel request');
      }

      // Invalidate the requests query to trigger a refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/requests'] });

      toast({
        title: "Success",
        description: "Cererea a fost anulată cu succes.",
      });
    } catch (error) {
      console.error('Error canceling request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nu s-a putut anula cererea. Încercați din nou.",
      });
    }
    setShowDeleteDialog(false);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Cererile mele
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4 bg-slate-100 p-1">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white transition-colors"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="solved"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white transition-colors"
            >
              Rezolvate
            </TabsTrigger>
            <TabsTrigger
              value="canceled"
              className="data-[state=active]:bg-[#00aff5] data-[state=active]:text-white transition-colors"
            >
              Anulate
            </TabsTrigger>
          </TabsList>

          {["active", "solved", "canceled"].map((tab) => (
            <TabsContent key={tab} value={tab}>
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
                  {requests
                    .filter((req) => {
                      if (tab === "active") return req.status === "Active";
                      if (tab === "solved") return req.status === "Rezolvat";
                      if (tab === "canceled") return req.status === "Anulat";
                      return false;
                    })
                    .map((request) => (
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
                        <TableCell>
                          {request.cities?.join(", ")}, {request.county}
                        </TableCell>
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
                            {request.status !== "Anulat" && (
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
                  {requests.filter((req) => {
                    if (tab === "active") return req.status === "Active";
                    if (tab === "solved") return req.status === "Rezolvat";
                    if (tab === "canceled") return req.status === "Anulat";
                    return false;
                  }).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nu există cereri în această categorie.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

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
                  Data preferată
                </h3>
                <p>
                  {format(new Date(selectedRequest.preferredDate), "dd.MM.yyyy")}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Data trimiterii
                </h3>
                <p>
                  {format(new Date(selectedRequest.createdAt), "dd.MM.yyyy")}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Locație
                </h3>
                <p>{selectedRequest.cities?.join(", ")}, {selectedRequest.county}</p>
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
    </Card>
  );
}