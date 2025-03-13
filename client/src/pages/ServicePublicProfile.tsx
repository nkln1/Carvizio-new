
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ServiceProvider } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function ServicePublicProfile() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);

  // Fetch service provider data
  const { data: serviceProfile, isLoading } = useQuery<ServiceProvider>({
    queryKey: [`/api/auth/service-profile/${slug}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/auth/service-profile/${slug}`);
      if (!response.ok) {
        throw new Error("Service not found");
      }
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!slug
  });

  useEffect(() => {
    if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (!serviceProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Serviciu negăsit</h1>
          <p className="mt-2 text-gray-600">
            Ne pare rău, dar serviciul pe care îl căutați nu există.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#00aff5] p-6 text-white">
            <h1 className="text-2xl font-bold">{serviceProfile.companyName}</h1>
            <p className="text-white/80">{serviceProfile.representativeName}</p>
          </div>
          
          {/* Service Details */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Informații Contact</h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="font-medium text-gray-700 w-24">Adresă:</span>
                    <span className="text-gray-600">{serviceProfile.address}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium text-gray-700 w-24">Locație:</span>
                    <span className="text-gray-600">{serviceProfile.city}, {serviceProfile.county}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium text-gray-700 w-24">Telefon:</span>
                    <span className="text-gray-600">{serviceProfile.phone}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium text-gray-700 w-24">Email:</span>
                    <span className="text-gray-600">{serviceProfile.email}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium text-gray-700 w-24">CUI:</span>
                    <span className="text-gray-600">{serviceProfile.cui}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium text-gray-700 w-24">Nr. Reg. Com.:</span>
                    <span className="text-gray-600">{serviceProfile.tradeRegNumber}</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Program de Funcționare</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-500 italic text-sm">
                    Programul de funcționare va fi disponibil în curând.
                  </p>
                  {/* Future working hours will be displayed here */}
                </div>
              </div>
            </div>
            
            {/* Recenzii */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Recenzii</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-500 italic text-sm">
                  Recenziile vor fi disponibile în curând.
                </p>
                {/* Future reviews will be displayed here */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
