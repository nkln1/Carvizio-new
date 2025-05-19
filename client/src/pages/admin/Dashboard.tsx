import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
import { Loader2 } from 'lucide-react';

// Lista de adrese email cu rol de admin
const ADMIN_EMAILS = ['nikelino6@yahoo.com'];

// Date de exemplu - acestea vor fi înlocuite cu date reale din API în viitor
const mockClients = [
  {
    id: 1,
    name: 'Ion Popescu',
    email: 'ion.popescu@example.com',
    phone: '0722123456',
    county: 'București',
    city: 'București',
    verified: true,
    createdAt: '2024-01-15T10:30:00'
  },
  {
    id: 2,
    name: 'Maria Ionescu',
    email: 'maria.ionescu@example.com',
    phone: '0733654321',
    county: 'Cluj',
    city: 'Cluj-Napoca',
    verified: false,
    createdAt: '2024-02-20T14:45:00'
  },
  {
    id: 3,
    name: 'Andrei Radu',
    email: 'andrei.radu@example.com',
    phone: '0744987654',
    county: 'Iași',
    city: 'Iași',
    verified: true,
    createdAt: '2024-03-05T09:15:00'
  }
];

const mockServiceProviders = [
  {
    id: 1,
    companyName: 'Auto Service Rapid',
    representativeName: 'George Dumitrescu',
    email: 'contact@autoservicerapid.ro',
    phone: '0723456789',
    county: 'București',
    city: 'București',
    username: 'autoservicerapid',
    verified: true,
    createdAt: '2024-01-10T08:00:00'
  },
  {
    id: 2,
    companyName: 'Service Motoare Expert',
    representativeName: 'Alexandru Popa',
    email: 'office@servicemotoare.ro',
    phone: '0745678901',
    county: 'Timiș',
    city: 'Timișoara',
    username: 'servicemotoare',
    verified: true,
    createdAt: '2024-02-15T11:30:00'
  },
  {
    id: 3,
    companyName: 'Auto Fix Professional',
    representativeName: 'Mihai Stancu',
    email: 'contact@autofixpro.ro',
    phone: '0756789012',
    county: 'Constanța',
    city: 'Constanța',
    username: 'autofixpro',
    verified: false,
    createdAt: '2024-03-20T13:45:00'
  }
];

const mockRequests = [
  {
    id: 1,
    clientId: 1,
    clientName: 'Ion Popescu',
    title: 'Schimbare ulei și filtre',
    description: 'Doresc schimbarea uleiului și a filtrelor pentru un Ford Focus 2018',
    status: 'Active',
    createdAt: '2024-04-01T10:00:00'
  },
  {
    id: 2,
    clientId: 2,
    clientName: 'Maria Ionescu',
    title: 'Verificare frâne',
    description: 'Am probleme cu frânele la o Skoda Octavia 2020',
    status: 'Rezolvat',
    createdAt: '2024-04-05T14:30:00'
  },
  {
    id: 3,
    clientId: 3,
    clientName: 'Andrei Radu',
    title: 'Diagnoză computer de bord',
    description: 'Se aprinde becul de motor la un Volkswagen Golf 2019',
    status: 'Active',
    createdAt: '2024-04-10T09:15:00'
  }
];

