import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { useQuery, QueryClient } from "@tanstack/react-query"; // Added QueryClient import
import { Loader2, Mail, Menu, ExternalLink } from "lucide-react";
import type { User as UserType, ServiceProviderUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TabWrapper } from "@/components/common/TabWrapper";
import { useAuth } from "@/context/AuthContext";
import RequestsTab from "@/components/service-dashboard/RequestsTab";
import SentOffersTab from "@/components/service-dashboard/SentOffersTab";
import AcceptedOffersTab from "@/components/service-dashboard/AcceptedOffersTab";
import MessagesTab from "@/components/service-dashboard/MessagesTab";
import AccountTab from "@/components/service-dashboard/AccountTab";
import { useServiceOfferManagement } from "@/hooks/useServiceOfferManagement";
import NotificationHelper from "@/lib/notifications";
import { useWebSocket } from '@/hooks/useWebSocket'; // Added WebSocket hook import


type TabId = "cereri" | "oferte-trimise" | "oferte-acceptate" | "mesaje" | "cont";

const TAB_NAMES: Record<TabId, string> = {
  "cereri": "Cereri",
  "oferte-trimise": "Oferte Trimise",
  "oferte-acceptate": "Oferte Acceptate",
  "mesaje": "Mesaje",
  "cont": "Cont",
};

export interface ConversationInfo {
  userId: number;
  userName: string;
  requestId: number;
  offerId?: number;
  sourceTab?: 'request' | 'sent-offer' | 'accepted-offer';
}

