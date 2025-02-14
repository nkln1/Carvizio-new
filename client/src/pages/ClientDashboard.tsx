import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { User, MessageCircle, FileText, Settings, Bell } from "lucide-react";

// Mock data
const mockRequests = [
  { id: "REQ001", date: "2024-02-14", status: "În așteptare", description: "Schimb ulei și filtru" },
  { id: "REQ002", date: "2024-02-13", status: "Acceptat", description: "Verificare frâne" },
  { id: "REQ003", date: "2024-02-12", status: "Finalizat", description: "Schimb anvelope" },
];

const mockOffers = [
  { id: 1, serviceId: "SRV1", serviceName: "Auto Service Pro", price: 350, availability: "2024-02-16", description: "Schimb ulei și filtru" },
  { id: 2, serviceId: "SRV2", serviceName: "Mecanik Expert", price: 400, availability: "2024-02-15", description: "Verificare frâne completă" },
];

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("requests");
  const [userProfile] = useState({
    email: auth.currentUser?.email,
    name: "John Doe", // Mock name
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLocation("/");
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "În așteptare":
        return "text-yellow-600 bg-yellow-100";
      case "Acceptat":
        return "text-green-600 bg-green-100";
      case "Finalizat":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow">
        <div className="container mx-auto">
          <div className="flex items-center justify-between p-4">
            <div className="flex space-x-4">
              <Button
                variant={activeTab === "requests" ? "default" : "ghost"}
                onClick={() => setActiveTab("requests")}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Cererile Mele
              </Button>
              <Button
                variant={activeTab === "offers" ? "default" : "ghost"}
                onClick={() => setActiveTab("offers")}
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                Oferte primite
              </Button>
              <Button
                variant={activeTab === "messages" ? "default" : "ghost"}
                onClick={() => setActiveTab("messages")}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Mesaje
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                onClick={() => setActiveTab("profile")}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Cont
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6 flex-grow">
        {/* Profile Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profil Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{userProfile.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nume</p>
                <p className="font-medium">{userProfile.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Section */}
        {activeTab === "requests" && (
          <Card>
            <CardHeader>
              <CardTitle>Cererile Mele Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:border-[#00aff5] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">#{request.id}</p>
                        <p className="text-sm text-gray-600">{request.description}</p>
                        <p className="text-sm text-gray-500">{request.date}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offers Section */}
        {activeTab === "offers" && (
          <Card>
            <CardHeader>
              <CardTitle>Oferte Primite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:border-[#00aff5] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{offer.serviceName}</p>
                        <p className="text-sm text-gray-600">{offer.description}</p>
                        <p className="text-sm text-gray-500">
                          Disponibil: {offer.availability}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#00aff5]">{offer.price} RON</p>
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            // Handle offer acceptance
                            console.log("Accepted offer:", offer.id);
                          }}
                        >
                          Acceptă Oferta
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages Section */}
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

        {/* Profile/Account Section */}
        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Setări Cont</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{userProfile.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nume</p>
                  <p className="font-medium">{userProfile.name}</p>
                </div>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Settings className="mr-2 h-4 w-4" />
                  Editează Profilul
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}