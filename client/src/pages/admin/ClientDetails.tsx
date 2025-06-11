import React, { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAdminAuth } from '@/context/AdminAuthContext';
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
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Car, MessageSquare, Star, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClientDetailsProps {
  params: { id: string };
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ params }) => {
  const [location, setLocation] = useLocation();
  const { isAdmin } = useAdminAuth();
  const clientId = params.id;

  // Fetch client data
  const clientQuery = useQuery({
    queryKey: ['/api/admin/clients', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch client');
      return response.json();
    },
    enabled: !!clientId && isAdmin
  });

  // Fetch client requests
  const requestsQuery = useQuery({
    queryKey: ['/api/admin/clients', clientId, 'requests'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/clients/${clientId}/requests`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch requests');
      return response.json();
    },
    enabled: !!clientId && isAdmin
  });

  // Fetch client reviews
  const reviewsQuery = useQuery({
    queryKey: ['/api/admin/clients', clientId, 'reviews'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/clients/${clientId}/reviews`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    enabled: !!clientId && isAdmin
  });

  // Fetch client cars
  const carsQuery = useQuery({
    queryKey: ['/api/admin/clients', clientId, 'cars'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/clients/${clientId}/cars`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch cars');
      return response.json();
    },
    enabled: !!clientId && isAdmin
  });

  if (!isAdmin) {
    setLocation('/admin/login');
    return null;
  }

  if (clientQuery.isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Se încarcă detaliile clientului...</p>
          </div>
        </div>
      </div>
    );
  }

  if (clientQuery.error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-red-600">Eroare la încărcarea datelor clientului</p>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/admin/dashboard')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi la Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const client = clientQuery.data;
  const requests = requestsQuery.data || [];
  const reviews = reviewsQuery.data || [];
  const cars = carsQuery.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary">În așteptare</Badge>;
      case 'Accepted':
        return <Badge variant="default">Acceptat</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Respins</Badge>;
      case 'Completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Finalizat</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/admin/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalii Client</h1>
            <p className="text-gray-600">Informații complete despre client și activitatea sa</p>
          </div>
        </div>
      </div>

      {/* Client Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informații personale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Nume complet</label>
              <p className="text-lg font-semibold">{client.firstName} {client.lastName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg">{client.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Telefon</label>
              <p className="text-lg">{client.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Locație</label>
              <p className="text-lg">{client.city}, {client.county}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data înregistrării</label>
              <p className="text-lg">{new Date(client.createdAt).toLocaleDateString('ro-RO')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                {client.verified ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Verificat</Badge>
                ) : (
                  <Badge variant="destructive">Neverificat</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Cereri ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Recenzii ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="cars" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Mașini ({cars.length})
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Istoric cereri</CardTitle>
              <CardDescription>Toate cererile făcute de acest client</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Clientul nu a făcut încă nicio cerere</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tip serviciu</TableHead>
                      <TableHead>Descriere</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data creării</TableHead>
                      <TableHead>Oferte primite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">#{request.id}</TableCell>
                        <TableCell>{request.serviceType}</TableCell>
                        <TableCell className="max-w-xs truncate">{request.details}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString('ro-RO')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.offersCount || 0} oferte</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Recenzii date</CardTitle>
              <CardDescription>Recenziile lăsate de acest client pentru serviciile primite</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Clientul nu a lăsat încă nicio recenzie</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">Serviciu de la {review.serviceProviderName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">{renderStars(review.rating)}</div>
                            <span className="text-sm text-gray-600">({review.rating}/5)</span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString('ro-RO')}
                        </span>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cars Tab */}
        <TabsContent value="cars">
          <Card>
            <CardHeader>
              <CardTitle>Mașini înregistrate</CardTitle>
              <CardDescription>Vehiculele înregistrate de acest client</CardDescription>
            </CardHeader>
            <CardContent>
              {cars.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Clientul nu a înregistrat încă nicio mașină</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cars.map((car: any) => (
                    <div key={car.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold">{car.make} {car.model}</h4>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Anul: {car.year}</p>
                        <p>Numărul de înmatriculare: {car.licensePlate}</p>
                        <p>Culoare: {car.color}</p>
                        {car.vin && <p>VIN: {car.vin}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetails;