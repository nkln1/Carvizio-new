import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";
import { ServiceProvider, Review, WorkingHour } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { WorkingHoursEditor } from "@/components/service-dashboard/WorkingHoursEditor";
import { useAuth } from "@/context/AuthContext";

// Helper function to get day name in English
const getDayName = (dayOfWeek: number): string => {
  const days = [
    "Sunday",    // 0
    "Monday",    // 1
    "Tuesday",   // 2
    "Wednesday", // 3
    "Thursday",  // 4
    "Friday",    // 5
    "Saturday"   // 6
  ];
  return days[dayOfWeek];
};

export default function ServicePublicProfile() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [editingDay, setEditingDay] = useState<number | null>(null);

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
  const { data: workingHours = [] } = useQuery<WorkingHour[]>({
    queryKey: [`/api/service/${serviceProfile?.id}/working-hours`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/service/${serviceProfile?.id}/working-hours`);
      return response.json();
    },
    enabled: !!serviceProfile?.id
  });

  useEffect(() => {
    if (!isLoadingProfile) {
      setLoading(false);
    }
  }, [isLoadingProfile]);

  // Check if the logged-in user owns this service profile
  const isOwner = user && serviceProfile && user.id === serviceProfile.id;

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

  const reviews = serviceProfile.reviews || [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-[#00aff5] text-2xl font-semibold">{serviceProfile.companyName}</h1>
          <p className="text-gray-600">Service Auto Autorizat</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 space-y-6">
            {/* Contact Information */}
            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-500 mr-3" />
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

            {/* Working Hours */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Program de funcționare</h2>
              <div className="space-y-2">
                {[...workingHours]
                  .sort((a, b) => {
                    const adjustDay = (day: number) => day === 0 ? 7 : day;
                    return adjustDay(a.dayOfWeek) - adjustDay(b.dayOfWeek);
                  })
                  .map((schedule) => (
                    <div key={schedule.id} className="flex justify-between items-center py-2">
                      <span className="font-medium">{getDayName(schedule.dayOfWeek)}:</span>
                      {isOwner && editingDay === schedule.dayOfWeek ? (
                        <WorkingHoursEditor
                          schedule={schedule}
                          onCancel={() => setEditingDay(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">
                            {schedule.isClosed ? 'Închis' : `${schedule.openTime}-${schedule.closeTime}`}
                          </span>
                          {isOwner && (
                            <button
                              onClick={() => setEditingDay(schedule.dayOfWeek)}
                              className="text-sm text-[#00aff5] hover:text-[#0090d0]"
                            >
                              Modifică
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-[#00aff5]">★</span>
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