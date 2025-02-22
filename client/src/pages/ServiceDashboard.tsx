import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import type { User as UserType } from "@shared/schema";
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

type TabId = "cereri" | "oferte-trimise" | "oferte-acceptate" | "mesaje" | "cont";

const TAB_NAMES: Record<TabId, string> = {
  "cereri": "Cereri",
  "oferte-trimise": "Oferte Trimise",
  "oferte-acceptate": "Oferte Acceptate",
  "mesaje": "Mesaje",
  "cont": "Cont",
};

export default function ServiceDashboard() {
  const [, setLocation] = useLocation();
  const { user, resendVerificationEmail } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("cereri");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState<{ userId: number; userName: string } | null>(null);
  const { toast } = useToast();

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

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const handleMessageClick = (userId: number, userName: string) => {
    setActiveConversation({ userId, userName });
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
    label
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-[#00aff5]">Service</h1>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => handleTabChange(item.id)}
                  className={activeTab === item.id ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""}
                >
                  {item.label}
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
                    {navigationItems.map((item) => (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "default" : "ghost"}
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full justify-start text-left ${
                          activeTab === item.id ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""
                        }`}
                      >
                        {item.label}
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
