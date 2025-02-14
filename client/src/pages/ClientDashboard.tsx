import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import Footer from "@/components/layout/Footer";
import { User, MessageCircle, FileText, Settings, Bell, Car } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { EditProfile } from "@/components/auth/EditProfile";

// Mock data for requests and offers
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
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);

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

  // Always render the navigation and main structure
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
                variant={activeTab === "car" ? "default" : "ghost"}
                onClick={() => setActiveTab("car")}
                className="flex items-center gap-2"
              >
                <Car className="h-4 w-4" />
                Mașina mea
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
        {/* Show loading state in the content area */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
          </div>
        )}

        {/* Only show content when not loading */}
        {!isLoading && (
          <>
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

            {/* Car Section */}
            {activeTab === "car" && (
              <Card>
                <CardHeader>
                  <CardTitle>Mașina mea</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-500">Nu aveți nicio mașină înregistrată.</p>
                      <Button className="mt-4">
                        <Car className="mr-2 h-4 w-4" />
                        Adaugă mașină
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile/Account Section */}
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
      <Footer />
    </div>
  );
}