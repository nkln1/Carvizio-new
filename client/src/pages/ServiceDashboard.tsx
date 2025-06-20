import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Menu, ExternalLink, FileText, MessageSquare, User, SendHorizontal, MailOpen } from "lucide-react";
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

  // Use the service offer management hook to get the new accepted offers count
  const { newAcceptedOffersCount } = useServiceOfferManagement();

  // Query pentru conversații noi
  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ['/api/service/conversations'],
    refetchInterval: 10000, // Reîmprospătare la fiecare 10 secunde
  });

  // Calculăm numărul de conversații cu mesaje noi
  const newConversationsCount = conversations.filter(conv => conv.hasNewMessages).length;

  const unreadConversationsCount = conversations.filter(conv => conv.unreadCount > 0).length;

  const { data: userProfile, isLoading } = useQuery<ServiceProviderUser>({
    queryKey: ['/api/auth/me'],
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
  const { data: viewedRequestIds = [] } = useQuery<number[]>({
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
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-base sm:text-xl font-semibold text-[#00aff5] truncate">Service Dashboard</h1>
              {userProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex items-center gap-2 text-[#00aff5] text-xs"
                  onClick={handleProfileClick}
                >
                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Vezi Profil public</span>
                  <span className="sm:hidden">Profil</span>
                </Button>
              )}
            </div>

            <div className="hidden md:flex items-center space-x-1 lg:space-x-3">
              <Button
                tab="cereri"
                variant={activeTab === "cereri" ? "default" : "ghost"}
                onClick={() => handleTabChange("cereri")}
                className={`relative py-1 h-auto min-h-9 px-2 lg:px-3 text-xs sm:text-sm flex items-center ${
                  activeTab === "cereri" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                }`}
              >
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                Cereri
                {newRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {newRequestsCount}
                  </span>
                )}
              </Button>
              <Button
                tab="oferte-trimise"
                variant={activeTab === "oferte-trimise" ? "default" : "ghost"}
                onClick={() => handleTabChange("oferte-trimise")}
                className={`relative py-1 h-auto min-h-9 px-2 lg:px-3 text-xs sm:text-sm flex items-center ${
                  activeTab === "oferte-trimise" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                }`}
              >
                <MailOpen className="w-4 h-4 mr-2 flex-shrink-0" />
                Oferte trimise
              </Button>
              <Button
                tab="oferte-acceptate"
                variant={activeTab === "oferte-acceptate" ? "default" : "ghost"}
                onClick={() => handleTabChange("oferte-acceptate")}
                className={`relative py-1 h-auto min-h-9 px-2 lg:px-3 text-xs sm:text-sm flex items-center ${
                  activeTab === "oferte-acceptate" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                }`}
              >
                <SendHorizontal className="w-4 h-4 mr-2 flex-shrink-0" />
                Oferte acceptate
                {newAcceptedOffersCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {newAcceptedOffersCount}
                  </span>
                )}
              </Button>
              <Button
                tab="mesaje"
                variant={activeTab === "mesaje" ? "default" : "ghost"}
                onClick={() => handleTabChange("mesaje")}
                className={`relative py-1 h-auto min-h-9 px-2 lg:px-3 text-xs sm:text-sm flex items-center ${
                  activeTab === "mesaje" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                Mesaje
                {unreadConversationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {unreadConversationsCount}
                  </span>
                )}
              </Button>
              <Button
                tab="cont"
                variant={activeTab === "cont" ? "default" : "ghost"}
                onClick={() => handleTabChange("cont")}
                className={`relative py-1 h-auto min-h-9 px-2 lg:px-3 text-xs sm:text-sm flex items-center ${
                  activeTab === "cont" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                }`}
              >
                <User className="w-4 h-4 mr-2 flex-shrink-0" />
                Cont
              </Button>
            </div>

            <div className="md:hidden">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Deschide meniul">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85%] sm:w-[385px]">
                  <div className="flex flex-col gap-3 mt-6">
                    {userProfile && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left text-[#00aff5] py-3"
                        onClick={handleProfileClick}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Vezi Profil public
                      </Button>
                    )}
                    <Button
                      variant={activeTab === "cereri" ? "default" : "ghost"}
                      onClick={() => handleTabChange("cereri")}
                      className={`w-full justify-start text-left relative py-3 ${
                        activeTab === "cereri" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                      }`}
                    >
                      <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                      Cereri
                      {newRequestsCount > 0 && (
                        <span className="absolute right-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center">
                          {newRequestsCount}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant={activeTab === "oferte-trimise" ? "default" : "ghost"}
                      onClick={() => handleTabChange("oferte-trimise")}
                      className={`w-full justify-start text-left relative py-3 ${
                        activeTab === "oferte-trimise" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                      }`}
                    >
                      <MailOpen className="w-4 h-4 mr-2 flex-shrink-0" />
                      Oferte trimise
                    </Button>
                    <Button
                      variant={activeTab === "oferte-acceptate" ? "default" : "ghost"}
                      onClick={() => handleTabChange("oferte-acceptate")}
                      className={`w-full justify-start text-left relative py-3 ${
                        activeTab === "oferte-acceptate" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                      }`}
                    >
                      <SendHorizontal className="w-4 h-4 mr-2 flex-shrink-0" />
                      Oferte acceptate
                      {newAcceptedOffersCount > 0 && (
                        <span className="absolute right-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center">
                          {newAcceptedOffersCount}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant={activeTab === "mesaje" ? "default" : "ghost"}
                      onClick={() => handleTabChange("mesaje")}
                      className={`w-full justify-start text-left relative py-3 ${
                        activeTab === "mesaje" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                      Mesaje
                      {unreadConversationsCount > 0 && (
                        <span className="absolute right-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center">
                          {unreadConversationsCount}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant={activeTab === "cont" ? "default" : "ghost"}
                      onClick={() => handleTabChange("cont")}
                      className={`w-full justify-start text-left relative py-3 ${
                        activeTab === "cont" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                      }`}
                    >
                      <User className="w-4 h-4 mr-2 flex-shrink-0" />
                      Cont
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-2 sm:p-4 md:p-6 flex-grow">
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