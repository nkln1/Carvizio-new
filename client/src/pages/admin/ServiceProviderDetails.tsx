import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { fetchWithCsrf } from '@/lib/csrfToken';
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
import { ArrowLeft, Star } from 'lucide-react';

interface ServiceProviderDetailsProps {
  params: {
    id: string;
  };
}

export default function ServiceProviderDetails({ params }: ServiceProviderDetailsProps) {
  const [location, setLocation] = useLocation();
  const { isAdmin } = useAdminAuth();

  const providerQuery = useQuery({
    queryKey: ['/api/admin/service-providers', params.id],
    queryFn: async () => {
      const response = await fetchWithCsrf(`/api/admin/service-providers/${params.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Eroare la încărcarea detaliilor furnizorului');
      }
      return response.json();
    },
    enabled: !!params.id && isAdmin
  });

  if (!isAdmin) {
    setLocation('/admin/login');
    return null;
  }

  if (providerQuery.isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Se încarcă detaliile furnizorului...</p>
          </div>
        </div>
      </div>
    );
  }

  if (providerQuery.isError) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-red-600">Eroare la încărcarea datelor furnizorului</p>
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

  const { provider, reviews, offers } = providerQuery.data;

  // Calculate average rating
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 'N/A';

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => setLocation('/admin/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la dashboard
        </Button>
        <h1 className="text-3xl font-bold">Detalii Furnizor de Servicii</h1>
      </div>

      <div className="grid gap-6">
        {/* Informații furnizor */}
        <Card>
          <CardHeader>
            <CardTitle>Informații companie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nume companie</p>
                <p className="font-medium">{provider.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reprezentant</p>
                <p className="font-medium">{provider.representativeName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{provider.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefon</p>
                <p className="font-medium">{provider.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locație</p>
                <p className="font-medium">{provider.city}, {provider.county}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status verificare</p>
                <Badge variant={provider.verified ? 'default' : 'secondary'}>
                  {provider.verified ? 'Verificat' : 'Neverificat'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data înregistrării</p>
                <p className="font-medium">{new Date(provider.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating mediu</p>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{avgRating}</span>
                  <span className="text-sm text-muted-foreground">({reviews.length} recenzii)</span>
                </div>
              </div>
              {provider.username && (
                <div>
                  <p className="text-sm text-muted-foreground">Pagina publică</p>
                  <a 
                    href={`/service/${provider.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Vezi profilul public →
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recenziile primite */}
        <Card>
          <CardHeader>
            <CardTitle>Recenzii primite ({reviews.length})</CardTitle>
            <CardDescription>Toate recenziile primite de la clienți</CardDescription>
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Conținut</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review: any) => (
                    <TableRow key={review.id}>
                      <TableCell>{review.id}</TableCell>
                      <TableCell className="font-medium">
                        Client ID: {review.clientId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{review.rating}/5</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{review.content}</TableCell>
                      <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Acest furnizor nu a primit încă nicio recenzie.</p>
            )}
          </CardContent>
        </Card>

        {/* Ofertele trimise */}
        <Card>
          <CardHeader>
            <CardTitle>Oferte trimise ({offers.length})</CardTitle>
            <CardDescription>Toate ofertele trimise către clienți</CardDescription>
          </CardHeader>
          <CardContent>
            {offers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Titlu</TableHead>
                    <TableHead>Cerere ID</TableHead>
                    <TableHead>Preț</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data creării</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer: any) => (
                    <TableRow key={offer.id}>
                      <TableCell>{offer.id}</TableCell>
                      <TableCell className="font-medium">{offer.title}</TableCell>
                      <TableCell>{offer.requestId}</TableCell>
                      <TableCell className="font-medium">{offer.price} RON</TableCell>
                      <TableCell>
                        <Badge variant={
                          offer.status === 'Accepted' ? 'default' : 
                          offer.status === 'Pending' ? 'secondary' : 
                          'destructive'
                        }>
                          {offer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(offer.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Acest furnizor nu a trimis încă nicio ofertă.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}