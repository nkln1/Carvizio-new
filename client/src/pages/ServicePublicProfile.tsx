import React from "react";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Building2, MapPin, Phone, Mail, Clock, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ServicePublicProfileProps {
  params: {
    slug: string;
  };
}

const ServicePublicProfile: React.FC<ServicePublicProfileProps> = ({ params }) => {
  const { slug } = params;
  const { user } = useAuth();
  const { toast } = useToast();

  // Format the service name from the slug
  const serviceName = decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // Mock service data
  const serviceData = {
    id: "1",
    userId: "service-owner-id", // Replace with actual owner ID if needed
    companyName: serviceName,
    email: `contact@${slug.toLowerCase().replace(/-/g, '')}.ro`,
    phone: "0712 345 678",
    address: "Strada Exemplu 123",
    city: "București",
    county: "București"
  };

  // Working hours
  const workingHours = {
    monday: "09:00-18:00",
    tuesday: "09:00-18:00",
    wednesday: "09:00-18:00",
    thursday: "09:00-18:00",
    friday: "09:00-18:00",
    saturday: "09:00-14:00",
    sunday: "Închis"
  };

  // Mock ratings
  const ratings = [
    {
      id: "1",
      rating: 5,
      review: "Serviciu excelent, recomand cu încredere!",
      clientName: "Alexandru P.",
      date: "12.02.2023"
    },
    {
      id: "2",
      rating: 4,
      review: "Bună colaborare, preț corect.",
      clientName: "Mihai D.",
      date: "23.01.2023"
    }
  ];

  // Calculate average rating
  const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  const handleGoBack = () => {
    if (user) {
      window.location.href = "/service-dashboard";
    } else {
      window.location.href = "/";
    }
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4" />
            {user ? "Înapoi la dashboard" : "Înapoi la pagina principală"}
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00aff5]">
                <Building2 className="h-6 w-6" />
                {serviceData.companyName}
              </CardTitle>
              <CardDescription>Service Auto Autorizat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{serviceData.address}, {serviceData.city}, {serviceData.county}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{serviceData.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>{serviceData.email}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    Program de funcționare
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(workingHours).map(([day, hours]) => (
                      <div
                        key={day}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="capitalize">{day}:</span>
                        <span>{hours}</span>
                      </div>
                    ))}
                  </div>
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
                Recenzii ({ratings.length})
              </CardTitle>
              <CardDescription>
                Media: {averageRating.toFixed(1)} din 5
                {renderStars(Math.round(averageRating))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ratings.map(rating => (
                  <div key={rating.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        {renderStars(rating.rating)}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{rating.clientName}</span>
                          <span className="text-sm text-gray-600">{rating.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700">{rating.review}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ServicePublicProfile;