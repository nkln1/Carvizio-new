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

// Hooks pentru a prelua datele de la API
const useClients = () => {
  return useQuery({
    queryKey: ['/api/admin/clients'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/clients', { method: 'GET' });
      return response || [];
    }
  });
};

const useServiceProviders = () => {
  return useQuery({
    queryKey: ['/api/admin/service-providers'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/service-providers', { method: 'GET' });
      return response || [];
    }
  });
};

const useRequests = () => {
  return useQuery({
    queryKey: ['/api/admin/requests'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/requests', { method: 'GET' });
      return response || [];
    }
  });
};

const useReviews = () => {
  return useQuery({
    queryKey: ['/api/admin/reviews'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/reviews', { method: 'GET' });
      return response || [];
    }
  });
};
// Mutations pentru a actualiza datele
const useVerifyClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, verified }: { clientId: number, verified: boolean }) => {
      return apiRequest(`/api/admin/client/${clientId}/verify`, {
        method: 'POST',
        body: { verified }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
    }
  });
};

const useVerifyServiceProvider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ providerId, verified }: { providerId: number, verified: boolean }) => {
      return apiRequest(`/api/admin/service-provider/${providerId}/verify`, {
        method: 'POST',
        body: { verified }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-providers'] });
    }
  });
};

const useDismissReviewReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: number }) => {
      return apiRequest(`/api/admin/review/${reviewId}/dismiss-report`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
    }
  });
};
// Dashboard Component
const Dashboard = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  // Utilizăm hooks-urile definite anterior
  const clientsQuery = useClients();
  const serviceProvidersQuery = useServiceProviders();
  const requestsQuery = useRequests();
  const reviewsQuery = useReviews();
  
  // Mutations pentru actualizarea datelor
  const verifyClientMutation = useVerifyClient();
  const verifyServiceProviderMutation = useVerifyServiceProvider();
  const dismissReviewReportMutation = useDismissReviewReport();

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

  // Verificăm dacă utilizatorul are permisiunea de admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const currentUser = auth.currentUser;
        
        if (!currentUser || !currentUser.email) {
          setLocation('/admin/login');
          toast({
            title: "Acces interzis",
            description: "Trebuie să vă autentificați ca administrator.",
            variant: "destructive",
          });
          return;
        }
        
        // Verificam dacă email-ul curent are acces de admin
        const isAdmin = ADMIN_EMAILS.includes(currentUser.email);
        
        if (!isAdmin) {
          setLocation('/');
          toast({
            title: "Acces interzis",
            description: "Nu aveți permisiunea de a accesa panoul de administrare.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Eroare la verificarea accesului de admin:", error);
        setLocation('/');
      }
    };
    
    checkAdminAccess();
  }, []);
  
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
  
  // Statistici pentru pagina de prezentare generală
  const statistics = {
    totalClients: clientsQuery.data?.length || 0,
    totalServiceProviders: serviceProvidersQuery.data?.length || 0,
    totalRequests: requestsQuery.data?.length || 0,
    totalReviews: reviewsQuery.data?.length || 0,
    unverifiedClients: clientsQuery.data?.filter(client => !client.verified)?.length || 0,
    unverifiedProviders: serviceProvidersQuery.data?.filter(provider => !provider.verified)?.length || 0
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Panou de administrare</h1>
        <Button variant="outline" onClick={() => auth.signOut().then(() => setLocation('/'))}>
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
                  {clientsQuery.data?.map((client) => (
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
                        <Button variant="ghost" size="sm">
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
                  {serviceProvidersQuery.data?.map((provider) => (
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
                        <Button variant="ghost" size="sm">
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
                  {requestsQuery.data?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.id}</TableCell>
                      <TableCell>{request.title}</TableCell>
                      <TableCell>{request.clientName}</TableCell>
                      <TableCell>{request.status}</TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
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
                  {reviewsQuery.data?.map((review) => (
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
    </div>
  );
};


  const requestsQuery = useQuery({
    queryKey: ['/api/admin/requests'],
    enabled: activeTab === 'requests' || activeTab === 'overview'
  });
  
  const reviewsQuery = useQuery({
    queryKey: ['/api/admin/reviews'],
    enabled: activeTab === 'reviews' || activeTab === 'overview'
  });
  
  // Mutații pentru actualizări
  const updateClientVerificationMutation = useMutation({
    mutationFn: ({ clientId, verified }: { clientId: number, verified: boolean }) => {
      return apiRequest('PATCH', `/api/admin/clients/${clientId}/verify`, { verified });
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
      return apiRequest('PATCH', `/api/admin/service-providers/${serviceProviderId}/verify`, { verified });
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
      return apiRequest('PATCH', `/api/admin/reviews/${reviewId}/handle-report`, { action });
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

export default Dashboard;