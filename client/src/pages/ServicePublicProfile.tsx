import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock } from "lucide-react";
import { ServiceProvider, WorkingHour } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Helper function to get day name in Romanian
const getDayName = (dayOfWeek: number): string => {
  const days = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
  return days[dayOfWeek] || `Ziua ${dayOfWeek}`;
};

export default function ServicePublicProfile() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);

  // Fetch service provider data
  const { data: serviceProfile, isLoading: isLoadingProfile } = useQuery<ServiceProvider>({
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

  // Fetch working hours
  const { data: workingHours, isLoading: isLoadingWorkingHours } = useQuery<WorkingHour[]>({
    queryKey: [`/api/service/${serviceProfile?.id}/working-hours`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/service/${serviceProfile?.id}/working-hours`);
      if (!response.ok) {
        return []; // Handle error gracefully
      }
      return response.json();
    },
    enabled: !!serviceProfile?.id
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [`/api/service/${serviceProfile?.id}/reviews`],
    enabled: !!serviceProfile?.id
  });

  useEffect(() => {
    if (!isLoadingProfile && !isLoadingWorkingHours && !reviews) {
      setLoading(false);
    }
  }, [isLoadingProfile, isLoadingWorkingHours, reviews]);

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

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

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
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#00aff5]" />
                  Program de Funcționare
                </h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  {isLoadingWorkingHours ? (
                    <div className="flex justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[#00aff5]" />
                    </div>
                  ) : workingHours && workingHours.length > 0 ? (
                    <div className="space-y-2">
                      {workingHours.map((schedule) => (
                        <div key={schedule.id} className="flex justify-between items-center">
                          <span className="font-medium">{getDayName(schedule.dayOfWeek)}</span>
                          <span className="text-gray-600">
                            {schedule.isClosed ? 'Închis' : `${schedule.openTime} - ${schedule.closeTime}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm">
                      Programul de funcționare nu este disponibil.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Recenzii */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-[#00aff5]" />
                Recenzii
                {reviews.length > 0 && (
                  <span className="ml-2 text-sm text-gray-600">
                    ({averageRating.toFixed(1)} / 5 - {reviews.length} recenzii)
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 p-4 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={`h-4 w-4 ${
                                index < review.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm text-gray-600">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic text-sm">
                    Nu există recenzii momentan.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}