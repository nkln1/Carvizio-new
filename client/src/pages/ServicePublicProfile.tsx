
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ServiceProvider, WorkingHour, Review } from "@shared/schema";
import { Loader2, Mail, MapPin, Phone, Clock, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ServiceProfileData extends ServiceProvider {
  workingHours: WorkingHour[];
  reviews: Review[];
}

const getDayName = (dayOfWeek: number): string => {
  const days = [
    "Duminică",
    "Luni",
    "Marți",
    "Miercuri",
    "Joi",
    "Vineri",
    "Sâmbătă"
  ];
  return days[dayOfWeek];
};

export default function ServicePublicProfile() {
  const params = useParams<{ username: string }>();
  const username = params?.username;

  const { data: serviceProfile, isLoading, error } = useQuery({
    queryKey: ['service-profile', username],
    queryFn: async () => {
      if (!username) {
        throw new Error("Username is required");
      }

      const response = await apiRequest('GET', `/api/auth/service-profile/${username}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Service-ul nu a fost găsit");
      }

      const data = await response.json();
      if (!data) {
        throw new Error("Nu s-au putut încărca datele service-ului");
      }
      return data;
    },
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{serviceProfile.companyName}</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Informații Service</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                <p>{serviceProfile.address}, {serviceProfile.city}, {serviceProfile.county}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-500" />
                <p>{serviceProfile.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-500" />
                <p>{serviceProfile.email}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Program de Lucru</h2>
            <div className="space-y-2">
              {serviceProfile.workingHours?.map((hours) => (
                <div key={hours.dayOfWeek} className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">{getDayName(Number(hours.dayOfWeek))}:</span>
                  <span>{hours.isClosed ? "Închis" : `${hours.openTime} - ${hours.closeTime}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Recenzii</h2>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="font-medium">{averageRating.toFixed(1)}/5</span>
                <span className="text-gray-500">({reviews.length} recenzii)</span>
              </div>
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-4">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span>{review.rating}/5</span>
                    </div>
                    <span className="text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && <p className="mt-2">{review.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nu există recenzii momentan.</p>
          )}
        </div>
      </div>
    </div>
  );
}
