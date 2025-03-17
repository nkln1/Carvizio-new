import { useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, MapPin, Phone, Clock, Star, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ServiceProvider, WorkingHour, Review } from "@shared/schema";

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
  const { username } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const reviewsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

      if (!data) {
        throw new Error("Nu s-au putut încărca datele service-ului");
      }

      return {
        ...data,
        workingHours: data.workingHours || [],
        reviews: data.reviews || []
      };
    },
    retry: false,
    enabled: !!username
  });

  // Mutation for updating working hours
  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (workingHour: Partial<WorkingHour>) => {
      const response = await apiRequest(
        'PATCH',
        `/api/service/working-hours/${workingHour.id}`,
        workingHour
      );
      if (!response.ok) {
        throw new Error("Nu s-a putut actualiza programul");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-profile', username] });
      toast({
        title: "Succes",
        description: "Programul a fost actualizat cu succes",
      });
    },
    onError: (error) => {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut actualiza programul",
        variant: "destructive",
      });
    },
  });

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const isOwner = user?.role === 'service' && user?.username === serviceProfile.username;

  const handleWorkingHourUpdate = async (workingHour: WorkingHour, changes: Partial<WorkingHour>) => {
    try {
      await updateWorkingHoursMutation.mutateAsync({
        id: workingHour.id,
        ...changes,
      });
    } catch (error) {
      console.error('Error updating working hours:', error);
    }
  };

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
              {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                const workingHour = serviceProfile.workingHours?.find(
                  (wh) => Number(wh.dayOfWeek) === day
                );

                return (
                  <div key={day} className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <span className="font-medium w-24">{getDayName(day)}:</span>
                    {isOwner ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={workingHour?.openTime || "09:00"}
                          onChange={(e) => workingHour && handleWorkingHourUpdate(workingHour, {
                            openTime: e.target.value
                          })}
                          disabled={workingHour?.isClosed}
                          className="w-24"
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={workingHour?.closeTime || "18:00"}
                          onChange={(e) => workingHour && handleWorkingHourUpdate(workingHour, {
                            closeTime: e.target.value
                          })}
                          disabled={workingHour?.isClosed}
                          className="w-24"
                        />
                        <Switch
                          checked={!workingHour?.isClosed}
                          onCheckedChange={(checked) => workingHour && handleWorkingHourUpdate(workingHour, {
                            isClosed: !checked
                          })}
                        />
                      </div>
                    ) : (
                      <span>
                        {workingHour?.isClosed ? "Închis" : `${workingHour?.openTime || "09:00"} - ${workingHour?.closeTime || "18:00"}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-400 fill-current" />
              <span className="text-xl font-semibold">{averageRating.toFixed(1)}/5</span>
              <span className="text-gray-500">({reviews.length} recenzii)</span>
            </div>
            {reviews.length > 0 && (
              <Button variant="outline" onClick={scrollToReviews}>
                Vezi toate recenziile
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="mt-8" ref={reviewsRef}>
            <h2 className="text-xl font-semibold mb-4">Toate Recenziile</h2>
            <div className="space-y-4">
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
          </div>
        )}
      </div>
    </div>
  );
}