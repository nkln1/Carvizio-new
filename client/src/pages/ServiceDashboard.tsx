import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Menu, ExternalLink } from "lucide-react";
import type { User as UserType, Conversation } from "@shared/schema";
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
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/service/conversations'],
    refetchInterval: 10000, // Reîmprospătare la fiecare 10 secunde
  });

  // Calculăm numărul de conversații cu mesaje noi
  const newConversationsCount = conversations.filter(conv => conv.hasNewMessages).length;

  const unreadConversationsCount = conversations.filter(conv => conv.unreadCount > 0).length;


  const { data: userProfile, isLoading } = useQuery<UserType>({
    queryKey: ['/api/auth/me'],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLocation("/");
      }
    });
    return () => unsubscribe();
  }, [setLocation]);

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
                  onClick={() => {
                    if (userProfile.companyName) {
                      const serviceSlug = userProfile.companyName
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                      window.location.href = `/service/${serviceSlug}`;
                    }
                  }}
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
                        onClick={() => {
                          if (userProfile.companyName) {
                            const serviceSlug = userProfile.companyName
                              .toLowerCase()
                              .trim()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-+|-+$/g, '');
                            window.location.href = `/service/${serviceSlug}`;
                          }
                          setIsMenuOpen(false);
                        }}
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