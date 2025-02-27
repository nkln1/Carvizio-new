// Import necessary components
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Car, MapPin, Send } from "lucide-react";
import type { Request, ViewedRequest, SentOffer } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { SearchBar } from "./requests/SearchBar";
import { RequestDetailsDialog } from "./requests/RequestDetailsDialog";
import { SendOfferDialog } from "./requests/SendOfferDialog";
import { useServiceRequestManagement } from "@/hooks/useServiceRequestManagement";
import { useQuery } from "@tanstack/react-query";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

export function AvailableRequestsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSendOfferDialog, setShowSendOfferDialog] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);

  const {
    requests,
    viewedRequests,
    markRequestAsViewed,
    isLoading,
  } = useServiceRequestManagement();

  // Fetch sent offers to filter out requests that already have offers
  const { data: sentOffers = [] } = useQuery<SentOffer[]>({
    queryKey: ["/api/service/offers"],
    refetchInterval: 30000
  });

  const requestsPerPage = 10;

  // Update filtered requests whenever requests or sent offers change
  useEffect(() => {
    if (!requests || !sentOffers) return;

    // Get the IDs of requests that already have offers
    const requestIdsWithOffers = sentOffers.map(offer => offer.requestId);

    // Filter out requests that already have offers and match search query
    const filtered = requests.filter(request => {
      const hasNoOffer = !requestIdsWithOffers.includes(request.id);
      const matchesSearch = 
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description.toLowerCase().includes(searchQuery.toLowerCase());

      return hasNoOffer && matchesSearch;
    });

    setFilteredRequests(filtered);
  }, [requests, sentOffers, searchQuery]);

  const startIndex = (currentPage - 1) * requestsPerPage;
  const endIndex = startIndex + requestsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRequestClick = (request: Request) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setSelectedRequest(null);
    setShowDetailsDialog(false);
  };

  const handleSendOffer = (request: Request) => {
    setSelectedRequest(request);
    setShowSendOfferDialog(true);
  };

  const handleCloseSendOfferDialog = () => {
    setSelectedRequest(null);
    setShowSendOfferDialog(false);
  };


  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <SearchBar value={searchQuery} onChange={handleSearchChange} />
      {paginatedRequests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <CardTitle>{request.title}</CardTitle>
            <CardDescription>{request.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(request.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>{request.location}</span>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => handleRequestClick(request)}>
                Detalii
              </Button>
              <Button onClick={() => handleSendOffer(request)}>Trimite oferta</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Pagination>
        <PaginationContent>
          {Array.from({ length: Math.ceil(filteredRequests.length / requestsPerPage) }).map(
            (_, index) => (
              <PaginationItem key={index + 1} onClick={() => handlePageChange(index + 1)} value={index + 1} selected={currentPage === index + 1}>
                {index + 1}
              </PaginationItem>
            )
          )}
        </PaginationContent>
      </Pagination>
      <RequestDetailsDialog open={showDetailsDialog} onClose={handleCloseDetailsDialog} request={selectedRequest} />
      <SendOfferDialog open={showSendOfferDialog} onClose={handleCloseSendOfferDialog} request={selectedRequest} />
    </div>
  );
}