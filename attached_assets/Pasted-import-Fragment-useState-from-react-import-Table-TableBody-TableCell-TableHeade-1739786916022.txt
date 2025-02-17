import { Fragment, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Eye,
  MessageSquare,
  SendHorizontal,
  X,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import type { Request, Car, User } from "@/types/dashboard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SubmitOfferForm } from "./SubmitOfferForm";

interface ClientRequestsProps {
  clientRequests: Request[];
  viewedRequests: Set<string>;
  onViewDetails: (request: Request) => void;
  onMessage: (request: Request) => void;
  onSendOffer: (request: Request, offerData: any) => Promise<void>;
  onRejectRequest: (requestId: string) => void;
  selectedRequest: Request | null;
  requestClient: User | null;
  cars: Record<string, Car>;
  loading?: boolean;
}

export function ClientRequests({
  clientRequests,
  viewedRequests,
  onViewDetails,
  onMessage,
  onSendOffer,
  onRejectRequest,
  selectedRequest,
  requestClient,
  cars,
  loading = false,
}: ClientRequestsProps) {
  const [sortField, setSortField] = useState<keyof Request>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [selectedOfferRequest, setSelectedOfferRequest] = useState<Request | null>(null);

  const filteredRequests = clientRequests.filter((request) => {
    if (showOnlyNew && viewedRequests.has(request.id)) {
      return false;
    }

    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      (request.title?.toLowerCase() || "").includes(searchLower) ||
      (request.description?.toLowerCase() || "").includes(searchLower) ||
      (request.county?.toLowerCase() || "").includes(searchLower) ||
      (request.cities || []).some((city) =>
        (city?.toLowerCase() || "").includes(searchLower),
      ) ||
      (request.status?.toLowerCase() || "").includes(searchLower) ||
      (request.clientName?.toLowerCase() || "").includes(searchLower) ||
      (request.preferredDate &&
        format(new Date(request.preferredDate), "dd.MM.yyyy").includes(
          searchQuery,
        )) ||
      (request.createdAt &&
        format(new Date(request.createdAt), "dd.MM.yyyy").includes(searchQuery))
    );
  });

  const requestsWithOffers = filteredRequests.filter(request => request.hasReceivedOffer);
  const requestsWithoutOffers = filteredRequests.filter(request => !request.hasReceivedOffer);

  const sortedRequests = [...requestsWithoutOffers].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortDirection === "asc" ? 1 : -1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * modifier;
    }
    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * modifier;
    }
    return 0;
  });


  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = sortedRequests.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add first page
    if (startPage > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
        </PaginationItem>,
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }
    }

    // Add pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={currentPage === i}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Add last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="end-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  if (loading) {
    return (
      <Card className="border-[#00aff5]/20">
        <CardContent className="p-6 flex justify-center items-center min-h-[200px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!loading && clientRequests.length === 0) {
    return (
      <Card className="border-[#00aff5]/20">
        <CardContent className="p-6 flex justify-center items-center min-h-[200px]">
          <div className="text-center">
            <p className="text-muted-foreground">No client requests found.</p>
            <p className="text-sm text-muted-foreground mt-1">
              New requests matching your location will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const handleSendOfferClick = (request: Request) => {
    setSelectedOfferRequest(request);
    setShowOfferForm(true);
  };

  const handleOfferSubmit = async (values: any) => {
    if (selectedOfferRequest) {
      await onSendOffer(selectedOfferRequest, values);
      // Don't change request status here, it should remain Active
      setShowOfferForm(false);
      setSelectedOfferRequest(null);
    }
  };

  return (
    <>
      <Card className="border-[#00aff5]/20 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[#00aff5] flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Cereri în Așteptare
              </CardTitle>
              {clientRequests.filter((req) => !viewedRequests.has(req.id) && !req.hasReceivedOffer)
                .length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-[#00aff5] text-white text-sm font-normal px-2.5 py-1"
                >
                  {
                    clientRequests.filter((req) => !viewedRequests.has(req.id) && !req.hasReceivedOffer)
                      .length
                  }
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-new"
                  checked={showOnlyNew}
                  onCheckedChange={setShowOnlyNew}
                />
                <Label htmlFor="show-new" className="whitespace-nowrap">
                  Doar cereri noi
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Afișează:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="10 pe pagină" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 pe pagină</SelectItem>
                    <SelectItem value="20">20 pe pagină</SelectItem>
                    <SelectItem value="50">50 pe pagină</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Caută cereri..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-[300px]"
              />
            </div>
          </div>
          <CardDescription>
            Vezi și gestionează cererile care așteaptă ofertă
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="max-h-[2000px] overflow-y-auto pr-2">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Titlu</TableHead>
                    <TableHead>
                      <button
                        onClick={() => {
                          setSortField("createdAt");
                          setSortDirection((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          );
                        }}
                        className="flex items-center hover:text-[#00aff5]"
                      >
                        Data primirii
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => {
                          setSortField("preferredDate");
                          setSortDirection((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          );
                        }}
                        className="flex items-center hover:text-[#00aff5]"
                      >
                        Data preferată
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </button>
                    </TableHead>
                    <TableHead>Județ</TableHead>
                    <TableHead>Localități</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:last-child]:border-0">
                  {paginatedRequests.map((request) => (
                    <Fragment key={request.id}>
                      <TableRow
                        className={`
                        hover:bg-blue-50/80 transition-colors relative mb-2 
                        ${
                          selectedRequest?.id === request.id
                            ? "bg-blue-200 border-l-4 border-blue-500"
                            : ""
                        }
                      `}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {!viewedRequests.has(request.id) && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                NEW
                              </span>
                            )}
                            <span
                              className={
                                !viewedRequests.has(request.id) ? "font-bold" : ""
                              }
                            >
                              {request.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(request.createdAt),
                            "dd.MM.yyyy HH:mm",
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.preferredDate), "dd.MM.yyyy")}
                        </TableCell>
                        <TableCell>{request.county}</TableCell>
                        <TableCell>{request.cities.join(", ")}</TableCell>
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
                              onClick={() => onViewDetails(request)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Detalii
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onMessage(request)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                            >
                              <MessageSquare className="h-4 w-4" />
                              Mesaj
                            </Button>
                            {request.status === "Active" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendOfferClick(request)}
                                  className="text-green-500 hover:text-green-700 hover:bg-green-50 flex items-center gap-1"
                                >
                                  <SendHorizontal className="h-4 w-4" />
                                  Trimite ofertă
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRejectRequest(request.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                                >
                                  <X className="h-4 w-4" />
                                  Respinge
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {selectedRequest?.id === request.id && (
                        <TableRow
                          className={`
                          hover:bg-transparent
                          ${selectedRequest?.id === request.id ? "bg-blue-200 border-l-4 border-blue-500" : ""}
                        `}
                        >
                          <TableCell colSpan={7} className="p-0">
                            <div className="bg-gray-50 p-6 border-t border-b">
                              <div className="grid gap-6">
                                {/* Description Section */}
                                <div>
                                  <h3 className="text-sm font-medium mb-2">
                                    Descriere Cerere
                                  </h3>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-white p-4 rounded-lg border">
                                    {request.description}
                                  </p>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                  {/* Client Details */}
                                  <div>
                                    <h3 className="text-sm font-medium mb-2">
                                      Client
                                    </h3>
                                    <div className="bg-white p-4 rounded-lg border">
                                      <p className="text-sm">
                                        {request.clientName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {requestClient?.email}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Car Details */}
                                  <div>
                                    <h3 className="text-sm font-medium mb-2">
                                      Mașină
                                    </h3>
                                    <div className="bg-white p-4 rounded-lg border">
                                      <p className="text-sm">
                                        {cars[request.carId] ? (
                                          <>
                                            {cars[request.carId].brand}{" "}
                                            {cars[request.carId].model} (
                                            {cars[request.carId].year})
                                            {cars[request.carId].licensePlate && (
                                              <span className="text-xs text-muted-foreground block mt-1">
                                                Nr.{" "}
                                                {cars[request.carId].licensePlate}
                                              </span>
                                            )}
                                            {cars[request.carId].vin && (
                                              <span className="text-xs text-muted-foreground block mt-1">
                                                VIN: {cars[request.carId].vin}
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          "Detalii indisponibile"
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Date Details */}
                                  <div>
                                    <h3 className="text-sm font-medium mb-2">
                                      Data preferată
                                    </h3>
                                    <div className="bg-white p-4 rounded-lg border">
                                      <p className="text-sm">
                                        {format(
                                          new Date(request.preferredDate),
                                          "dd.MM.yyyy",
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <Pagination className="justify-center">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  {renderPaginationItems()}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </CardContent>
      </Card>

      {requestsWithOffers.length > 0 && (
        <Card className="border-[#00aff5]/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-[#00aff5] flex items-center gap-2">
                <SendHorizontal className="h-5 w-5" />
                Cereri cu Oferte Trimise
              </CardTitle>
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                {requestsWithOffers.length}
              </Badge>
            </div>
            <CardDescription>
              Cereri pentru care ai trimis deja oferte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="max-h-[2000px] overflow-y-auto pr-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Titlu</TableHead>
                      <TableHead>Data primirii</TableHead>
                      <TableHead>Data preferată</TableHead>
                      <TableHead>Județ</TableHead>
                      <TableHead>Localități</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsWithOffers.map((request) => (
                      <Fragment key={request.id}>
                        <TableRow
                          className={`
                          hover:bg-blue-50/80 transition-colors relative mb-2 
                          ${
                            selectedRequest?.id === request.id
                              ? "bg-blue-200 border-l-4 border-blue-500"
                              : ""
                          }
                        `}
                        >
                          <TableCell className="font-medium">
                            {request.title}
                          </TableCell>
                          <TableCell>
                            {format(new Date(request.createdAt), "dd.MM.yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(request.preferredDate), "dd.MM.yyyy")}
                          </TableCell>
                          <TableCell>{request.county}</TableCell>
                          <TableCell>{request.cities.join(", ")}</TableCell>
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
                                onClick={() => onViewDetails(request)}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                Detalii
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onMessage(request)}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                              >
                                <MessageSquare className="h-4 w-4" />
                                Mesaj
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {selectedRequest?.id === request.id && (
                          <TableRow
                            className={`
                            hover:bg-transparent
                            ${selectedRequest?.id === request.id ? "bg-blue-200 border-l-4 border-blue-500" : ""}
                          `}
                          >
                            <TableCell colSpan={7} className="p-0">
                              <div className="bg-gray-50 p-6 border-t border-b">
                                <div className="grid gap-6">
                                  {/* Description Section */}
                                  <div>
                                    <h3 className="text-sm font-medium mb-2">
                                      Descriere Cerere
                                    </h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-white p-4 rounded-lg border">
                                      {request.description}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-3 gap-6">
                                    {/* Client Details */}
                                    <div>
                                      <h3 className="text-sm font-medium mb-2">
                                        Client
                                      </h3>
                                      <div className="bg-white p-4 rounded-lg border">
                                        <p className="text-sm">
                                          {request.clientName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {requestClient?.email}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Car Details */}
                                    <div>
                                      <h3 className="text-sm font-medium mb-2">
                                        Mașină
                                      </h3>
                                      <div className="bg-white p-4 rounded-lg border">
                                        <p className="text-sm">
                                          {cars[request.carId] ? (
                                            <>
                                              {cars[request.carId].brand}{" "}
                                              {cars[request.carId].model} (
                                              {cars[request.carId].year})
                                              {cars[request.carId].licensePlate && (
                                                <span className="text-xs text-muted-foreground block mt-1">
                                                  Nr.{" "}
                                                  {cars[request.carId].licensePlate}
                                                </span>
                                              )}
                                              {cars[request.carId].vin && (
                                                <span className="text-xs text-muted-foreground block mt-1">
                                                  VIN: {cars[request.carId].vin}
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            "Detalii indisponibile"
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Date Details */}
                                    <div>
                                      <h3 className="text-sm font-medium mb-2">
                                        Data preferată
                                      </h3>
                                      <div className="bg-white p-4 rounded-lg border">
                                        <p className="text-sm">
                                          {format(
                                            new Date(request.preferredDate),
                                            "dd.MM.yyyy",
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedOfferRequest && (
        <SubmitOfferForm
          isOpen={showOfferForm}
          onClose={() => {
            setShowOfferForm(false);
            setSelectedOfferRequest(null);
          }}
          request={selectedOfferRequest}
          onSubmit={handleOfferSubmit}
        />
      )}
    </>
  );
}

export default ClientRequests;