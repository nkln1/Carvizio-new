
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ServiceProviderUser, WorkingHour, Review } from "@shared/schema";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, Mail, MapPin, Clock, Star, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ServicePublicProfileProps {
  params: {
    slug: string;
  };
}

type DayTranslation = {
  [key: string]: string;
};

const dayTranslations: DayTranslation = {
  "Monday": "Luni",
  "Tuesday": "Marți",
  "Wednesday": "Miercuri",
  "Thursday": "Joi",
  "Friday": "Vineri",
  "Saturday": "Sâmbătă",
  "Sunday": "Duminică"
};

export default function ServicePublicProfile({ params }: ServicePublicProfileProps) {
  const { slug } = params;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [isClosed, setIsClosed] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Decode the slug before querying
  const decodedSlug = decodeURIComponent(slug);

  // Fetch service provider data with error handling
  const { data: serviceProvider, isLoading, error } = useQuery<ServiceProviderUser>({
    queryKey: [`/api/auth/service-profile/${decodedSlug}`],
    queryFn: async () => {
      const response = await fetch(`/api/auth/service-profile/${decodedSlug}`);
      if (!response.ok) {
        throw new Error('Failed to fetch service provider');
      }
      return response.json();
    },
    retry: 1
  });

  // Fetch working hours
  const { data: workingHours = [] } = useQuery<WorkingHour[]>({
    queryKey: [`/api/service/working-hours/${serviceProvider?.id}`],
    enabled: !!serviceProvider?.id,
    queryFn: async () => {
      const response = await fetch(`/api/service/working-hours/${serviceProvider?.id}`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [`/api/service/reviews/${serviceProvider?.id}`],
    enabled: !!serviceProvider?.id,
    queryFn: async () => {
      const response = await fetch(`/api/service/reviews/${serviceProvider?.id}`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
  });

  // Check if the logged-in user owns this service profile
  const isOwner = user && serviceProvider && user.id === serviceProvider.id && user.role === 'service';

  // Mutation for saving working hours
  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (data: { day: string; openTime: string; closeTime: string; isClosed: boolean }) => {
      const response = await apiRequest(`/api/service/working-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/service/working-hours/${serviceProvider?.id}`] });
      setIsEditingHours(false);
      toast({
        title: "Succes",
        description: "Programul de funcționare a fost actualizat.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut actualiza programul de funcționare.",
      });
    },
  });

  // Mutation for submitting reviews
  const submitReviewMutation = useMutation({
    mutationFn: async (data: { serviceProviderId: number; rating: number; comment: string }) => {
      const response = await apiRequest(`/api/client/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/service/reviews/${serviceProvider?.id}`] });
      setIsReviewDialogOpen(false);
      setRating(5);
      setComment("");
      toast({
        title: "Succes",
        description: "Recenzia a fost trimisă cu succes.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite recenzia.",
      });
    },
  });

  const handleEditHours = (day: string) => {
    setSelectedDay(day);
    const dayHours = workingHours.find(h => h.dayOfWeek === day);
    if (dayHours) {
      setOpenTime(dayHours.openTime);
      setCloseTime(dayHours.closeTime);
      setIsClosed(dayHours.isClosed);
    } else {
      setOpenTime("09:00");
      setCloseTime("18:00");
      setIsClosed(false);
    }
    setIsEditingHours(true);
  };

  const handleSaveHours = () => {
    if (!serviceProvider) return;
    
    updateWorkingHoursMutation.mutate({
      day: selectedDay,
      openTime,
      closeTime,
      isClosed,
    });
  };

  const handleSubmitReview = () => {
    if (!serviceProvider || !user || user.role !== 'client') return;
    
    submitReviewMutation.mutate({
      serviceProviderId: serviceProvider.id,
      rating,
      comment,
    });
  };

  // Calculate average rating
  const averageRating = reviews.length 
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (error || !serviceProvider) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-800">Serviciu negăsit</h1>
        <p className="text-gray-600 mt-2">Nu am putut găsi serviciul căutat.</p>
        <Button
          onClick={() => window.history.back()}
          className="mt-4 bg-[#00aff5] hover:bg-[#0099e0]"
        >
          Înapoi
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar (same style as in other pages) */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-[#00aff5]">Auto Service App</h1>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                Înapoi
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Service Profile Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-lg border-t-4 border-t-[#00aff5]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{serviceProvider.companyName}</CardTitle>
            <CardDescription className="text-gray-600">
              Reprezentant: {serviceProvider.representativeName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-[#00aff5]" />
                  <span>{serviceProvider.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#00aff5]" />
                  <span>{serviceProvider.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#00aff5]" />
                  <span>{serviceProvider.address}, {serviceProvider.city}, {serviceProvider.county}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">
                    {averageRating.toFixed(1)} / 5 ({reviews.length} recenzii)
                  </span>
                </div>
                {user && user.role === 'client' && (
                  <Button 
                    variant="outline"
                    className="text-[#00aff5] border-[#00aff5]"
                    onClick={() => setIsReviewDialogOpen(true)}
                  >
                    Lasă o recenzie
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="program" className="mt-8">
          <TabsList className="bg-white">
            <TabsTrigger value="program">Program de funcționare</TabsTrigger>
            <TabsTrigger value="recenzii">Recenzii</TabsTrigger>
          </TabsList>

          <TabsContent value="program" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Program de funcționare</CardTitle>
                {isOwner && !isEditingHours && (
                  <CardDescription className="text-sm text-gray-500">
                    Click pe o zi pentru a edita programul
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const dayHours = workingHours.find(h => h.dayOfWeek === day);
                    return (
                      <div 
                        key={day} 
                        className={`p-3 border rounded-lg flex justify-between items-center ${isOwner ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                        onClick={isOwner ? () => handleEditHours(day) : undefined}
                      >
                        <div className="font-medium">{dayTranslations[day]}</div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          {dayHours ? (
                            dayHours.isClosed ? (
                              <span className="text-red-500">Închis</span>
                            ) : (
                              <span>{dayHours.openTime} - {dayHours.closeTime}</span>
                            )
                          ) : (
                            <span className="text-gray-500">Nespecificat</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recenzii" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Recenzii ({reviews.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nu există recenzii încă.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                        <p className="text-gray-700">{review.comment || 'Fără comentarii'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer - same as other pages */}
      <footer className="bg-white border-t mt-12 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Auto Service App. Toate drepturile rezervate.
          </div>
        </div>
      </footer>

      {/* Edit Hours Dialog */}
      {isEditingHours && (
        <Dialog open={isEditingHours} onOpenChange={setIsEditingHours}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editează programul pentru {dayTranslations[selectedDay]}</DialogTitle>
              <DialogDescription>
                Setează programul de funcționare pentru această zi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isClosed"
                  checked={isClosed}
                  onChange={(e) => setIsClosed(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isClosed">Închis în această zi</Label>
              </div>

              {!isClosed && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openTime">Ora deschiderii</Label>
                    <Input
                      id="openTime"
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closeTime">Ora închiderii</Label>
                    <Input
                      id="closeTime"
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingHours(false)}>
                Anulează
              </Button>
              <Button onClick={handleSaveHours}>
                Salvează
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lasă o recenzie pentru {serviceProvider.companyName}</DialogTitle>
            <DialogDescription>
              Spune-ne părerea ta despre serviciile oferite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rating">Evaluare</Label>
              <Select value={rating.toString()} onValueChange={(value) => setRating(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Alege o evaluare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Foarte nemulțumit</SelectItem>
                  <SelectItem value="2">2 - Nemulțumit</SelectItem>
                  <SelectItem value="3">3 - Neutru</SelectItem>
                  <SelectItem value="4">4 - Mulțumit</SelectItem>
                  <SelectItem value="5">5 - Foarte mulțumit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comentariu</Label>
              <Textarea
                id="comment"
                placeholder="Descrie experiența ta..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSubmitReview}>
              Trimite recenzia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
