import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Mail } from "lucide-react";
import type { User as UserType, Car as CarType, Request as RequestType } from "@shared/schema";
import { ClientProfileTab } from "@/components/dashboard/ClientProfileTab";
import { CarForm } from "@/components/car/CarForm";
import { useToast } from "@/hooks/use-toast";
import { RequestForm } from "@/components/request/RequestForm";
import { Navigation } from "@/components/dashboard/Navigation";
import { RequestsTab } from "@/components/dashboard/RequestsTab";
import { OffersTab } from "@/components/dashboard/OffersTab";
import { CarsTab } from "@/components/dashboard/CarsTab";
import { MessagesTab } from "@/components/dashboard/MessagesTab";
import { useAuth } from "@/context/AuthContext";

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { user, resendVerificationEmail } = useAuth();
  const [activeTab, setActiveTab] = useState("requests");
  const [showCarDialog, setShowCarDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarType | undefined>();
  const [pendingRequestData, setPendingRequestData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLocation("/");
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  const { data: userProfile, isLoading: profileLoading } = useQuery<UserType>({
    queryKey: ['/api/client/profile'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/client/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Client profile fetch error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch client profile');
      }

      const data = await response.json();
      return data;
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  const { data: userCars = [], isLoading: carsLoading } = useQuery<CarType[]>({
    queryKey: ['/api/cars'],
    enabled: !!userProfile,
  });

  const { data: userRequests = [], isLoading: requestsLoading } = useQuery<RequestType[]>({
    queryKey: ['/api/requests'],
    enabled: !!userProfile,
  });

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

      const newCar = await response.json();

      toast({
        title: "Success",
        description: "Car added successfully",
      });

      // Update the pendingRequestData with the new car ID
      if (pendingRequestData) {
        setPendingRequestData({
          ...pendingRequestData,
          carId: newCar.id.toString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/cars'] });
      setShowCarDialog(false);

      // Always reopen the request dialog with the preserved data
      if (pendingRequestData) {
        setShowRequestDialog(true);
      }
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create request');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      toast({
        title: "Success",
        description: "Cererea a fost trimisă cu succes!",
      });
      setShowRequestDialog(false);
      setPendingRequestData(null);
    },
    onError: (error) => {
      console.error('Error creating request:', error);
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
        carId: parseInt(data.carId),
        title: data.title,
        description: data.description,
        preferredDate: new Date(data.preferredDate).toISOString(),
        county: data.county,
        cities: data.cities
      };

      console.log('Submitting request with data:', requestData);
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

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      toast({
        title: "Email trimis",
        description: "Un nou email de verificare a fost trimis. Te rugăm să verifici căsuța de email.",
      });
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la trimiterea emailului de verificare.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="container mx-auto p-6 flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-6 w-6" />
                Verifică-ți adresa de email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Pentru a accesa dashboard-ul, te rugăm să îți verifici adresa de email.
                {user.email && ` Am trimis un link de verificare la adresa ${user.email}.`}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleResendVerification}>
                  Retrimite emailul de verificare
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Am verificat emailul
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const isLoading = profileLoading || carsLoading || requestsLoading;

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
          <div className="space-y-6">
            {activeTab === "requests" && userRequests && (
              <RequestsTab
                requests={userRequests}
                isLoading={requestsLoading}
                onCreateRequest={() => setShowRequestDialog(true)}
              />
            )}

            {activeTab === "car" && userCars && (
              <CarsTab
                cars={userCars}
                isLoading={carsLoading}
                onAddCar={() => setShowCarDialog(true)}
                onEditCar={(car) => {
                  setSelectedCar(car);
                  setShowCarDialog(true);
                }}
                onDeleteCar={handleDeleteCar}
              />
            )}

            {activeTab === "profile" && userProfile && (
              <ClientProfileTab userProfile={userProfile} />
            )}
            {activeTab === "messages" && <MessagesTab />} {/* Added this line */}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}