export default function ServiceDashboard() {
  const [, setLocation] = useLocation();
  const { user, resendVerificationEmail } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("cereri");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState<ConversationInfo | null>(null);
  const [newRequestsCount, setNewRequestsCount] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = new QueryClient(); // Initialize QueryClient

  // Use the service offer management hook to get the new accepted offers count
  const { newAcceptedOffersCount } = useServiceOfferManagement();

  // Query pentru conversații noi
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/service/conversations'],
    queryFn: () => fetch('/api/service/conversations').then(res => res.json()),
    refetchInterval: 10000, // Reîmprospătare la fiecare 10 secunde
  });

  // Calculăm numărul de conversații cu mesaje noi
  const newConversationsCount = conversations.filter(conv => conv.hasNewMessages).length;

  const unreadConversationsCount = conversations.filter(conv => conv.unreadCount > 0).length;

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => fetch('/api/auth/me').then(res => res.json()),
    retry: 1,
    refetchOnWindowFocus: false,
  });


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setLocation("/");
      } else if (user && !window.startBackgroundMessageCheck) {
        console.error("Service Worker nu este disponibil pentru verificarea mesajelor în fundal");
      } else if (user && user.id && window.startBackgroundMessageCheck) {
        // Inițiem verificarea periodică a mesajelor în fundal pentru a primi notificări
        // chiar și când tab-ul browser-ului este inactiv
        firebaseUser.getIdToken().then(token => {
          if (NotificationHelper.isSupported() && NotificationHelper.checkPermission() === 'granted') {
            try {
              console.log("Inițierea verificării mesajelor în fundal pentru utilizatorul", user.id);

              // Pornim verificarea pe fundal folosind Service Worker
              NotificationHelper.startBackgroundMessageCheck(user.id, 'service', token);

              // Doar logăm în consolă că notificările sunt active, fără toast
              console.log("Notificări active - vei primi notificări de mesaje noi chiar și când tab-ul este inactiv.");
            } catch (error) {
              console.error("Eroare la inițierea verificării mesajelor în fundal:", error);
            }
          } else if (NotificationHelper.checkPermission() !== 'granted') {
            console.log("Permisiunile pentru notificări nu sunt acordate");
            // Afișăm un toast care informează utilizatorul
            toast({
              title: "Notificări dezactivate",
              description: "Permite notificările pentru a primi alerte de mesaje noi.",
              variant: "default",
            });
          }
        });
      }
    });

    // Curățăm verificarea în fundal când componenta este demontată
    return () => {
      unsubscribe();
      // Verificăm dacă metoda există înainte de a o apela
      if (typeof NotificationHelper.stopBackgroundMessageCheck === 'function') {
        NotificationHelper.stopBackgroundMessageCheck();
      }
    };
  }, [setLocation, user, toast]);

  // Query to fetch viewed requests
  const { data: viewedRequestIds = [] } = useQuery({
    queryKey: ['/api/service/viewed-requests'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/viewed-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch viewed requests');
      }

      const viewedRequests = await response.json();
      return viewedRequests.map((vr: any) => vr.requestId);
    }
  });

  // Query to fetch all active requests
  const { data: requests = [] } = useQuery({
    queryKey: ['/api/service/requests'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/service/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      return response.json();
    },
    staleTime: 0
  });

  // Calculate new requests count
  useEffect(() => {
    if (requests.length && viewedRequestIds.length) {
      const activeRequests = requests.filter((req: any) => req.status === "Active");
      const newCount = activeRequests.filter((req: any) => !viewedRequestIds.includes(req.id)).length;
      setNewRequestsCount(newCount);
    }
  }, [requests, viewedRequestIds]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const handleMessageClick = (conversationInfo: ConversationInfo) => {
    setActiveConversation(conversationInfo);
    handleTabChange("mesaje");
  };

  const handleTabError = () => {
    toast({
      variant: "destructive",
      title: "Eroare",
      description: "A apărut o eroare la încărcarea tab-ului. Încercați din nou.",
    });
  };

  const handleProfileClick = async () => {
    // Get user profile data
    if (userProfile) {
      try {
        // Navigate to service profile page using username
        setLocation(`/service/${userProfile.username}`);
        console.log('Navigating to service profile with username:', userProfile.username);
      } catch (error) {
        console.error('Navigation error:', error);
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu s-au putut încărca datele profilului.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca datele profilului.",
      });
    }
  };

  const { websocketService, addMessageHandler, removeMessageHandler } = useWebSocket('/api/websocket'); // Added WebSocket hook usage

  useEffect(() => {
    const handleWebSocketMessage = (data: any) => {
      // Actualizăm datele din cache
      if (data.type === 'NEW_REQUEST') {
        queryClient.invalidateQueries({ queryKey: ["/api/service/requests"] });

        // Afișăm notificare pentru cerere nouă direct
        if (Notification.permission === 'granted') {
          const notificationOptions = {
            body: `Ai primit o cerere nouă: ${data.payload?.title || 'Detalii în aplicație'}`,
            icon: '/favicon.ico',
            tag: `request-${Date.now()}`,
            requireInteraction: true
          };

          try {
            new Notification('Cerere nouă', notificationOptions);
          } catch (error) {
            console.error('Eroare la afișarea notificării pentru cerere nouă:', error);
          }
        }
      } else if (data.type === 'OFFER_STATUS_CHANGED' && data.payload?.status === 'Accepted') {
        queryClient.invalidateQueries({ queryKey: ["/api/service/sent-offers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/service/accepted-offers"] });

        // Afișăm notificare pentru ofertă acceptată
        if (Notification.permission === 'granted') {
          const notificationOptions = {
            body: `Oferta ta a fost acceptată: ${data.payload?.title || 'Detalii în aplicație'}`,
            icon: '/favicon.ico',
            tag: `offer-accepted-${Date.now()}`,
            requireInteraction: true
          };

          try {
            new Notification('Ofertă acceptată', notificationOptions);
          } catch (error) {
            console.error('Eroare la afișarea notificării pentru ofertă acceptată:', error);
          }
        }
      } else if (data.type === 'NEW_MESSAGE') {
        queryClient.invalidateQueries({ queryKey: ["/api/service/messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/service/conversations"] });
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
      } else if (data.type === 'NEW_REVIEW') {
        queryClient.invalidateQueries({ queryKey: ["/api/service/reviews"] });

        // Afișăm notificare pentru recenzie nouă
        if (Notification.permission === 'granted') {
          const notificationOptions = {
            body: `Ai primit o recenzie nouă: ${data.payload?.rating ? '★'.repeat(data.payload.rating) : 'Detalii în aplicație'}`,
            icon: '/favicon.ico',
            tag: `review-${Date.now()}`,
            requireInteraction: true
          };

          try {
            new Notification('Recenzie nouă', notificationOptions);
          } catch (error) {
            console.error('Eroare la afișarea notificării pentru recenzie nouă:', error);
          }
        }
      }
    };

    const removeHandler = addMessageHandler(handleWebSocketMessage);
    return () => {
      removeHandler();
    };
  }, [addMessageHandler, queryClient]);


  if (!user || isLoading) {
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
                <Button onClick={() => resendVerificationEmail()}>
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

  const navigationItems = Object.entries(TAB_NAMES).map(([id, label]) => ({
    id: id as TabId,
    label,
    count: id === "cereri" ? newRequestsCount :
           id === "oferte-acceptate" ? newAcceptedOffersCount :
           id === "mesaje" ? unreadConversationsCount :
           0
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-[#00aff5]">Service</h1>
              {userProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex items-center gap-2 text-[#00aff5]"
                  onClick={handleProfileClick}
                >
                  <ExternalLink className="h-4 w-4" />
                  Vezi Profil public
                </Button>
              )}
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => handleTabChange(item.id)}
                  className={`relative ${activeTab === item.id ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""}`}
                >
                  {item.label}
                  {item.count > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-[#00aff5] text-white rounded-full">
                      {item.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            <div className="md:hidden">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80%] sm:w-[385px]">
                  <div className="flex flex-col gap-4 mt-6">
                    {userProfile && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left text-[#00aff5]"
                        onClick={handleProfileClick}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Vezi Profil public
                      </Button>
                    )}
                    {navigationItems.map((item) => (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "default" : "ghost"}
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full justify-start text-left relative ${
                          activeTab === item.id ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                        }`}
                      >
                        {item.label}
                        {item.count > 0 && (
                          <span className="absolute right-2 px-1.5 py-0.5 text-xs bg-[#00aff5] text-white rounded-full">
                            {item.count}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-4 sm:p-6 flex-grow">
        <TabWrapper name={TAB_NAMES[activeTab]} onError={handleTabError}>
          {(() => {
            switch (activeTab) {
              case "mesaje":
                return (
                  <MessagesTab
                    initialConversation={activeConversation}
                    onConversationClear={() => setActiveConversation(null)}
                  />
                );
              case "oferte-trimise":
                return <SentOffersTab onMessageClick={handleMessageClick} />;
              case "oferte-acceptate":
                return <AcceptedOffersTab onMessageClick={handleMessageClick} />;
              case "cereri":
                return <RequestsTab onMessageClick={handleMessageClick} />;
              case "cont":
                return <AccountTab />;
              default:
                return null;
            }
          })()}
        </TabWrapper>
      </div>

      <Footer />
    </div>
  );
}