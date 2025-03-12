import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  MapPin,
  Clock,
  Star,
  Phone,
  Mail,
  Save,
  Loader2,
  Pen,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { User as UserType } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WorkingHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

interface Rating {
  id: string;
  serviceId: string;
  clientId: string;
  rating: number;
  review?: string;
  createdAt: Date;
}

interface ServiceRatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
}

interface ServicePublicProfileProps {
  params: {
    slug: string;
  };
}

export function ServicePublicProfile({ params: { slug } }: ServicePublicProfileProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: "09:00-18:00",
    tuesday: "09:00-18:00",
    wednesday: "09:00-18:00",
    thursday: "09:00-18:00",
    friday: "09:00-18:00",
    saturday: "09:00-14:00",
    sunday: "Închis",
  });
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingStats, setRatingStats] = useState<ServiceRatingStats>({
    averageRating: 0,
    totalRatings: 0,
    ratingDistribution: {},
  });

  // Fetch service data
  const { data: serviceData, isLoading } = useQuery({
    queryKey: [`/api/service/profile/${slug}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/service/profile/${slug}`);
      return response.json();
    }
  });

  // Fetch ratings
  const { data: ratingsData } = useQuery({
    queryKey: [`/api/service/ratings/${serviceData?.id}`],
    enabled: !!serviceData?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/service/ratings/${serviceData?.id}`);
      return response.json();
    }
  });

  useEffect(() => {
    if (ratingsData) {
      setRatings(ratingsData.ratings);
      setRatingStats(ratingsData.stats);
    }
  }, [ratingsData]);

  useEffect(() => {
    if (serviceData?.workingHours) {
      setWorkingHours(serviceData.workingHours);
    }
  }, [serviceData]);

  const isOwner = user?.id === serviceData?.id;

  const handleSave = async () => {
    if (!serviceData?.id || !isOwner) return;
    try {
      await apiRequest("PATCH", `/api/service/profile/${serviceData.id}`, {
        workingHours,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/service/profile/${slug}`] });
      toast({
        title: "Success",
        description: "Programul de funcționare a fost actualizat cu succes",
      });
      setEditing(false);
    } catch (error) {
      console.error("Error updating working hours:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu am putut actualiza programul de funcționare",
      });
    }
  };

  const renderRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (!serviceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Service not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00aff5]">
                <Building2 className="h-6 w-6" />
                {serviceData.companyName}
              </CardTitle>
              <CardDescription>
                Service Auto Autorizat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {serviceData.address}, {serviceData.city}, {serviceData.county}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    {serviceData.phone}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    {serviceData.email}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Program de funcționare
                    </h3>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(!editing)}
                      >
                        {editing ? (
                          <Save className="h-4 w-4" />
                        ) : (
                          <Pen className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {Object.entries(workingHours).map(([day, hours]) => (
                      <div
                        key={day}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="capitalize">{day}:</span>
                        {editing && isOwner ? (
                          <Input
                            value={hours}
                            onChange={(e) =>
                              setWorkingHours((prev) => ({
                                ...prev,
                                [day]: e.target.value,
                              }))
                            }
                            className="w-32 h-7 text-sm"
                          />
                        ) : (
                          <span>{hours}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {editing && isOwner && (
                    <Button
                      onClick={handleSave}
                      className="mt-4 w-full bg-[#00aff5] hover:bg-[#0099d6]"
                    >
                      Salvează modificările
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Locație</h3>
                <div className="aspect-video bg-gray-100 rounded-lg">
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Google Maps placeholder
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00aff5]">
                <Star className="h-6 w-6" />
                Recenzii ({ratingStats.totalRatings})
              </CardTitle>
              <CardDescription>
                Media: {ratingStats.averageRating.toFixed(1)} din 5
                {renderRatingStars(Math.round(ratingStats.averageRating))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ratings.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Nu există recenzii încă
                  </div>
                ) : (
                  ratings.map((rating) => (
                    <div key={rating.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          {renderRatingStars(rating.rating)}
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(rating.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {rating.review && (
                        <p className="text-gray-700">{rating.review}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ServicePublicProfile;