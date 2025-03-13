import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ServiceProviderUser, WorkingHour, Review } from "@shared/schema";
import Footer from "@/components/layout/Footer";
import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, Star, MapPin, Phone, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";

interface ServicePublicProfileProps {
  params: {
    slug: string;
  };
}

export default function ServicePublicProfile({ params }: ServicePublicProfileProps) {
  const { slug } = params;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // Decode the slug before querying
  const decodedSlug = decodeURIComponent(slug);

  // Fetch service provider data
  const { data: serviceProvider, isLoading } = useQuery<ServiceProviderUser>({
    queryKey: [`/api/service/profile/${decodedSlug}`],
  });

  // Fetch working hours
  const { data: workingHours = [] } = useQuery<WorkingHour[]>({
    queryKey: [`/api/service/working-hours/${serviceProvider?.id}`],
    enabled: !!serviceProvider?.id,
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [`/api/service/reviews/${serviceProvider?.id}`],
    enabled: !!serviceProvider?.id,
  });

  // Update working hours mutation
  const updateWorkingHours = useMutation({
    mutationFn: async (data: { day: string; openTime: string; closeTime: string }) => {
      return apiRequest("POST", `/api/service/working-hours/${serviceProvider?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/service/working-hours/${serviceProvider?.id}`] });
      toast({
        title: "Program actualizat",
        description: "Programul de funcționare a fost actualizat cu succes.",
      });
      setIsEditingHours(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu am putut actualiza programul. Te rugăm să încerci din nou.",
      });
    },
  });

  // Add review mutation
  const addReview = useMutation({
    mutationFn: async (data: { rating: number; comment: string }) => {
      return apiRequest("POST", `/api/service/reviews/${serviceProvider?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/service/reviews/${serviceProvider?.id}`] });
      toast({
        title: "Recenzie adăugată",
        description: "Mulțumim pentru feedback!",
      });
      setRating(5);
      setComment("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu am putut adăuga recenzia. Te rugăm să încerci din nou.",
      });
    },
  });

  const handleWorkingHoursSubmit = () => {
    if (!selectedDay || !openTime || !closeTime) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Te rugăm să completezi toate câmpurile.",
      });
      return;
    }

    updateWorkingHours.mutate({
      day: selectedDay,
      openTime,
      closeTime,
    });
  };

  const handleReviewSubmit = () => {
    if (!comment) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Te rugăm să adaugi un comentariu.",
      });
      return;
    }

    addReview.mutate({
      rating,
      comment,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (!serviceProvider) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="container mx-auto p-4 flex-grow">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-600">Service-ul nu a fost găsit.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <div className="container mx-auto p-4 sm:p-6 flex-grow">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#00aff5]">
              {serviceProvider.companyName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              <p>{`${serviceProvider.address}, ${serviceProvider.city}, ${serviceProvider.county}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-gray-500" />
              <p>{serviceProvider.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-500" />
              <p>{serviceProvider.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours Section */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Program de funcționare
            </CardTitle>
            {user?.role === "service" && user.id === serviceProvider.id && (
              <Dialog open={isEditingHours} onOpenChange={setIsEditingHours}>
                <DialogTrigger asChild>
                  <Button variant="outline">Editează program</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editează programul de funcționare</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alege ziua" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                          (day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          type="time"
                          value={openTime}
                          onChange={(e) => setOpenTime(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="time"
                          value={closeTime}
                          onChange={(e) => setCloseTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleWorkingHoursSubmit}
                      disabled={updateWorkingHours.isPending}
                    >
                      {updateWorkingHours.isPending ? "Se salvează..." : "Salvează"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workingHours.map((hour) => (
                <div key={hour.dayOfWeek} className="flex justify-between">
                  <span>{hour.dayOfWeek}</span>
                  <span>
                    {hour.isClosed
                      ? "Închis"
                      : `${hour.openTime.slice(0, 5)} - ${hour.closeTime.slice(0, 5)}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reviews Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Recenzii
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.role === "client" && (
              <div className="mb-6 space-y-4 border-b pb-6">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      onClick={() => setRating(star)}
                      className={star <= rating ? "text-yellow-400" : "text-gray-300"}
                    >
                      <Star className="h-5 w-5 fill-current" />
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Adaugă un comentariu..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button onClick={handleReviewSubmit} disabled={addReview.isPending}>
                  {addReview.isPending ? "Se trimite..." : "Trimite recenzie"}
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600">{review.comment}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {reviews.length === 0 && (
                <p className="text-center text-gray-600">Nu există recenzii încă.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}