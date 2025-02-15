import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ServiceOffer {
  id: number;
  serviceId: string;
  serviceName: string;
  price: number;
  availability: string;
  description: string;
}

interface OffersTabProps {
  offers: ServiceOffer[];
}

export function OffersTab({ offers }: OffersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Oferte Primite</CardTitle>
      </CardHeader>
      <CardContent>
        {offers.length > 0 ? (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-[#00aff5] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{offer.serviceName}</p>
                    <p className="text-sm text-gray-600">{offer.description}</p>
                    <p className="text-sm text-gray-500">
                      Disponibil: {offer.availability}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#00aff5]">{offer.price} RON</p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        console.log("Accepted offer:", offer.id);
                      }}
                    >
                      Acceptă Oferta
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-6">
            Nu aveți oferte în acest moment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
