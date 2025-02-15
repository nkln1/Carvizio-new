import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { User as UserType, Car as CarType, Request as RequestType } from "@shared/schema";
import { EditProfile } from "@/components/auth/EditProfile";
import { CarForm } from "@/components/car/CarForm";
import { useToast } from "@/hooks/use-toast";
import { RequestForm } from "@/components/request/RequestForm";
import { Navigation } from "@/components/dashboard/Navigation";
import { RequestsTab } from "@/components/dashboard/RequestsTab";
import { OffersTab } from "@/components/dashboard/OffersTab";
import { CarsTab } from "@/components/dashboard/CarsTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface ServiceOffer {
  id: number;
  serviceId: string;
  serviceName: string;
  price: number;
  availability: string;
  description: string;
}

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [showCarDialog, setShowCarDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarType | undefined>();
  const { toast } = useToast();
  const [offers, setOffers] = useState<ServiceOffer[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLocation("/");
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  const { data: userProfile, isLoading } = useQuery<UserType>({
    queryKey: ['/api/auth/me'],
    retry: 1,
    refetchOnWindowFocus: false
  });

  const { data: userCars = [], isLoading: isLoadingCars } = useQuery<CarType[]>({
    queryKey: ['/api/cars'],
    enabled: !!userProfile,
  });

  const { data: userRequests = [], isLoading: isLoadingRequests } = useQuery<RequestType[]>({
    queryKey: ['/api/requests'],
    enabled: !!userProfile,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Handlers for car operations
  const handleCarSubmit = async (carData: Omit<CarType, "id" | "userId" | "createdAt">) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(carData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save car');
      }

      toast({
        title: "Success",
        description: "Car added successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/cars'] });
      setShowCarDialog(false);
    } catch (error) {
      console.error('Error saving car:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save car",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCar = async (carData: Omit<CarType, "id" | "userId" | "createdAt">) => {
    try {
      if (!selectedCar) return;

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/cars/${selectedCar.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(carData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update car');
      }

      toast({
        title: "Success",
        description: "Car updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/cars'] });
      setShowCarDialog(false);
      setSelectedCar(undefined);
    } catch (error) {
      console.error('Error updating car:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update car",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCar = async (carId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/cars/${carId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete car');
      }

      toast({
        title: "Success",
        description: "Car deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/cars'] });
    } catch (error) {
      console.error('Error deleting car:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete car",
        variant: "destructive",
      });
    }
  };

  // Request creation mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to create request');
      }

      const result = await response.text();
      if (!result) return null;

      try {
        return JSON.parse(result);
      } catch {
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      toast({
        title: "Success",
        description: "Cererea a fost trimisă cu succes!",
      });
      setShowRequestDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "A apărut o eroare la trimiterea cererii.",
        variant: "destructive",
      });
    }
  });

  const handleRequestSubmit = async (data: any) => {
    try {
      const requestData = {
        userId: userProfile?.id,
        carId: parseInt(data.carId),
        title: data.title,
        description: data.description,
        preferredDate: new Date(data.preferredDate).toISOString(),
        county: data.county,
        cities: data.cities,
      };

      await createRequestMutation.mutateAsync(requestData);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "A apărut o eroare la trimiterea cererii.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCreateRequest={() => setShowRequestDialog(true)}
      />

      <div className="container mx-auto p-6 flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
          </div>
        ) : (
          <>
            {activeTab === "requests" && (
              <RequestsTab
                requests={userRequests}
                isLoading={isLoadingRequests}
                onCreateRequest={() => setShowRequestDialog(true)}
              />
            )}

            {activeTab === "offers" && (
              <OffersTab offers={offers} />
            )}

            {activeTab === "messages" && (
              <Card>
                <CardHeader>
                  <CardTitle>Mesaje</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Nu există mesaje noi.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === "car" && (
              <CarsTab
                cars={userCars}
                isLoading={isLoadingCars}
                onAddCar={() => setShowCarDialog(true)}
                onEditCar={(car) => {
                  setSelectedCar(car);
                  setShowCarDialog(true);
                }}
                onDeleteCar={handleDeleteCar}
              />
            )}

            {activeTab === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle>Informații Cont</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {userProfile ? (
                      <>
                        {isEditing ? (
                          <EditProfile
                            user={userProfile}
                            onCancel={() => setIsEditing(false)}
                          />
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-500">Nume Complet</p>
                                <p className="mt-1 text-sm">{userProfile.name || 'Nu este specificat'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Email</p>
                                <p className="mt-1 text-sm">{userProfile.email}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Telefon</p>
                                <p className="mt-1 text-sm">{userProfile.phone || 'Nu este specificat'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Județ</p>
                                <p className="mt-1 text-sm">{userProfile.county || 'Nu este specificat'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Oraș</p>
                                <p className="mt-1 text-sm">{userProfile.city || 'Nu este specificat'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Tip Cont</p>
                                <p className="mt-1 text-sm capitalize">{userProfile.role || 'Nu este specificat'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Data Înregistrării</p>
                                <p className="mt-1 text-sm">
                                  {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('ro-RO') : 'Nu este specificat'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2">
                              <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => setIsEditing(true)}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Editează Profilul
                              </Button>
                              <Button variant="outline" className="w-full sm:w-auto text-red-600 hover:text-red-700">
                                Schimbă Parola
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">Se încarcă informațiile contului...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={showCarDialog} onOpenChange={(open) => {
        setShowCarDialog(open);
        if (!open) setSelectedCar(undefined);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCar ? "Editează mașina" : "Adaugă mașină nouă"}
            </DialogTitle>
          </DialogHeader>
          <CarForm
            onSubmit={selectedCar ? handleUpdateCar : handleCarSubmit}
            onCancel={() => {
              setShowCarDialog(false);
              setSelectedCar(undefined);
            }}
            initialData={selectedCar}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Creează o nouă cerere</DialogTitle>
            <DialogDescription>
              Completați formularul pentru a trimite o nouă cerere de service
            </DialogDescription>
          </DialogHeader>
          <RequestForm
            onSubmit={handleRequestSubmit}
            onCancel={() => setShowRequestDialog(false)}
            onAddCar={(data) => {
              setShowCarDialog(true);
              setShowRequestDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}