import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ServiceProvider, WorkingHour, Review } from "@shared/schema";
import { Loader2, Mail, MapPin, Phone, Clock, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ServiceProfileData extends ServiceProvider {
  workingHours: WorkingHour[];
  reviews: Review[];
}

// Helper function to get day name in Romanian (retained from original)
const getDayName = (dayOfWeek: number): string => {
  const days = [
    "Duminică",  // 0
    "Luni",      // 1
    "Marți",     // 2
    "Miercuri",  // 3
    "Joi",       // 4
    "Vineri",    // 5
    "Sâmbătă"    // 6
  ];
  return days[dayOfWeek];
};

export default function ServicePublicProfile() {
  const { username } = useParams();

  const { data: serviceProfile, isLoading, error } = useQuery<ServiceProfileData>({
    queryKey: ['service-profile', username],
    queryFn: async () => {
      if (!username) {
        throw new Error("Username is required");
      }

      console.log('Fetching service profile for username:', username);
      const response = await apiRequest('GET', `/api/auth/service-profile/${username}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || "Service-ul nu a fost găsit");
      }

      const data = await response.json();
      console.log('Received service profile data:', data);
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!username
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (error || !serviceProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Eroare</h1>
          <p className="mt-2 text-gray-600">
            {error instanceof Error ? error.message : "A apărut o eroare la încărcarea profilului. Vă rugăm încercați din nou."}
          </p>
        </div>
      </div>
    );
  }

  const reviews = serviceProfile.reviews || [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  const sortedWorkingHours = [...(serviceProfile.workingHours || [])].sort((a, b) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{serviceProfile.companyName}</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Informații Service</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Reprezentant:</span> {serviceProfile.representativeName}</p>
              <p><span className="font-medium">Adresă:</span> {serviceProfile.address}</p>
              <p><span className="font-medium">Județ:</span> {serviceProfile.county}</p>
              <p><span className="font-medium">Oraș:</span> {serviceProfile.city}</p>
              <p><span className="font-medium">Telefon:</span> {serviceProfile.phone}</p>
              <p><span className="font-medium">Email:</span> {serviceProfile.email}</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Program de Lucru</h2>
            <div className="space-y-2">
              {sortedWorkingHours.map((hours) => (
                <div key={hours.dayOfWeek} className="flex justify-between">
                  <span className="font-medium">{hours.dayOfWeek}:</span>
                  <span>{hours.isClosed ? "Închis" : `${hours.openTime} - ${hours.closeTime}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Recenzii</h2>
          {reviews.length > 0 ? (
            <div>
              <p className="mb-4">
                <span className="font-medium">Rating mediu:</span> {averageRating.toFixed(1)} / 5
              </p>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Rating: {review.rating}/5</span>
                      <span className="text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && <p className="mt-2">{review.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Nu există recenzii momentan.</p>
          )}
        </div>
      </div>
    </div>
  );
}