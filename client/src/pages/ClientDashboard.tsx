import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Mail } from "lucide-react";
import type { User as UserType, Request as RequestType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NavigationItems } from "@/components/dashboard/NavigationItems";
import { RequestForm } from "@/components/request/RequestForm";
import { RequestsTab } from "@/components/dashboard/RequestsTab";
import { OffersTab } from "@/components/dashboard/OffersTab";
import { CarsTab } from "@/components/dashboard/CarsTab";
import { MessagesTab, InitialConversationProps } from "@/components/dashboard/MessagesTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import websocketService from "@/lib/websocket";
import { useAuth } from "@/context/AuthContext";
import { useCarManagement } from "@/hooks/useCarManagement";
import { useOfferManagement } from "@/hooks/useOfferManagement";
import { CarDialog } from "@/components/car/CarDialog";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { user, resendVerificationEmail } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showCarDialog, setShowCarDialog] = useState(false);
  const [pendingRequestData, setPendingRequestData] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [initialConversation, setInitialConversation] = useState<InitialConversationProps | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get unread messages count
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();

  const {
    selectedCar,
    setSelectedCar,
    handleCarSubmit,
    handleUpdateCar,
    handleDeleteCar,
  } = useCarManagement();

  const {
    offers,
    viewedOffers,
    markOfferAsViewed,
    newOffersCount
  } = useOfferManagement();

  const { data: userProfile, isLoading } = useQuery<UserType>({
    queryKey: ['/api/auth/me'],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: userCars = [], isLoading: isLoadingCars } = useQuery({
    queryKey: ['/api/cars'],
    enabled: !!userProfile,
  });

  const { data: userRequests = [], isLoading: isLoadingRequests } = useQuery<RequestType[]>({
    queryKey: ['/api/requests'],
    enabled: !!userProfile,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLocation("/");
      }
    });
    return () => {
      unsubscribe();
    };
  }, [setLocation]);

  useEffect(() => {
    const handleWebSocketMessage = (data: any) => {
      // Actualizăm datele din cache
      if (data.type === 'NEW_OFFER') {
        queryClient.invalidateQueries({ queryKey: ["/api/client/offers"] });

        // Afișăm notificare pentru ofertă nouă direct
        if (Notification.permission === 'granted') {
          const notificationOptions = {
            body: `Ai primit o ofertă nouă: ${data.payload?.title || 'Detalii în aplicație'}`,
            icon: '/favicon.ico',
            tag: `offer-${Date.now()}`,
            requireInteraction: true
          };

          try {
            new Notification('Ofertă nouă', notificationOptions);
          } catch (error) {
            console.error('Eroare la afișarea notificării pentru ofertă nouă:', error);
          }
        }
      } else if (data.type === 'REQUEST_STATUS_CHANGED' || data.type === 'OFFER_STATUS_CHANGED') {
        queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/client/offers"] });

        // Afișăm notificare pentru schimbare status
        if (Notification.permission === 'granted' && data.type === 'OFFER_STATUS_CHANGED' && data.payload?.status === 'Accepted') {
          const notificationOptions = {
            body: `Statusul ofertei s-a schimbat: ${data.payload?.status || 'Actualizat'}`,
            icon: '/favicon.ico',
            tag: `status-${Date.now()}`,
            requireInteraction: true
          };

          try {
            new Notification('Status actualizat', notificationOptions);
          } catch (error) {
            console.error('Eroare la afișarea notificării pentru schimbare status:', error);
          }
        }
      } else if (data.type === 'NEW_MESSAGE') {
        queryClient.invalidateQueries({ queryKey: ["/api/client/messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/client/conversations"] });
        // Also invalidate unread messages count
        queryClient.invalidateQueries({ queryKey: ["unreadConversationsCount"] });

        // Afișăm notificare pentru mesaj nou direct
        if (Notification.permission === 'granted') {
          const notificationOptions = {
            body: `Ai primit un mesaj nou: ${data.payload?.content || 'Deschide pentru a citi'}`,
            icon: '/favicon.ico',
            tag: `message-${Date.now()}`,
            requireInteraction: true
          };

          try {
            new Notification('Mesaj nou', notificationOptions);
          } catch (error) {
            console.error('Eroare la afișarea notificării pentru mesaj nou:', error);
          }
        }
      }
    };

    const removeHandler = websocketService.addMessageHandler(handleWebSocketMessage);
    return () => {
      removeHandler();
    };
  }, [queryClient]);

  useEffect(() => {
    if (activeTab === "offers") {
      queryClient.invalidateQueries({ queryKey: ["/api/client/viewed-offers"] });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "messages") {
      setInitialConversation(null);
    }
  }, [activeTab]);

  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Importam funcția pentru obținerea tokenului CSRF
      const { getCsrfToken } = await import("@/lib/csrfToken");
      const csrfToken = await getCsrfToken();

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(requestData),
        credentials: "include", // Pentru a include cookie-urile în cerere
      });

      if (!response.ok) {
        console.error("Request failed with status:", response.status);
        const errorBody = await response.text();
        console.error("Error body:", errorBody);
        throw new Error("Failed to create request");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Success",
        description: "Cererea a fost trimisă cu succes!",
      });
      setShowRequestDialog(false);
      setPendingRequestData(null);
    },
    onError: (error) => {
      console.error("Error creating request:", error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "A apărut o eroare la trimiterea cererii.",
        variant: "destructive",
      });
    },
  });

  const handleRequestSubmit = async (data: any) => {
    try {
      const requestData = {
        carId: parseInt(data.carId),
        title: data.title,
        description: data.description,
        preferredDate: new Date(data.preferredDate).toISOString(),
        county: data.county,
        cities: data.cities,
      };

      await createRequestMutation.mutateAsync(requestData);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "A apărut o eroare la trimiterea cererii.",
        variant: "destructive",
      });
    }
  };

  const handleInitMessage = (userId: number, userName: string, requestId: number, offerId?: number) => {
    setInitialConversation({
      userId,
      userName,
      requestId,
      offerId
    });
    setActiveTab("messages");
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
        <div className="container mx-auto p-4 sm:p-6 flex-grow flex items-center justify-center">
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
                <Button onClick={resendVerificationEmail}>
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavigationItems
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        onCreateRequest={() => setShowRequestDialog(true)}
        newOffersCount={newOffersCount > 0 ? newOffersCount : 0}
        unreadMessagesCount={unreadMessagesCount > 0 ? unreadMessagesCount : 0}
      />

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="w-[85%] sm:w-[385px]">
          <div className="mb-4 pt-2">
            <DialogTitle className="text-lg text-[#00aff5]">Meniu Client</DialogTitle>
            <DialogDescription className="text-xs opacity-70">
              Accesează funcțiile principale
            </DialogDescription>
          </div>
          <NavigationItems
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            onCreateRequest={() => setShowRequestDialog(true)}
            newOffersCount={newOffersCount > 0 ? newOffersCount : 0}
            unreadMessagesCount={unreadMessagesCount > 0 ? unreadMessagesCount : 0}
            isMobile={true}
          />
        </SheetContent>
      </Sheet>

      <div className="container mx-auto p-2 sm:p-4 md:p-6 flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center p-4 sm:p-8">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-[#00aff5]" />
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
              <OffersTab
                offers={offers}
                onMessageClick={handleInitMessage}
                refreshRequests={async () => {
                  await queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
                }}
                viewedOffers={new Set(viewedOffers.map(vo => vo.offerId))}
                markOfferAsViewed={markOfferAsViewed}
              />
            )}

            {activeTab === "messages" && (
              <MessagesTab 
                initialConversation={initialConversation}
                onConversationClear={() => setInitialConversation(null)}
              />
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

            {activeTab === "profile" && userProfile && (
              <ProfileTab userProfile={userProfile} />
            )}
          </>
        )}
      </div>

      <CarDialog
        open={showCarDialog}
        onOpenChange={setShowCarDialog}
        selectedCar={selectedCar}
        onSubmit={async (data) => {
          try {
            if (selectedCar) {
              await handleUpdateCar(data);
              // Închide automat dialogul după actualizare reușită
              setShowCarDialog(false);
              setSelectedCar(undefined);
            } else {
              await handleCarSubmit(data);
              // Închide automat dialogul după adăugarea unei mașini noi
              setShowCarDialog(false);
              
              // Verifică dacă există date pentru cererea în așteptare și deschide dialogul de cerere
              if (pendingRequestData) {
                setTimeout(() => {
                  setShowRequestDialog(true);
                }, 100);
              }
            }
          } catch (error) {
            console.error("Error handling car form submit:", error);
            // În caz de eroare, dialogul rămâne deschis
          }
        }}
        onCancel={() => {
          setShowCarDialog(false);
          setSelectedCar(undefined);
          if (pendingRequestData) {
            setTimeout(() => {
              setShowRequestDialog(true);
            }, 100);
          }
        }}
        pendingRequestData={pendingRequestData}
      />

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="mb-2 sm:mb-4">
            <DialogTitle className="text-lg sm:text-xl text-[#00aff5]">Creează o nouă cerere</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm opacity-80">
              Completați formularul pentru a trimite o nouă cerere de service
            </DialogDescription>
          </DialogHeader>
          <RequestForm
            onSubmit={handleRequestSubmit}
            onCancel={() => {
              setShowRequestDialog(false);
              setPendingRequestData(null);
            }}
            onAddCar={(data) => {
              setPendingRequestData({
                title: data.title,
                description: data.description,
                preferredDate: data.preferredDate,
                county: data.county,
                cities: data.cities,
                carId: data.carId,
              });
              setShowRequestDialog(false);
              setShowCarDialog(true);
            }}
            initialData={pendingRequestData}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}