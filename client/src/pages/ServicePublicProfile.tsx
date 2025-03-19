import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Mail, MapPin, Phone, Clock, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import WorkingHoursEditor from "@/components/service-dashboard/WorkingHoursEditor";
import { ReviewSection } from "@/components/reviews/ReviewSection";
import type { ServiceProvider, WorkingHour, Review } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ServiceProfileData extends ServiceProvider {
  workingHours: WorkingHour[];
  reviews: Review[];
}

const getDayName = (dayOfWeek: number): string => {
  const days = [
    "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"
  ];
  return days[dayOfWeek - 1] || "Duminică";
};

export default function ServicePublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditingHours, setIsEditingHours] = useState(false);

  const { data: serviceProfile, isLoading } = useQuery<ServiceProfileData>({
    queryKey: ['/api/service-profile', username],
    queryFn: async () => {
      if (!username) throw new Error("Username is required");
      const response = await apiRequest('GET', `/api/auth/service-profile/${username}`);
      if (!response.ok) throw new Error("Service-ul nu a fost găsit");
      const data = await response.json();
      return {
        ...data,
        workingHours: data.workingHours || [],
        reviews: data.reviews || []
      };
    },
    retry: false,
    enabled: !!username
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/reviews', {
        ...data,
        serviceProviderId: serviceProfile?.id
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-profile', username] });
      toast({
        title: "Succes",
        description: "Recenzia a fost adăugată cu succes!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message || "Nu s-a putut adăuga recenzia. Încercați din nou.",
      });
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
    </div>;
  }

  if (!serviceProfile) {
    return <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800">Eroare</h1>
      <p className="mt-2 text-gray-600">Nu s-au putut încărca datele service-ului.</p>
    </div>;
  }

  // User can review if they are logged in and are not the service owner
  const canReview = user && user.role === 'client' && user.username !== username;

  const isOwner = user?.role === 'service' && user?.username === username;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-[#00aff5] flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          {serviceProfile.companyName}
        </h1>
        <p className="text-gray-600 mb-4">Service Auto Autorizat</p>

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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Program de Lucru</h2>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingHours(!isEditingHours)}
                >
                  {isEditingHours ? "Anulează" : "Editează"}
                </Button>
              )}
            </div>
            {isOwner && isEditingHours ? (
              <WorkingHoursEditor
                serviceId={serviceProfile.id}
                workingHours={serviceProfile.workingHours || []}
                onClose={() => setIsEditingHours(false)}
              />
            ) : (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const workingHour = serviceProfile.workingHours?.find(wh => Number(wh.dayOfWeek) === day);
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <span className="font-medium w-24">{getDayName(day)}:</span>
                      <span>
                        {workingHour?.isClosed
                          ? "Închis"
                          : `${workingHour?.openTime || "09:00"} - ${workingHour?.closeTime || "18:00"}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Review Section */}
        <div className="mt-8">
          <ReviewSection
            canReview={canReview}
            reviews={serviceProfile.reviews || []}
            onSubmitReview={async (data) => {
              try {
                await reviewMutation.mutateAsync(data);
              } catch (error) {
                console.error('Error submitting review:', error);
                throw error;
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}