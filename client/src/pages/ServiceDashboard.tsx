import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import type { User as UserType, Request as RequestType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

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
    queryKey: ['/api/auth/me'],
    retry: 1,
    refetchOnWindowFocus: false
  });

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

  if (!user?.emailVerified) {
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
                Am trimis un link de verificare la adresa {user.email}.
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-[#00aff5]">Service Dashboard</h1>
              <div className="hidden md:flex items-center space-x-4">
                <Button
                  variant={activeTab === "cereri" ? "default" : "ghost"}
                  onClick={() => setActiveTab("cereri")}
                  className={activeTab === "cereri" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""}
                >
                  Cereri
                </Button>
                <Button
                  variant={activeTab === "oferte-trimise" ? "default" : "ghost"}
                  onClick={() => setActiveTab("oferte-trimise")}
                  className={activeTab === "oferte-trimise" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""}
                >
                  Oferte trimise
                </Button>
                <Button
                  variant={activeTab === "oferte-acceptate" ? "default" : "ghost"}
                  onClick={() => setActiveTab("oferte-acceptate")}
                  className={activeTab === "oferte-acceptate" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""}
                >
                  Oferte acceptate
                </Button>
                <Button
                  variant={activeTab === "mesaje" ? "default" : "ghost"}
                  onClick={() => setActiveTab("mesaje")}
                  className={activeTab === "mesaje" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""}
                >
                  Mesaje
                </Button>
                <Button
                  variant={activeTab === "cont" ? "default" : "ghost"}
                  onClick={() => setActiveTab("cont")}
                  className={activeTab === "cont" ? "bg-[#00aff5] hover:bg-[#0099d6]" : ""}
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
          <div className="space-y-6">
            {activeTab === "cereri" && (
              <Card>
                <CardHeader>
                  <CardTitle>Cereri de Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Lista cererilor va apărea aici.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === "oferte-trimise" && (
              <Card>
                <CardHeader>
                  <CardTitle>Oferte Trimise</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Lista ofertelor trimise va apărea aici.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === "oferte-acceptate" && (
              <Card>
                <CardHeader>
                  <CardTitle>Oferte Acceptate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Lista ofertelor acceptate va apărea aici.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === "mesaje" && (
              <Card>
                <CardHeader>
                  <CardTitle>Mesaje</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Mesajele vor apărea aici.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === "cont" && (
              <Card>
                <CardHeader>
                  <CardTitle>Informații Cont</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Informațiile contului vor apărea aici.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
