
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Users, Car, MessageSquare, Star, Eye, Search, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { fetchWithCsrf } from '@/lib/csrfToken';

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  carsCount?: number;
  requestsCount?: number;
  reviewsCount?: number;
}

interface ServiceProvider {
  id: number;
  companyName: string;
  email: string;
  phone?: string;
  representativeName?: string;
  createdAt: string;
  reviewsCount?: number;
  offersCount?: number;
}

interface Request {
  id: number;
  clientName: string;
  serviceType: string;
  description: string;
  status: string;
  createdAt: string;
  budget?: number;
}

interface Review {
  id: number;
  clientName: string;
  serviceProviderName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const AdminDashboard: React.FC = () => {
  const { isAdmin, isLoading: authLoading, logout } = useAdminAuth();
  const [, setLocation] = useLocation();

  // State pentru fiecare secțiune
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Loading states
  const [clientsLoading, setClientsLoading] = useState(true);
  const [serviceProvidersLoading, setServiceProvidersLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Search states
  const [clientsSearch, setClientsSearch] = useState('');
  const [serviceProvidersSearch, setServiceProvidersSearch] = useState('');
  const [requestsSearch, setRequestsSearch] = useState('');
  const [reviewsSearch, setReviewsSearch] = useState('');

  // Pagination states
  const [clientsPagination, setClientsPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  });

  const [serviceProvidersPagination, setServiceProvidersPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  });

