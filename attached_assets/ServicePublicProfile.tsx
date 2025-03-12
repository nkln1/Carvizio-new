import { useState, useEffect } from "react";
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import type { ServiceData, Rating, ServiceRatingStats } from "@/types/service";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { decodeSlug } from "@/lib/utils";

interface WorkingHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

interface ServicePublicProfileProps {
  slug: string;
}

const normalizeCompanyName = (companyName: string | undefined): string => {
  if (!companyName) return "";
  return companyName.toLowerCase().trim();
};

export function ServicePublicProfile({ slug }: ServicePublicProfileProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [userRating, setUserRating] = useState<number>(0);
  const [userReview, setUserReview] = useState<string>("");
  const [canRate, setCanRate] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [serviceId, setServiceId] = useState<string>("");
  const [acceptedOffers, setAcceptedOffers] = useState<string[]>([]);

  useEffect(() => {
    async function fetchServiceData() {
      try {
        setLoading(true);
        const decodedCompanyName = decodeSlug(slug);
        const servicesRef = collection(db, "services");
        const querySnapshot = await getDocs(servicesRef);
        const matchingDoc = querySnapshot.docs.find(doc => {
          const data = doc.data() as ServiceData;
          return normalizeCompanyName(data.companyName) === normalizeCompanyName(decodedCompanyName);
        });
        if (matchingDoc) {
          const data = matchingDoc.data() as ServiceData;
          setServiceData({ ...data, id: matchingDoc.id });
          setServiceId(matchingDoc.id);
          if (data.workingHours) {
            setWorkingHours(data.workingHours as WorkingHours);
          }
        } else {
          console.error("Service not found for slug:", slug);
          toast({
            variant: "destructive",
            title: "Service negăsit",
            description: "Nu am putut găsi serviciul auto specificat.",
          });
        }
      } catch (error) {
        console.error("Error fetching service data:", error);
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu am putut încărca datele serviciului. Vă rugăm să încercați din nou.",
        });
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      fetchServiceData();
    }
  }, [slug, toast]);

  const isOwner = user?.uid === serviceData?.id;

  const handleSave = async () => {
    if (!serviceData?.id || !isOwner) return;
    try {
      const serviceRef = doc(db, "services", serviceData.id);
      await updateDoc(serviceRef, {
        workingHours,
      });
      toast({
        title: "Success",
        description: "Working hours updated successfully",
      });
      setEditing(false);
    } catch (error) {
      console.error("Error updating working hours:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update working hours",
      });
    }
  };

  useEffect(() => {
    async function fetchRatings() {
      if (!serviceId) return;
      try {
        const ratingsRef = collection(db, "ratings");
        const q = query(ratingsRef, where("serviceId", "==", serviceId));
        const querySnapshot = await getDocs(q);
        const fetchedRatings: Rating[] = [];
        let totalRating = 0;
        const distribution: { [key: number]: number } = {};
        querySnapshot.forEach((doc) => {
          const rating = doc.data() as Rating;
          fetchedRatings.push({ ...rating, id: doc.id });
          totalRating += rating.rating;
          distribution[rating.rating] = (distribution[rating.rating] || 0) + 1;
        });
        setRatings(fetchedRatings);
        setRatingStats({
          averageRating: fetchedRatings.length > 0 ? totalRating / fetchedRatings.length : 0,
          totalRatings: fetchedRatings.length,
          ratingDistribution: distribution,
        });
        if (user) {
          const offersRef = collection(db, "offers");
          const offersQuery = query(
            offersRef,
            where("clientId", "==", user.uid),
            where("serviceId", "==", serviceId),
            where("status", "==", "Accepted")
          );
          const offersSnapshot = await getDocs(offersQuery);
          const acceptedOfferIds = offersSnapshot.docs.map(doc => doc.id);
          setAcceptedOffers(acceptedOfferIds);
          const userRatingQuery = query(
            ratingsRef,
            where("clientId", "==", user.uid),
            where("serviceId", "==", serviceId)
          );
          const userRatingSnapshot = await getDocs(userRatingQuery);
          setCanRate(acceptedOfferIds.length > 0 && userRatingSnapshot.empty);
        }
      } catch (error) {
        console.error("Error fetching ratings:", error);
      }
    }
    fetchRatings();
  }, [serviceId, user]);

  const handleRatingSubmit = async () => {
    if (!user || !serviceId || userRating === 0 || acceptedOffers.length === 0) return;
    setSubmittingRating(true);
    try {
      const ratingData = {
        serviceId,
        clientId: user.uid,
        offerId: acceptedOffers[0],
        rating: userRating,
        review: userReview.trim(),
        createdAt: new Date(),
      };
      const ratingsRef = collection(db, "ratings");
      await addDoc(ratingsRef, ratingData);
      toast({
        title: "Succes",
        description: "Recenzia dvs. a fost adăugată cu succes.",
      });
      const q = query(ratingsRef, where("serviceId", "==", serviceId));
      const querySnapshot = await getDocs(q);
      const updatedRatings: Rating[] = [];
      querySnapshot.forEach((doc) => {
        updatedRatings.push({ ...doc.data() as Rating, id: doc.id });
      });
      setRatings(updatedRatings);
      setCanRate(false);
      setUserRating(0);
      setUserReview("");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu am putut adăuga recenzia. Vă rugăm să încercați din nou.",
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderRatingStars = (rating: number, onRatingClick?: (rating: number) => void) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            } ${onRatingClick ? "cursor-pointer" : ""}`}
            onClick={() => onRatingClick && onRatingClick(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
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
                      Save Changes
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
              {canRate && (
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Adaugă o recenzie</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Rating</label>
                      {renderRatingStars(userRating, setUserRating)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Recenzie</label>
                      <Textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="Descrieți experiența dvs. cu acest service auto..."
                        className="min-h-[100px]"
                      />
                    </div>
                    <Button
                      onClick={handleRatingSubmit}
                      disabled={userRating === 0 || submittingRating}
                      className="bg-[#00aff5] hover:bg-[#0099d6]"
                    >
                      {submittingRating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Se trimite...
                        </>
                      ) : (
                        "Trimite recenzia"
                      )}
                    </Button>
                  </div>
                </div>
              )}
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