const mockReviews = [
  {
    id: 1,
    serviceProviderId: 1,
    serviceProviderName: 'Auto Service Rapid',
    clientId: 2,
    clientName: 'Maria Ionescu',
    rating: 5,
    comment: 'Servicii excelente, recomand cu încredere!',
    reported: false,
    reportReason: null,
    createdAt: '2024-04-10T16:45:00'
  },
  {
    id: 2,
    serviceProviderId: 2,
    serviceProviderName: 'Service Motoare Expert',
    clientId: 1,
    clientName: 'Ion Popescu',
    rating: 4,
    comment: 'Am rămas mulțumit de servicii, prețuri corecte.',
    reported: false,
    reportReason: null,
    createdAt: '2024-04-12T11:30:00'
  },
  {
    id: 3,
    serviceProviderId: 3,
    serviceProviderName: 'Auto Fix Professional',
    clientId: 3,
    clientName: 'Andrei Radu',
    rating: 2,
    comment: 'Servicii sub așteptări, nu recomand.',
    reported: true,
    reportReason: 'Recenzie nepotrivită și neadevărată.',
    createdAt: '2024-04-15T14:00:00'
  }
];

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewToHandle, setReviewToHandle] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  
  // Interogări pentru date
  const clientsQuery = useQuery({
    queryKey: ['/api/admin/clients'],
    queryFn: () => apiRequest('/api/admin/clients', { method: 'GET' }),
    enabled: activeTab === 'clients' || activeTab === 'overview'
  });
  
  const serviceProvidersQuery = useQuery({
    queryKey: ['/api/admin/service-providers'],
    queryFn: () => apiRequest('/api/admin/service-providers', { method: 'GET' }),
    enabled: activeTab === 'service-providers' || activeTab === 'overview'
  });
  
  const requestsQuery = useQuery({
    queryKey: ['/api/admin/requests'],
    queryFn: () => apiRequest('/api/admin/requests', { method: 'GET' }),
    enabled: activeTab === 'requests' || activeTab === 'overview'
  });
  
  const reviewsQuery = useQuery({
    queryKey: ['/api/admin/reviews'],
    queryFn: () => apiRequest('/api/admin/reviews', { method: 'GET' }),
    enabled: activeTab === 'reviews' || activeTab === 'overview'
  });
  
  // Mutații pentru actualizări
  const updateClientVerificationMutation = useMutation({
    mutationFn: ({ clientId, verified }: { clientId: number, verified: boolean }) => {
      return apiRequest(`/api/admin/clients/${clientId}/verify`, {
        method: 'PATCH',
        data: { verified }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Actualizare reușită',
        description: 'Starea de verificare a fost actualizată cu succes.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'A apărut o eroare la actualizarea stării de verificare.',
      });
    }
  });
  
  const updateServiceProviderVerificationMutation = useMutation({
    mutationFn: ({ serviceProviderId, verified }: { serviceProviderId: number, verified: boolean }) => {
      return apiRequest(`/api/admin/service-providers/${serviceProviderId}/verify`, {
        method: 'PATCH',
        data: { verified }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Actualizare reușită',
        description: 'Starea de verificare a fost actualizată cu succes.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-providers'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'A apărut o eroare la actualizarea stării de verificare.',
      });
    }
  });
  
  const handleReviewReportMutation = useMutation({
    mutationFn: ({ reviewId, action }: { reviewId: number, action: 'remove' | 'dismiss' }) => {
      return apiRequest(`/api/admin/reviews/${reviewId}/handle-report`, {
        method: 'PATCH',
        data: { action }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Acțiune reușită',
        description: 'Recenzia a fost gestionată cu succes.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      setShowReviewDialog(false);
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'A apărut o eroare la gestionarea recenziei.',
      });
    }
  });

  // Verifică dacă utilizatorul este autentificat și are rol de admin
  useEffect(() => {
    const checkAuthentication = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        setLocation('/admin/login');
        return;
      }
      
      if (!ADMIN_EMAILS.includes(user.email || '')) {
        toast({
          variant: 'destructive',
          title: 'Acces restricționat',
          description: 'Nu aveți drepturi de administrator.',
        });
        await auth.signOut();
        setLocation('/admin/login');
      }
    };
    
    checkAuthentication();
  }, [setLocation, toast]);

  // Gestionează deconectarea
  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({
        title: 'Deconectare reușită',
        description: 'V-ați deconectat cu succes.',
      });
      setLocation('/admin/login');
    } catch (error) {
      console.error('Eroare la deconectare:', error);
      toast({
        variant: 'destructive',
        title: 'Eroare la deconectare',
        description: 'A apărut o eroare la deconectare. Vă rugăm să încercați din nou.',
      });
    }
  };

  // Funcții pentru gestionarea interacțiunilor
  const handleClientVerificationToggle = (clientId: number, currentStatus: boolean) => {
    updateClientVerificationMutation.mutate({ clientId, verified: !currentStatus });
  };
  
  const handleServiceProviderVerificationToggle = (serviceProviderId: number, currentStatus: boolean) => {
    updateServiceProviderVerificationMutation.mutate({ serviceProviderId, verified: !currentStatus });
  };
  
  const handleReviewAction = (review: any, action: 'remove' | 'dismiss') => {
    handleReviewReportMutation.mutate({ reviewId: review.id, action });
  };
  
  const openReviewDialog = (review: any) => {
    setReviewToHandle(review);
    setShowReviewDialog(true);
  };
  
  // Statistici pentru pagina de prezentare
  const statistics = {
    totalClients: clientsQuery.data?.length || 0,
    totalServiceProviders: serviceProvidersQuery.data?.length || 0,
    totalRequests: requestsQuery.data?.length || 0,
    totalReviews: reviewsQuery.data?.length || 0,
    activeRequests: requestsQuery.data?.filter((r: any) => r.status === 'Active' || r.status === 'Pending').length || 0,
    reportedReviews: reviewsQuery.data?.filter((r: any) => r.reported).length || 0
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Deconectare
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Prezentare Generală</TabsTrigger>
            <TabsTrigger value="clients">Clienți</TabsTrigger>
            <TabsTrigger value="service-providers">Furnizori Servicii</TabsTrigger>
            <TabsTrigger value="requests">Cereri</TabsTrigger>
            <TabsTrigger value="reviews">Recenzii</TabsTrigger>
          </TabsList>
          
          {/* Prezentare Generală */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Clienți</CardTitle>
                  <CardDescription>Numărul total de clienți înregistrați</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{statistics.totalClients}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Furnizori de Servicii</CardTitle>
                  <CardDescription>Numărul total de furnizori de servicii</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{statistics.totalServiceProviders}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Cereri Active</CardTitle>
                  <CardDescription>Numărul de cereri active în sistem</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{statistics.activeRequests}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recenzii</CardTitle>
                  <CardDescription>Numărul total de recenzii</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{statistics.totalReviews}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recenzii Raportate</CardTitle>
                  <CardDescription>Numărul de recenzii raportate</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{statistics.reportedReviews}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Clienți */}
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Lista Clienților</CardTitle>
                <CardDescription>Toți clienții înregistrați în platformă</CardDescription>
              </CardHeader>
              <CardContent>
                {clientsQuery.isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Se încarcă datele...</span>
                  </div>
                ) : clientsQuery.isError ? (
                  <div className="text-center p-4 text-red-500">
                    A apărut o eroare la încărcarea datelor. Vă rugăm să încercați din nou.
                  </div>
                ) : clientsQuery.data?.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    Nu există clienți înregistrați.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nume</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Județ</TableHead>
                        <TableHead>Oraș</TableHead>
                        <TableHead>Verificat</TableHead>
                        <TableHead>Data Înregistrării</TableHead>
                        <TableHead>Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientsQuery.data?.map((client: any) => (
                        <TableRow key={client.id}>
                          <TableCell>{client.id}</TableCell>
                          <TableCell>{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.phone}</TableCell>
                          <TableCell>{client.county}</TableCell>
                          <TableCell>{client.city}</TableCell>
                          <TableCell>
                            <Switch 
                              checked={client.verified} 
                              onCheckedChange={() => handleClientVerificationToggle(client.id, client.verified)}
                              disabled={updateClientVerificationMutation.isPending}
                            />
                          </TableCell>
                          <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button 
                              variant={client.verified ? "destructive" : "default"} 
                              size="sm"
                              onClick={() => handleClientVerificationToggle(client.id, client.verified)}
                              disabled={updateClientVerificationMutation.isPending}
                            >
                              {updateClientVerificationMutation.isPending && client.id === updateClientVerificationMutation.variables?.clientId ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              {client.verified ? 'Anulează verificarea' : 'Verifică'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Furnizori de Servicii */}
          <TabsContent value="service-providers">
            <Card>
              <CardHeader>
                <CardTitle>Lista Furnizorilor de Servicii</CardTitle>
                <CardDescription>Toți furnizorii de servicii înregistrați în platformă</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceProvidersQuery.isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Se încarcă datele...</span>
                  </div>
                ) : serviceProvidersQuery.isError ? (
                  <div className="text-center p-4 text-red-500">
                    A apărut o eroare la încărcarea datelor. Vă rugăm să încercați din nou.
                  </div>
                ) : serviceProvidersQuery.data?.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    Nu există furnizori de servicii înregistrați.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nume Companie</TableHead>
                        <TableHead>Reprezentant</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Județ</TableHead>
                        <TableHead>Oraș</TableHead>
                        <TableHead>Verificat</TableHead>
                        <TableHead>Data Înregistrării</TableHead>
                        <TableHead>Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceProvidersQuery.data?.map((provider: any) => (
                        <TableRow key={provider.id}>
                          <TableCell>{provider.id}</TableCell>
                          <TableCell>{provider.companyName}</TableCell>
                          <TableCell>{provider.representativeName}</TableCell>
                          <TableCell>{provider.email}</TableCell>
                          <TableCell>{provider.phone}</TableCell>
                          <TableCell>{provider.county}</TableCell>
                          <TableCell>{provider.city}</TableCell>
                          <TableCell>
                            <Switch 
                              checked={provider.verified} 
                              onCheckedChange={() => handleServiceProviderVerificationToggle(provider.id, provider.verified)}
                              disabled={updateServiceProviderVerificationMutation.isPending}
                            />
                          </TableCell>
                          <TableCell>{new Date(provider.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button 
                              variant={provider.verified ? "destructive" : "default"} 
                              size="sm"
                              onClick={() => handleServiceProviderVerificationToggle(provider.id, provider.verified)}
                              disabled={updateServiceProviderVerificationMutation.isPending}
                            >
                              {updateServiceProviderVerificationMutation.isPending && provider.id === updateServiceProviderVerificationMutation.variables?.serviceProviderId ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              {provider.verified ? 'Anulează verificarea' : 'Verifică'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Cereri */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Lista Cererilor</CardTitle>
                <CardDescription>Toate cererile din platformă</CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Se încarcă datele...</span>
                  </div>
                ) : requestsQuery.isError ? (
                  <div className="text-center p-4 text-red-500">
                    A apărut o eroare la încărcarea datelor. Vă rugăm să încercați din nou.
                  </div>
                ) : requestsQuery.data?.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    Nu există cereri înregistrate.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Titlu</TableHead>
                        <TableHead>Detalii</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Creării</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestsQuery.data?.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.id}</TableCell>
                          <TableCell>{request.clientName || `Client #${request.clientId}`}</TableCell>
                          <TableCell>{request.title}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {request.details || request.description}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              request.status === 'Active' || request.status === 'Pending' 
                                ? 'bg-green-100 text-green-800' 
                                : request.status === 'Completed' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Recenzii */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Lista Recenziilor</CardTitle>
                <CardDescription>Toate recenziile din platformă</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewsQuery.isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Se încarcă datele...</span>
                  </div>
                ) : reviewsQuery.isError ? (
                  <div className="text-center p-4 text-red-500">
                    A apărut o eroare la încărcarea datelor. Vă rugăm să încercați din nou.
                  </div>
                ) : reviewsQuery.data?.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    Nu există recenzii înregistrate.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Furnizor Servicii</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comentariu</TableHead>
                        <TableHead>Raportat</TableHead>
                        <TableHead>Motiv Raportare</TableHead>
                        <TableHead>Data Creării</TableHead>
                        <TableHead>Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewsQuery.data?.map((review: any) => (
                        <TableRow key={review.id} className={review.reported ? 'bg-red-50' : ''}>
                          <TableCell>{review.id}</TableCell>
                          <TableCell>{review.serviceProviderName || `Furnizor #${review.serviceProviderId}`}</TableCell>
                          <TableCell>{review.clientName || `Client #${review.clientId}`}</TableCell>
                          <TableCell>{review.rating}</TableCell>
                          <TableCell className="max-w-xs truncate">{review.content || review.comment}</TableCell>
                          <TableCell>{review.reported ? 'Da' : 'Nu'}</TableCell>
                          <TableCell>{review.reportReason || '-'}</TableCell>
                          <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {review.reported && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => openReviewDialog(review)}
                                disabled={handleReviewReportMutation.isPending}
                              >
                                {handleReviewReportMutation.isPending && review.id === handleReviewReportMutation.variables?.reviewId ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Gestionează
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            
            {/* Dialog pentru gestionarea recenziilor raportate */}
            <AlertDialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Gestionare recenzie raportată</AlertDialogTitle>
                  <AlertDialogDescription>
                    {reviewToHandle && (
                      <div className="space-y-2">
                        <p><strong>Furnizor:</strong> {reviewToHandle.serviceProviderName || `Furnizor #${reviewToHandle.serviceProviderId}`}</p>
                        <p><strong>Client:</strong> {reviewToHandle.clientName || `Client #${reviewToHandle.clientId}`}</p>
                        <p><strong>Rating:</strong> {reviewToHandle.rating}</p>
                        <p><strong>Comentariu:</strong> {reviewToHandle.content || reviewToHandle.comment}</p>
                        <p><strong>Motiv raportare:</strong> {reviewToHandle.reportReason}</p>
                        <p>Alegeți acțiunea pe care doriți să o efectuați:</p>
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anulează</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => reviewToHandle && handleReviewAction(reviewToHandle, 'dismiss')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Respinge raportarea
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => reviewToHandle && handleReviewAction(reviewToHandle, 'remove')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Șterge recenzia
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;