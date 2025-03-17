import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, MapPin, Phone, Clock, Star } from "lucide-react";
import { ServiceProvider, Review, WorkingHour } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Helper function to get day name in Romanian
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

interface ServiceProfileData extends ServiceProvider {
  workingHours: WorkingHour[];
  reviews: Review[];
}

export default function ServicePublicProfile() {
  const { username } = useParams();
  const reviewsRef = useRef<HTMLDivElement>(null);

  const { data: serviceProfile, isLoading, error } = useQuery<ServiceProfileData>({
    queryKey: ['service-profile', username],
    queryFn: async () => {
      if (!username) {
        throw new Error("Username is required");
      }
      const response = await apiRequest('GET', `/api/auth/service-profile/${username}`);

      if (!response.ok) {
        throw new Error("Service-ul nu a fost găsit");
      }

      const data = await response.json();
      if (!data) {
        throw new Error("Nu s-au putut încărca datele profilului");
      }

      return data;
    },
    retry: 2,
    retryDelay: 1000,
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
            A apărut o eroare la încărcarea profilului. Vă rugăm încercați din nou.
          </p>
        </div>
      </div>
    );
  }

  const reviews = serviceProfile.reviews || [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((acc: number, review: Review) => acc + review.rating, 0) / reviews.length
    : 0;

  const sortedWorkingHours = [...(serviceProfile.workingHours || [])].sort((a, b) => {
    const dayA = typeof a.dayOfWeek === 'string' ? parseInt(a.dayOfWeek) : a.dayOfWeek;
    const dayB = typeof b.dayOfWeek === 'string' ? parseInt(b.dayOfWeek) : b.dayOfWeek;
    const adjustDay = (day: number) => day === 0 ? 7 : day;
    return adjustDay(dayA) - adjustDay(dayB);
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-[#00aff5] text-2xl font-semibold">{serviceProfile.companyName}</h1>
              <p className="text-gray-600">Service Auto Autorizat</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="ml-1 text-gray-700">{averageRating.toFixed(1)}/5</span>
                <span className="ml-1 text-gray-500 text-sm">({reviews.length})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-8">
              <div className="md:w-1/2 space-y-4">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <span className="text-gray-900">{serviceProfile.address}</span>
                    <span className="text-gray-600 block">{serviceProfile.city}, {serviceProfile.county}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="text-gray-900">{serviceProfile.phone}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="text-gray-900">{serviceProfile.email}</span>
                </div>
              </div>

              <div className="md:w-1/2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-500 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">Program de funcționare</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {sortedWorkingHours.map((schedule) => (
                    <div key={schedule.id} className="flex justify-between text-sm border-b border-gray-100 py-1.5">
                      <span className="font-medium">
                        {getDayName(typeof schedule.dayOfWeek === 'string' ? 
                          parseInt(schedule.dayOfWeek) : schedule.dayOfWeek)}
                      </span>
                      <span className="text-gray-600">
                        {schedule.isClosed ? 'Închis' : `${schedule.openTime}-${schedule.closeTime}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8" ref={reviewsRef}>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                Recenzii
                {reviews.length > 0 && (
                  <span className="ml-2 text-sm text-gray-600">
                    ({averageRating.toFixed(1)}/5 - {reviews.length} recenzii)
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review: Review) => (
                    <div key={review.id} className="bg-gray-50 p-4 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <span key={index} className={index < review.rating ? "text-yellow-400" : "text-gray-300"}>
                              ★
                            </span>
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