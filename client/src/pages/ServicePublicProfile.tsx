
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const ServicePublicProfile = () => {
  const { username } = useParams();

  const { data, error, isLoading } = useQuery(
    ['service-profile', username],
    () => apiRequest('GET', `/api/auth/service-profile/${username}`),
    { enabled: !!username }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Eroare la încărcarea profilului</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Nu există date pentru acest service.</div>
      </div>
    );
  }

  const getDayName = (day: string) => {
    const days = {
      '1': 'Luni',
      '2': 'Marți',
      '3': 'Miercuri',
      '4': 'Joi',
      '5': 'Vineri',
      '6': 'Sâmbătă',
      '7': 'Duminică'
    };
    return days[day] || day;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Company Info */}
          <div className="border-b pb-6">
            <h1 className="text-2xl font-semibold text-[#00aff5] mb-4">{data.companyName}</h1>
            <p className="text-gray-600">Reprezentant: {data.representativeName}</p>
            <p className="text-gray-600">Telefon: {data.phone}</p>
            <p className="text-gray-600">
              Adresa: {data.address}, {data.city}, {data.county}
            </p>
          </div>

          {/* Working Hours */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Program de lucru</h2>
            <div className="space-y-2">
              {data.workingHours?.length > 0 ? (
                data.workingHours.map((wh) => (
                  <div key={wh.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="font-medium">{getDayName(wh.dayOfWeek)}</span>
                    <span className="text-gray-600">
                      {wh.isClosed ? 'Închis' : `${wh.openTime} - ${wh.closeTime}`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Programul de lucru nu este disponibil</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePublicProfile;
