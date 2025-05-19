import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
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
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

// Lista de adrese email cu rol de admin
const ADMIN_EMAILS = ['nikelino6@yahoo.com'];

// Interfețe pentru tipurile de date
interface Client {
  id: number;
  email: string;
  name: string;
  phone: string;
  county: string;
  city: string;
  verified: boolean;
  createdAt: string;
}

interface ServiceProvider {
  id: number;
  email: string;
  companyName: string;
  representativeName: string;
  phone: string;
  county: string;
  city: string;
  username: string;
  verified: boolean;
  createdAt: string;
}

interface Request {
  id: number;
  clientId: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  clientName?: string;
}

interface Review {
  id: number;
  serviceProviderId: number;
  clientId: number;
  rating: number;
  comment: string;
  reported: boolean;
  reportReason?: string;
  createdAt: string;
  serviceProviderName?: string;
  clientName?: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verifică dacă utilizatorul este autentificat și are rol de admin
  useEffect(() => {
    const checkAuthentication = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        navigate('/admin/login');
        return;
      }
      
      if (!ADMIN_EMAILS.includes(user.email || '')) {
        toast({
          variant: 'destructive',
          title: 'Acces restricționat',
          description: 'Nu aveți drepturi de administrator.',
        });
        await auth.signOut();
        navigate('/admin/login');
      }
    };
    
    checkAuthentication();
  }, [navigate, toast]);

  // Obține clienții din baza de date
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/admin/clients'],
    queryFn: async () => {
      const response = await fetch('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Eroare la obținerea datelor despre clienți');
      }
      
      return response.json() as Promise<Client[]>;
    },
    enabled: !!auth.currentUser
  });

  // Obține furnizorii de servicii din baza de date
  const { data: serviceProviders, isLoading: isLoadingServiceProviders } = useQuery({
    queryKey: ['/api/admin/service-providers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/service-providers', {
        headers: {
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Eroare la obținerea datelor despre furnizorii de servicii');
      }
      
      return response.json() as Promise<ServiceProvider[]>;
    },
    enabled: !!auth.currentUser
  });

  // Obține cererile din baza de date
  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['/api/admin/requests'],
    queryFn: async () => {
      const response = await fetch('/api/admin/requests', {
        headers: {
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Eroare la obținerea datelor despre cereri');
      }
      
      return response.json() as Promise<Request[]>;
    },
    enabled: !!auth.currentUser
  });

  // Obține recenziile din baza de date
  const { data: reviews, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['/api/admin/reviews'],
    queryFn: async () => {
      const response = await fetch('/api/admin/reviews', {
        headers: {
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Eroare la obținerea datelor despre recenzii');
      }
      
      return response.json() as Promise<Review[]>;
    },
    enabled: !!auth.currentUser
  });

  // Gestionează deconectarea
  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({
        title: 'Deconectare reușită',
        description: 'V-ați deconectat cu succes.',
      });
      navigate('/admin/login');
    } catch (error) {
      console.error('Eroare la deconectare:', error);
      toast({
        variant: 'destructive',
        title: 'Eroare la deconectare',
        description: 'A apărut o eroare la deconectare. Vă rugăm să încercați din nou.',
      });
    }
  };

  // Statistici pentru pagina de prezentare
  const statistics = {
    totalClients: clients?.length || 0,
    totalServiceProviders: serviceProviders?.length || 0,
    totalRequests: requests?.length || 0,
    totalReviews: reviews?.length || 0,
    activeRequests: requests?.filter(r => r.status === 'Active').length || 0,
    reportedReviews: reviews?.filter(r => r.reported).length || 0
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
                {isLoadingClients ? (
                  <p>Se încarcă...</p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients?.map(client => (
                        <TableRow key={client.id}>
                          <TableCell>{client.id}</TableCell>
                          <TableCell>{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.phone}</TableCell>
                          <TableCell>{client.county}</TableCell>
                          <TableCell>{client.city}</TableCell>
                          <TableCell>{client.verified ? 'Da' : 'Nu'}</TableCell>
                          <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
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
                {isLoadingServiceProviders ? (
                  <p>Se încarcă...</p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceProviders?.map(provider => (
                        <TableRow key={provider.id}>
                          <TableCell>{provider.id}</TableCell>
                          <TableCell>{provider.companyName}</TableCell>
                          <TableCell>{provider.representativeName}</TableCell>
                          <TableCell>{provider.email}</TableCell>
                          <TableCell>{provider.phone}</TableCell>
                          <TableCell>{provider.county}</TableCell>
                          <TableCell>{provider.city}</TableCell>
                          <TableCell>{provider.verified ? 'Da' : 'Nu'}</TableCell>
                          <TableCell>{new Date(provider.createdAt).toLocaleDateString()}</TableCell>
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
                {isLoadingRequests ? (
                  <p>Se încarcă...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Titlu</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Creării</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests?.map(request => (
                        <TableRow key={request.id}>
                          <TableCell>{request.id}</TableCell>
                          <TableCell>{request.clientName}</TableCell>
                          <TableCell>{request.title}</TableCell>
                          <TableCell>{request.status}</TableCell>
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
                {isLoadingReviews ? (
                  <p>Se încarcă...</p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews?.map(review => (
                        <TableRow key={review.id} className={review.reported ? 'bg-red-50' : ''}>
                          <TableCell>{review.id}</TableCell>
                          <TableCell>{review.serviceProviderName}</TableCell>
                          <TableCell>{review.clientName}</TableCell>
                          <TableCell>{review.rating}</TableCell>
                          <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
                          <TableCell>{review.reported ? 'Da' : 'Nu'}</TableCell>
                          <TableCell>{review.reportReason || '-'}</TableCell>
                          <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;