  const [requestsPagination, setRequestsPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  });

  const [reviewsPagination, setReviewsPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  });

  // Helper function pentru construirea query params
  const buildQueryParams = (page: number, pageSize: number, search: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (search.trim()) {
      params.append('search', search.trim());
    }
    return params.toString();
  };

  // Funcții pentru încărcarea datelor
  const fetchClients = async (page: number = 1, pageSize: number = 10, search: string = '') => {
    setClientsLoading(true);
    try {
      const queryParams = buildQueryParams(page, pageSize, search);
      const response = await fetchWithCsrf(`/api/admin/clients?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        setClientsPagination({
          page: data.page || 1,
          pageSize: data.pageSize || 10,
          totalItems: data.totalItems || 0,
          totalPages: data.totalPages || 0
        });
      }
    } catch (error) {
      console.error('Eroare la încărcarea clienților:', error);
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchServiceProviders = async (page: number = 1, pageSize: number = 10, search: string = '') => {
    setServiceProvidersLoading(true);
    try {
      const queryParams = buildQueryParams(page, pageSize, search);
      const response = await fetchWithCsrf(`/api/admin/service-providers?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        setServiceProviders(data.serviceProviders || []);
        setServiceProvidersPagination({
          page: data.page || 1,
          pageSize: data.pageSize || 10,
          totalItems: data.totalItems || 0,
          totalPages: data.totalPages || 0
        });
      }
    } catch (error) {
      console.error('Eroare la încărcarea furnizorilor de servicii:', error);
    } finally {
      setServiceProvidersLoading(false);
    }
  };

  const fetchRequests = async (page: number = 1, pageSize: number = 10, search: string = '') => {
    setRequestsLoading(true);
    try {
      const queryParams = buildQueryParams(page, pageSize, search);
      const response = await fetchWithCsrf(`/api/admin/requests?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
        setRequestsPagination({
          page: data.page || 1,
          pageSize: data.pageSize || 10,
          totalItems: data.totalItems || 0,
          totalPages: data.totalPages || 0
        });
      }
    } catch (error) {
      console.error('Eroare la încărcarea cererilor:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchReviews = async (page: number = 1, pageSize: number = 10, search: string = '') => {
    setReviewsLoading(true);
    try {
      const queryParams = buildQueryParams(page, pageSize, search);
      const response = await fetchWithCsrf(`/api/admin/reviews?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setReviewsPagination({
          page: data.page || 1,
          pageSize: data.pageSize || 10,
          totalItems: data.totalItems || 0,
          totalPages: data.totalPages || 0
        });
      }
    } catch (error) {
      console.error('Eroare la încărcarea recenziilor:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Effect pentru încărcarea inițială a datelor
  useEffect(() => {
    if (isAdmin) {
      fetchClients();
      fetchServiceProviders();
      fetchRequests();
      fetchReviews();
    }
  }, [isAdmin]);

  // Handlers pentru search
  const handleClientsSearch = (value: string) => {
    setClientsSearch(value);
    setClientsPagination(prev => ({ ...prev, page: 1 }));
    fetchClients(1, clientsPagination.pageSize, value);
  };

  const handleServiceProvidersSearch = (value: string) => {
    setServiceProvidersSearch(value);
    setServiceProvidersPagination(prev => ({ ...prev, page: 1 }));
    fetchServiceProviders(1, serviceProvidersPagination.pageSize, value);
  };

  const handleRequestsSearch = (value: string) => {
    setRequestsSearch(value);
    setRequestsPagination(prev => ({ ...prev, page: 1 }));
    fetchRequests(1, requestsPagination.pageSize, value);
  };

  const handleReviewsSearch = (value: string) => {
    setReviewsSearch(value);
    setReviewsPagination(prev => ({ ...prev, page: 1 }));
    fetchReviews(1, reviewsPagination.pageSize, value);
  };

  // Handlers pentru page size change
  const handleClientsPageSizeChange = (pageSize: string) => {
    const newPageSize = parseInt(pageSize);
    setClientsPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
    fetchClients(1, newPageSize, clientsSearch);
  };

  const handleServiceProvidersPageSizeChange = (pageSize: string) => {
    const newPageSize = parseInt(pageSize);
    setServiceProvidersPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
    fetchServiceProviders(1, newPageSize, serviceProvidersSearch);
  };

  const handleRequestsPageSizeChange = (pageSize: string) => {
    const newPageSize = parseInt(pageSize);
    setRequestsPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
    fetchRequests(1, newPageSize, requestsSearch);
  };

  const handleReviewsPageSizeChange = (pageSize: string) => {
    const newPageSize = parseInt(pageSize);
    setReviewsPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
    fetchReviews(1, newPageSize, reviewsSearch);
  };

  // Handlers pentru pagination
  const handleClientsPageChange = (page: number) => {
    setClientsPagination(prev => ({ ...prev, page }));
    fetchClients(page, clientsPagination.pageSize, clientsSearch);
  };

  const handleServiceProvidersPageChange = (page: number) => {
    setServiceProvidersPagination(prev => ({ ...prev, page }));
    fetchServiceProviders(page, serviceProvidersPagination.pageSize, serviceProvidersSearch);
  };

  const handleRequestsPageChange = (page: number) => {
    setRequestsPagination(prev => ({ ...prev, page }));
    fetchRequests(page, requestsPagination.pageSize, requestsSearch);
  };

  const handleReviewsPageChange = (page: number) => {
    setReviewsPagination(prev => ({ ...prev, page }));
    fetchReviews(page, reviewsPagination.pageSize, reviewsSearch);
  };

  // Componenta pentru paginare
  const PaginationComponent = ({ pagination, onPageChange }: { 
    pagination: PaginationState, 
    onPageChange: (page: number) => void 
  }) => {
    const renderPageNumbers = () => {
      const pages = [];
      const { page: currentPage, totalPages } = pagination;

      // Afișăm maxim 5 pagini
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + 4);

      if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
      }

      if (startPage > 1) {
        pages.push(
          <PaginationItem key="1">
            <PaginationLink onClick={() => onPageChange(1)}>1</PaginationLink>
          </PaginationItem>
        );
        if (startPage > 2) {
          pages.push(
            <PaginationItem key="ellipsis1">
              <PaginationEllipsis />
            </PaginationItem>
          );
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink 
              onClick={() => onPageChange(i)}
              isActive={i === currentPage}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push(
            <PaginationItem key="ellipsis2">
              <PaginationEllipsis />
            </PaginationItem>
          );
        }
        pages.push(
          <PaginationItem key={totalPages}>
            <PaginationLink onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }

      return pages;
    };

    if (pagination.totalPages <= 1) return null;

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              className={pagination.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          {renderPageNumbers()}
          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              className={pagination.page === pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/admin/login');
  };

  const handleViewClient = (clientId: number) => {
    setLocation(`/admin/clients/${clientId}`);
  };

  const handleViewServiceProvider = (serviceProviderId: number) => {
    setLocation(`/admin/service-providers/${serviceProviderId}`);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acces neautorizat</CardTitle>
            <CardDescription>Nu aveți permisiuni pentru a accesa această pagină.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/admin/login')} className="w-full">
              Autentificare Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Panou de Administrare</h1>
            <Button variant="outline" onClick={handleLogout}>
              Deconectare
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8">
          {/* Lista Clienților */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-[#00aff5]" />
                  <CardTitle>Lista Clienților</CardTitle>
                </div>
                <Badge variant="secondary">
                  {clientsPagination.totalItems} total
                </Badge>
              </div>
              <div className="flex items-center space-x-4 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Căutare clienți..."
                    value={clientsSearch}
                    onChange={(e) => handleClientsSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={clientsPagination.pageSize.toString()} onValueChange={handleClientsPageSizeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 pe pagină</SelectItem>
                    <SelectItem value="10">10 pe pagină</SelectItem>
                    <SelectItem value="25">25 pe pagină</SelectItem>
                    <SelectItem value="50">50 pe pagină</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nume</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Data înregistrării</TableHead>
                        <TableHead>Mașini</TableHead>
                        <TableHead>Cereri</TableHead>
                        <TableHead>Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.phone || 'N/A'}</TableCell>
                          <TableCell>
                            {new Date(client.createdAt).toLocaleDateString('ro-RO')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{client.carsCount || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{client.requestsCount || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClient(client.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalii
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationComponent 
                    pagination={clientsPagination} 
                    onPageChange={handleClientsPageChange} 
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Lista Furnizorilor de Servicii */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Car className="h-5 w-5 text-[#00aff5]" />
                  <CardTitle>Lista Furnizorilor de Servicii</CardTitle>
                </div>
                <Badge variant="secondary">
                  {serviceProvidersPagination.totalItems} total
                </Badge>
              </div>
              <div className="flex items-center space-x-4 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Căutare furnizori..."
                    value={serviceProvidersSearch}
                    onChange={(e) => handleServiceProvidersSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={serviceProvidersPagination.pageSize.toString()} onValueChange={handleServiceProvidersPageSizeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 pe pagină</SelectItem>
                    <SelectItem value="10">10 pe pagină</SelectItem>
                    <SelectItem value="25">25 pe pagină</SelectItem>
                    <SelectItem value="50">50 pe pagină</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {serviceProvidersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Companie</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Reprezentant</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Data înregistrării</TableHead>
                        <TableHead>Oferte</TableHead>
                        <TableHead>Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceProviders.map((provider) => (
                        <TableRow key={provider.id}>
                          <TableCell className="font-medium">{provider.companyName}</TableCell>
                          <TableCell>{provider.email}</TableCell>
                          <TableCell>{provider.representativeName || 'N/A'}</TableCell>
                          <TableCell>{provider.phone || 'N/A'}</TableCell>
                          <TableCell>
                            {new Date(provider.createdAt).toLocaleDateString('ro-RO')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{provider.offersCount || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewServiceProvider(provider.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalii
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationComponent 
                    pagination={serviceProvidersPagination} 
                    onPageChange={handleServiceProvidersPageChange} 
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Lista Cererilor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-[#00aff5]" />
                  <CardTitle>Lista Cererilor</CardTitle>
                </div>
                <Badge variant="secondary">
                  {requestsPagination.totalItems} total
                </Badge>
              </div>
              <div className="flex items-center space-x-4 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Căutare cereri..."
                    value={requestsSearch}
                    onChange={(e) => handleRequestsSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={requestsPagination.pageSize.toString()} onValueChange={handleRequestsPageSizeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 pe pagină</SelectItem>
                    <SelectItem value="10">10 pe pagină</SelectItem>
                    <SelectItem value="25">25 pe pagină</SelectItem>
                    <SelectItem value="50">50 pe pagină</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Tip serviciu</TableHead>
                        <TableHead>Descriere</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Buget</TableHead>
                        <TableHead>Data creării</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.clientName}</TableCell>
                          <TableCell>{request.serviceType}</TableCell>
                          <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                request.status === 'open' ? 'default' :
                                request.status === 'in_progress' ? 'secondary' :
                                request.status === 'completed' ? 'outline' : 'destructive'
                              }
                            >
                              {request.status === 'open' ? 'Deschisă' :
                               request.status === 'in_progress' ? 'În progres' :
                               request.status === 'completed' ? 'Completată' : 'Anulată'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.budget ? `${request.budget} RON` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString('ro-RO')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationComponent 
                    pagination={requestsPagination} 
                    onPageChange={handleRequestsPageChange} 
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Lista Recenziilor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-[#00aff5]" />
                  <CardTitle>Lista Recenziilor</CardTitle>
                </div>
                <Badge variant="secondary">
                  {reviewsPagination.totalItems} total
                </Badge>
              </div>
              <div className="flex items-center space-x-4 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Căutare recenzii..."
                    value={reviewsSearch}
                    onChange={(e) => handleReviewsSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={reviewsPagination.pageSize.toString()} onValueChange={handleReviewsPageSizeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 pe pagină</SelectItem>
                    <SelectItem value="10">10 pe pagină</SelectItem>
                    <SelectItem value="25">25 pe pagină</SelectItem>
                    <SelectItem value="50">50 pe pagină</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Furnizor serviciu</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comentariu</TableHead>
                        <TableHead>Data creării</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell className="font-medium">{review.clientName}</TableCell>
                          <TableCell>{review.serviceProviderName}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-sm text-gray-600">
                                {review.rating}/5
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
                          <TableCell>
                            {new Date(review.createdAt).toLocaleDateString('ro-RO')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationComponent 
                    pagination={reviewsPagination} 
                    onPageChange={handleReviewsPageChange} 
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
