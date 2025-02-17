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
import { useAuth } from "@/context/AuthContext";

// Import the tab components
import RequestsTab from "@/components/service-dashboard/RequestsTab";
import SentOffersTab from "@/components/service-dashboard/SentOffersTab";
import AcceptedOffersTab from "@/components/service-dashboard/AcceptedOffersTab";
import MessagesTab from "@/components/service-dashboard/MessagesTab";
import AccountTab from "@/components/service-dashboard/AccountTab";

export default function ServiceDashboard() {
  const [, setLocation] = useLocation();
  const { user, resendVerificationEmail } = useAuth();
  const [activeTab, setActiveTab] = useState("cereri");
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLocation("/");
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  const { data: userProfile, isLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/me"],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      toast({
        title: "Email trimis",
        description:
          "Un nou email de verificare a fost trimis. Te rugăm să verifici căsuța de email.",
      });
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la trimiterea emailului de verificare.",
        variant: "destructive",
      });
    }
  };

  // Early return if user is not available yet
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  // Show email verification message if email is not verified
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
                Pentru a accesa dashboard-ul, te rugăm să îți verifici adresa de
                email.
                {user.email &&
                  `Am trimis un link de verificare la adresa ${user.email}.`}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleResendVerification}>
                  Retrimite emailul de verificare
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
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

  const renderActiveTab = () => {
    switch (activeTab) {
      case "cereri":
        return <RequestsTab />;
      case "oferte-trimise":
        return <SentOffersTab />;
      case "oferte-acceptate":
        return <AcceptedOffersTab />;
      case "mesaje":
        return <MessagesTab />;
      case "cont":
        return <AccountTab />;
      default:
        return <RequestsTab />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-[#00aff5]">Service</h1>
              <div className="hidden md:flex items-center space-x-4">
                <Button
                  variant={activeTab === "cereri" ? "default" : "ghost"}
                  onClick={() => setActiveTab("cereri")}
                  className={
                    activeTab === "cereri"
                      ? "bg-[#00aff5] hover:bg-[#0099d6]"
                      : ""
                  }
                >
                  Cereri
                </Button>
                <Button
                  variant={activeTab === "oferte-trimise" ? "default" : "ghost"}
                  onClick={() => setActiveTab("oferte-trimise")}
                  className={
                    activeTab === "oferte-trimise"
                      ? "bg-[#00aff5] hover:bg-[#0099d6]"
                      : ""
                  }
                >
                  Oferte trimise
                </Button>
                <Button
                  variant={
                    activeTab === "oferte-acceptate" ? "default" : "ghost"
                  }
                  onClick={() => setActiveTab("oferte-acceptate")}
                  className={
                    activeTab === "oferte-acceptate"
                      ? "bg-[#00aff5] hover:bg-[#0099d6]"
                      : ""
                  }
                >
                  Oferte acceptate
                </Button>
                <Button
                  variant={activeTab === "mesaje" ? "default" : "ghost"}
                  onClick={() => setActiveTab("mesaje")}
                  className={
                    activeTab === "mesaje"
                      ? "bg-[#00aff5] hover:bg-[#0099d6]"
                      : ""
                  }
                >
                  Mesaje
                </Button>
                <Button
                  variant={activeTab === "cont" ? "default" : "ghost"}
                  onClick={() => setActiveTab("cont")}
                  className={
                    activeTab === "cont"
                      ? "bg-[#00aff5] hover:bg-[#0099d6]"
                      : ""
                  }
                >
                  Cont
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6 flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
          </div>
        ) : (
          <div className="space-y-6">{renderActiveTab()}</div>
        )}
      </div>

      <Footer />
    </div>
  );
}
