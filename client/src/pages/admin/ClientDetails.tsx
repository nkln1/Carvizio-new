import React, { useState } from 'react';
import { useLocation } from 'wouter';
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
import { ArrowLeft, Star } from 'lucide-react';

interface ClientDetailsProps {
  params: {
    id: string;
  };
}

export default function ClientDetails({ params }: ClientDetailsProps) {
  const [location, setLocation] = useLocation();
  const { isAdmin } = useAdminAuth();

  const clientQuery = useQuery({
    queryKey: ['/api/admin/clients', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/clients/${params.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Eroare la încărcarea detaliilor clientului');
      }
      return response.json();
    },
    enabled: !!params.id && isAdmin
  });

  if (!isAdmin) {
    return <div>Acces interzis</div>;
  }

  if (clientQuery.isLoading) {
    return <div>Se încarcă...</div>;
  }

  if (clientQuery.isError) {
    return <div>Eroare la încărcarea datelor</div>;
  }

  const { client, requests, reviews } = clientQuery.data;

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
        <h1 className="text-3xl font-bold">Detalii Client</h1>
      </div>

      <div className="grid gap-6">
        {/* Informații client */}
        <Card>
          <CardHeader>
            <CardTitle>Informații personale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nume complet</p>
                <p className="font-medium">{client.firstName} {client.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{client.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefon</p>
                <p className="font-medium">{client.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locație</p>
                <p className="font-medium">{client.city}, {client.county}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status verificare</p>
                <Badge variant={client.verified ? 'default' : 'secondary'}>
                  {client.verified ? 'Verificat' : 'Neverificat'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data înregistrării</p>
                <p className="font-medium">{new Date(client.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cererile clientului */}
        <Card>
          <CardHeader>
            <CardTitle>Cereri create ({requests.length})</CardTitle>
            <CardDescription>Toate cererile adăugate de acest client</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Titlu</TableHead>
                    <TableHead>Descriere</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data creării</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.id}</TableCell>
                      <TableCell className="font-medium">{request.title}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                      <TableCell>
                        <Badge variant={request.status === 'Open' ? 'default' : 'secondary'}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Acest client nu a creat încă nicio cerere.</p>
            )}
          </CardContent>
        </Card>

        {/* Recenziile clientului */}
        <Card>
          <CardHeader>
            <CardTitle>Recenzii lăsate ({reviews.length})</CardTitle>
            <CardDescription>Toate recenziile scrise de acest client</CardDescription>
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Furnizor</TableHead>
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
                        Furnizor ID: {review.serviceProviderId}
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
              <p className="text-muted-foreground">Acest client nu a lăsat încă nicio recenzie.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}