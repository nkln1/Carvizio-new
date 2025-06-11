import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

// Lista de adrese email cu rol de admin
const ADMIN_EMAILS = ['nikelino6@yahoo.com'];

// Dashboard Component
const Dashboard = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Pagination states
  const [clientsPage, setClientsPage] = useState(1);
  const [providersPage, setProvidersPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const itemsPerPage = 10;

  // Interogări pentru date cu paginație
  const clientsQuery = useQuery({
    queryKey: ['/api/admin/clients', clientsPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/clients?page=${clientsPage}&limit=${itemsPerPage}`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      return response.json();
    },
    enabled: activeTab === 'clients' || activeTab === 'overview'
  });

  const serviceProvidersQuery = useQuery({
    queryKey: ['/api/admin/service-providers', providersPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/service-providers?page=${providersPage}&limit=${itemsPerPage}`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      return response.json();
    },
    enabled: activeTab === 'providers' || activeTab === 'overview'
  });

  const requestsQuery = useQuery({
    queryKey: ['/api/admin/requests', requestsPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/requests?page=${requestsPage}&limit=${itemsPerPage}`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      return response.json();
    },
    enabled: activeTab === 'requests' || activeTab === 'overview'
  });

  const reviewsQuery = useQuery({
    queryKey: ['/api/admin/reviews', reviewsPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/reviews?page=${reviewsPage}&limit=${itemsPerPage}`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      return response.json();
    },
    enabled: activeTab === 'reviews' || activeTab === 'overview'
  });

  // Mutations pentru actualizarea datelor
  const verifyClientMutation = useMutation({
    mutationFn: async ({ clientId, verified }: { clientId: number, verified: boolean }) => {
      const response = await fetch(`/api/admin/client/${clientId}/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ verified })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
    }
  });

  const verifyServiceProviderMutation = useMutation({
    mutationFn: async ({ providerId, verified }: { providerId: number, verified: boolean }) => {
      const response = await fetch(`/api/admin/service-provider/${providerId}/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ verified })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-providers'] });
    }
  });

  const dismissReviewReportMutation = useMutation({
    mutationFn: async ({ reviewId }: { reviewId: number }) => {
      const response = await fetch(`/api/admin/review/${reviewId}/dismiss-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      setShowReviewDialog(false);
    }
  });

  // Handler pentru verificarea unui client
  const handleVerifyClient = (clientId: number, verified: boolean) => {
    verifyClientMutation.mutate(
      { clientId, verified },
      {
        onSuccess: () => {
          toast({
            title: "Succes!",
            description: `Clientul a fost ${verified ? 'verificat' : 'marcat ca neverificat'} cu succes.`,
            variant: "default",
          });
        },
        onError: (error) => {
          toast({
            title: "Eroare!",
            description: "Nu s-a putut actualiza statusul de verificare al clientului.",
            variant: "destructive",
          });
        }
      }
    );
  };

  // Handler pentru verificarea unui furnizor de servicii
  const handleVerifyServiceProvider = (providerId: number, verified: boolean) => {
    verifyServiceProviderMutation.mutate(
      { providerId, verified },
      {
        onSuccess: () => {
          toast({
            title: "Succes!",
            description: `Furnizorul de servicii a fost ${verified ? 'verificat' : 'marcat ca neverificat'} cu succes.`,
            variant: "default",
          });
        },
        onError: (error) => {
          toast({
            title: "Eroare!",
            description: "Nu s-a putut actualiza statusul de verificare al furnizorului de servicii.",
            variant: "destructive",
          });
        }
      }
    );
  };

  // Handler pentru gestionarea unui raport de recenzie
  const handleDismissReviewReport = (reviewId: number) => {
    dismissReviewReportMutation.mutate(
      { reviewId },
      {
        onSuccess: () => {
          toast({
            title: "Succes!",
            description: "Raportul recenziei a fost respins cu succes.",
            variant: "default",
          });
        },
        onError: (error) => {
          toast({
            title: "Eroare!",
            description: "Nu s-a putut respinge raportul recenziei.",
            variant: "destructive",
          });
        }
      }
    );
  };

  // Handler pentru afișarea detaliilor unei cereri
  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setShowRequestDialog(true);
  };

  // Verificăm dacă utilizatorul are permisiunea de admin folosind AdminAuthContext
  const { isAdmin, isLoading, adminData, logout } = useAdminAuth();

  useEffect(() => {
    // Dacă nu se încarcă și nu este admin, redirecționăm către pagina de login
    if (!isLoading && !isAdmin) {
      setLocation('/admin/login');
      toast({
        title: "Acces interzis",
        description: "Trebuie să vă autentificați ca administrator.",
        variant: "destructive",
      });
    }
  }, [isLoading, isAdmin, setLocation, toast]);

  // Dacă datele sunt în încărcare, afișăm un indicator
  if (clientsQuery.isLoading || serviceProvidersQuery.isLoading || requestsQuery.isLoading || reviewsQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-2 text-xl">Se încarcă datele...</span>
      </div>
    );
  }

  // Dacă apare o eroare, o afișăm
  if (clientsQuery.isError || serviceProvidersQuery.isError || requestsQuery.isError || reviewsQuery.isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold text-destructive">Eroare la încărcarea datelor</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          A apărut o eroare la preluarea datelor. Vă rugăm să reîncărcați pagina sau să contactați echipa tehnică.
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reîncarcă pagina
        </Button>
      </div>
    );
  }

  // Extragerea datelor cu suport pentru paginație
  const clientsData = clientsQuery.data?.clients ? Array.isArray(clientsQuery.data.clients) ? clientsQuery.data.clients : [] : 
                      Array.isArray(clientsQuery.data) ? clientsQuery.data : [];
  const clientsPagination = clientsQuery.data?.pagination;

  const providersData = serviceProvidersQuery.data?.serviceProviders ? Array.isArray(serviceProvidersQuery.data.serviceProviders) ? serviceProvidersQuery.data.serviceProviders : [] :
                        Array.isArray(serviceProvidersQuery.data) ? serviceProvidersQuery.data : [];
  const providersPagination = serviceProvidersQuery.data?.pagination;

  const requestsData = requestsQuery.data?.requests ? Array.isArray(requestsQuery.data.requests) ? requestsQuery.data.requests : [] :
                      Array.isArray(requestsQuery.data) ? requestsQuery.data : [];
  const requestsPagination = requestsQuery.data?.pagination;

  const reviewsData = reviewsQuery.data?.reviews ? Array.isArray(reviewsQuery.data.reviews) ? reviewsQuery.data.reviews : [] :
                     Array.isArray(reviewsQuery.data) ? reviewsQuery.data : [];
  const reviewsPagination = reviewsQuery.data?.pagination;

  const statistics = {
    totalClients: clientsPagination?.total || clientsData.length || 0,
    totalServiceProviders: providersPagination?.total || providersData.length || 0,
    totalRequests: requestsPagination?.total || requestsData.length || 0,
    totalReviews: reviewsPagination?.total || reviewsData.length || 0,
    unverifiedClients: clientsData.filter((client: any) => !client.verified).length || 0,
    unverifiedProviders: providersData.filter((provider: any) => !provider.verified).length || 0
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Panou de administrare</h1>
        <Button variant="outline" onClick={() => {
          logout().then(() => setLocation('/admin/login'));
        }}>
          Deconectare
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Prezentare generală</TabsTrigger>
          <TabsTrigger value="clients">Clienți</TabsTrigger>
          <TabsTrigger value="providers">Furnizori de servicii</TabsTrigger>
          <TabsTrigger value="requests">Cereri</TabsTrigger>
          <TabsTrigger value="reviews">Recenzii</TabsTrigger>
        </TabsList>

        {/* Tab Prezentare generală */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Clienți</CardTitle>
                <CardDescription>Statistici privind clienții</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalClients}</p>
                <p className="text-sm text-muted-foreground">Total clienți</p>
                <p className="mt-2 text-lg font-semibold text-amber-500">{statistics.unverifiedClients}</p>
                <p className="text-sm text-muted-foreground">Clienți neverificați</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Furnizori de servicii</CardTitle>
                <CardDescription>Statistici privind furnizorii</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalServiceProviders}</p>
                <p className="text-sm text-muted-foreground">Total furnizori</p>
                <p className="mt-2 text-lg font-semibold text-amber-500">{statistics.unverifiedProviders}</p>
                <p className="text-sm text-muted-foreground">Furnizori neverificați</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activitate</CardTitle>
                <CardDescription>Statistici privind activitatea</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalRequests}</p>
                <p className="text-sm text-muted-foreground">Total cereri</p>
                <p className="mt-2 text-lg font-semibold">{statistics.totalReviews}</p>
                <p className="text-sm text-muted-foreground">Total recenzii</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Clienți */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Lista clienților</CardTitle>
              <CardDescription>Gestionați clienții înregistrați în sistem</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nume</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Locație</TableHead>
                    <TableHead>Înregistrat la</TableHead>
                    <TableHead>Verificat</TableHead>
                    <TableHead>Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsData.map((client: any) => (
                    <TableRow key={client.id}>
                      <TableCell>{client.id}</TableCell>
                      <TableCell>{client.firstName} {client.lastName}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.city}, {client.county}</TableCell>
                      <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Switch
                          checked={client.verified}
                          onCheckedChange={(checked) => handleVerifyClient(client.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocation(`/admin/clients/${client.id}`)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Detalii
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Furnizori */}
        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Lista furnizorilor de servicii</CardTitle>
              <CardDescription>Gestionați furnizorii de servicii înregistrați în sistem</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Companie</TableHead>
                    <TableHead>Reprezentant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Locație</TableHead>
                    <TableHead>Înregistrat la</TableHead>
                    <TableHead>Verificat</TableHead>
                    <TableHead>Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providersData.map((provider: any) => (
                    <TableRow key={provider.id}>
                      <TableCell>{provider.id}</TableCell>
                      <TableCell>{provider.companyName}</TableCell>
                      <TableCell>{provider.representativeName}</TableCell>
                      <TableCell>{provider.email}</TableCell>
                      <TableCell>{provider.phone}</TableCell>
                      <TableCell>{provider.city}, {provider.county}</TableCell>
                      <TableCell>{new Date(provider.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Switch
                          checked={provider.verified}
                          onCheckedChange={(checked) => handleVerifyServiceProvider(provider.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocation(`/admin/service-providers/${provider.id}`)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Detalii
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Cereri */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Lista cererilor</CardTitle>
              <CardDescription>Vizualizați cererile din sistem</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Titlu</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Creat la</TableHead>
                    <TableHead>Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsData.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.id}</TableCell>
                      <TableCell>{request.title}</TableCell>
                      <TableCell>{request.clientName}</TableCell>
                      <TableCell>{request.status}</TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewRequest(request)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Detalii
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Recenzii */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Lista recenziilor</CardTitle>
              <CardDescription>Gestionați recenziile din sistem</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Furnizor</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Conținut</TableHead>
                    <TableHead>Creat la</TableHead>
                    <TableHead>Raportat</TableHead>
                    <TableHead>Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewsData.map((review: any) => (
                    <TableRow key={review.id}>
                      <TableCell>{review.id}</TableCell>
                      <TableCell>{review.clientName}</TableCell>
                      <TableCell>{review.serviceProviderName}</TableCell>
                      <TableCell>{review.rating} / 5</TableCell>
                      <TableCell className="max-w-xs truncate">{review.content}</TableCell>
                      <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {review.reportStatus ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                            Raportat
                          </span>
                        ) : "Nu"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setShowReviewDialog(true);
                            }}
                          >
                            Detalii
                          </Button>
                          {review.reportStatus && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDismissReviewReport(review.id)}
                            >
                              Respinge raport
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pentru detalii recenzie */}
      {selectedReview && (
        <AlertDialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Detalii recenzie</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="mt-2 space-y-2">
                  <p><strong>ID:</strong> {selectedReview.id}</p>
                  <p><strong>Client:</strong> {selectedReview.clientName}</p>
                  <p><strong>Furnizor:</strong> {selectedReview.serviceProviderName}</p>
                  <p><strong>Rating:</strong> {selectedReview.rating} / 5</p>
                  <p><strong>Creat la:</strong> {new Date(selectedReview.createdAt).toLocaleString()}</p>
                  <p><strong>Conținut:</strong></p>
                  <div className="max-h-40 overflow-y-auto rounded-md bg-muted p-2">
                    {selectedReview.content}
                  </div>

                  {selectedReview.reportStatus && (
                    <div className="mt-4 rounded-md bg-amber-50 p-3">
                      <h4 className="font-semibold text-amber-800">Recenzie raportată</h4>
                      <p className="text-sm text-amber-700">Această recenzie a fost raportată și necesită atenția dvs.</p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Închide</AlertDialogCancel>
              {selectedReview.reportStatus && (
                <AlertDialogAction
                  onClick={() => handleDismissReviewReport(selectedReview.id)}
                >
                  Respinge raport
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog pentru detalii cerere */}
      {selectedRequest && (
        <AlertDialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Detalii cerere</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="mt-2 space-y-2">
                  <p><strong>ID:</strong> {selectedRequest.id}</p>
                  <p><strong>Titlu:</strong> {selectedRequest.title}</p>
                  <p><strong>Client:</strong> {selectedRequest.clientName}</p>
                  <p><strong>Status:</strong> {selectedRequest.status}</p>
                  <p><strong>Creat la:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  {selectedRequest.preferredDate && (
                    <p><strong>Data preferată:</strong> {new Date(selectedRequest.preferredDate).toLocaleDateString()}</p>
                  )}
                  {selectedRequest.location && (
                    <p><strong>Locație:</strong> {selectedRequest.location}</p>
                  )}
                  {selectedRequest.description && (
                    <>
                      <p><strong>Descriere:</strong></p>
                      <div className="max-h-40 overflow-y-auto rounded-md bg-muted p-2 whitespace-pre-line">
                        {selectedRequest.description}
                      </div>
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Închide</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Dashboard;