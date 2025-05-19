import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
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

  // Statistici pentru pagina de prezentare
  const statistics = {
    totalClients: mockClients.length,
    totalServiceProviders: mockServiceProviders.length,
    totalRequests: mockRequests.length,
    totalReviews: mockReviews.length,
    activeRequests: mockRequests.filter(r => r.status === 'Active').length,
    reportedReviews: mockReviews.filter(r => r.reported).length
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
                    {mockClients.map(client => (
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
                    {mockServiceProviders.map(provider => (
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
                    {mockRequests.map(request => (
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
                    {mockReviews.map(review => (
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;