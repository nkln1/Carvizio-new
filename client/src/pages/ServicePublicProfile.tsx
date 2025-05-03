import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Mail, MapPin, Phone, Clock, Building2, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import WorkingHoursEditor from "@/components/service-dashboard/WorkingHoursEditor";
import { ReviewSection } from "@/components/reviews/ReviewSection";
import type { ServiceProvider, WorkingHour, Review, SentOffer } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SEOHeader from "@/components/seo/SEOHeader";
import ServiceDetailSchema from "@/components/seo/ServiceDetailSchema";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

interface ServiceProfileData extends ServiceProvider {
  workingHours: WorkingHour[];
  reviews: Review[];
}

interface AcceptedOffer extends SentOffer {
  serviceProviderName: string;
  serviceProviderUsername: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReviewedAlready, setHasReviewedAlready] = useState(false);

  // Obținem profilul service-ului
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

  // Obținem ofertele acceptate ale clientului pentru acest service
  const { data: acceptedOffers } = useQuery<AcceptedOffer[]>({
    queryKey: ['/api/client/offers/accepted', serviceProfile?.id],
    queryFn: async () => {
      if (!user || user.role !== 'client' || !serviceProfile?.id) return [];

      // Obținem toate ofertele clientului
      const response = await apiRequest('GET', '/api/client/offers');
      if (!response.ok) return [];

      const allOffers = await response.json();

      // Filtrăm doar ofertele acceptate de la acest service provider
      const accepted = allOffers.filter((offer: AcceptedOffer) => 
        offer.serviceProviderId === serviceProfile.id && 
        offer.status === "Accepted"
      );

      return accepted;
    },
    enabled: !!user && user.role === 'client' && !!serviceProfile?.id
  });

  // Verificăm dacă utilizatorul curent a lăsat deja o recenzie
  useEffect(() => {
    if (user && user.role === 'client' && serviceProfile && serviceProfile.reviews) {
      const existingReview = serviceProfile.reviews.find(
        review => review.clientId === Number(user.id)
      );
      setHasReviewedAlready(!!existingReview);
    }
  }, [user, serviceProfile]);

  // Verificăm dacă clientul poate lăsa o recenzie
  const canReview = user && 
    user.role === 'client' && 
    user.username !== username && 
    (acceptedOffers?.length > 0) &&
    !hasReviewedAlready; // Adăugăm verificarea dacă utilizatorul a lăsat deja o recenzie

  // Verificăm dacă utilizatorul este proprietarul profilului
  const isOwner = user?.role === 'service' && user?.username === username;

  // Mutația pentru trimiterea recenziei
  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSubmitting(true);

      // Verificăm dacă există oferte acceptate
      if (!acceptedOffers || acceptedOffers.length === 0) {
        throw new Error('Nu aveți interacțiuni anterioare cu acest service');
      }

      // Folosim prima ofertă acceptată
      const latestAcceptedOffer = acceptedOffers[0];

      const response = await apiRequest('POST', '/api/reviews', {
        ...data,
        serviceProviderId: serviceProfile?.id,
        requestId: latestAcceptedOffer.requestId,
        offerId: latestAcceptedOffer.id,
        offerCompletedAt: latestAcceptedOffer.completedAt || new Date()
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
      setIsSubmitting(false);
      // Setăm hasReviewedAlready la true după ce recenzia a fost adăugată cu succes
      setHasReviewedAlready(true);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message || "Nu s-a putut adăuga recenzia. Încercați din nou.",
      });
      setIsSubmitting(false);
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!username) throw new Error("Username is required");
      const response = await apiRequest('GET', `/api/auth/service-profile/${username}`);
      if (!response.ok) throw new Error("Service-ul nu a fost găsit");
      const data = await response.json();
      return {
        ...data,
        workingHours: data.workingHours || [],
        reviews: data.reviews || []
      };
    };
    fetchData();
  }, [username]);

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

  // Calculăm rating-ul mediu pentru SEO
  const avgRating = serviceProfile.reviews && serviceProfile.reviews.length > 0
    ? serviceProfile.reviews.reduce((acc, review) => acc + review.rating, 0) / serviceProfile.reviews.length
    : 0;
    
  // Datele de breadcrumb pentru SEO
  const breadcrumbItems = [
    { name: "Acasă", url: "/" },
    { name: "Service-uri Auto", url: "/services" },
    { name: serviceProfile.companyName, url: `/service/${username}` }
  ];
    
  return (
    <>
      {/* SEO Header cu metadate */}
      <SEOHeader 
        title={`${serviceProfile.companyName} - Service Auto în ${serviceProfile.city}, ${serviceProfile.county}`}
        description={`${serviceProfile.companyName} oferă servicii auto de calitate în ${serviceProfile.city}. Program, adresă, recenzii și informații de contact complete.`}
        keywords={`service auto ${serviceProfile.city.toLowerCase()}, reparații auto, ${serviceProfile.companyName}, întreținere auto, service auto profesional`}
        canonicalUrl={`https://auto-service-app.ro/service/${username}`}
        ogImage="/og-image.jpg"
      />
      
      {/* Schema.org pentru breadcrumb */}
      <BreadcrumbSchema items={breadcrumbItems} />
      
      {/* Schema.org pentru service auto */}
      <ServiceDetailSchema 
        name={`Service Auto ${serviceProfile.companyName}`}
        description={`${serviceProfile.companyName} este un service auto autorizat din ${serviceProfile.city}, care oferă servicii complete de întreținere și reparații auto.`}
        companyName={serviceProfile.companyName}
        companyUrl={`https://auto-service-app.ro/service/${username}`}
        serviceTypes={["Întreținere auto", "Reparații", "Diagnoză", "Service rapid"]}
        address={{
          street: serviceProfile.address || "",
          city: serviceProfile.city,
          county: serviceProfile.county,
          postalCode: ""
        }}
        telephone={serviceProfile.phone}
        email={serviceProfile.email}
        areasServed={[serviceProfile.city, serviceProfile.county, "România"]}
        priceRange={"$$"}
        rating={serviceProfile.reviews && serviceProfile.reviews.length > 0 ? {
          value: avgRating,
          count: serviceProfile.reviews.length
        } : undefined}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
            <h1 className="text-3xl font-bold text-[#00aff5] flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {serviceProfile.companyName}
            </h1>

          {/* Rating Preview Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center">
              {serviceProfile.reviews && serviceProfile.reviews.length > 0 ? (
                <div>
                  <div className="flex items-center">
                    <span className="text-xl font-bold mr-2">
                      {(serviceProfile.reviews.reduce((acc, review) => acc + review.rating, 0) / 
                        serviceProfile.reviews.length).toFixed(1)}
                    </span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(serviceProfile.reviews.reduce((acc, review) => 
                              acc + review.rating, 0) / serviceProfile.reviews.length)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-gray-600">
                      ({serviceProfile.reviews.length})
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-gray-500 italic">Nicio recenzie încă</span>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                document.getElementById('review-section')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            >
              Vezi recenziile
            </Button>
          </div>
        </div>
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
          username={username} // Adaugă username-ul ca prop
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
        <div className="mt-8" id="review-section">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Recenzii și evaluări</h2>

          {/* Mesaj de informare pentru utilizatorii care au lăsat deja o recenzie */}
          {user?.role === 'client' && hasReviewedAlready && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-700">
                Ați lăsat deja o recenzie pentru acest service. Mulțumim pentru feedback!
              </p>
            </div>
          )}

          {/* Mesaj de informare pentru utilizatorii care nu au interacționat cu service-ul */}
          {!canReview && user?.role === 'client' && acceptedOffers?.length === 0 && !hasReviewedAlready && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700">
                Pentru a lăsa o recenzie, trebuie să fi acceptat o ofertă de la acest service auto.
              </p>
            </div>
          )}

          <ReviewSection
            canReview={canReview}
            isLoading={isSubmitting}
            reviews={serviceProfile.reviews || []}
            currentUserId={user?.role === 'client' ? Number(user.id) : undefined}
            onSubmitReview={async (data) => {
              try {
                await reviewMutation.mutateAsync(data);
              } catch (error) {
                console.error('Error submitting review:', error);
                throw error;
              }
            }}
            onUpdateReview={async (id, data) => {
              try {
                const response = await apiRequest('PUT', `/api/reviews/${id}`, data);
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to update review');
                }
                queryClient.invalidateQueries(['/api/service-profile', username]);
              } catch (error) {
                console.error('Error updating review:', error);
                throw error;
              }
            }}
          />
        </div>
      </div>
    </div>
    </>
  );
}