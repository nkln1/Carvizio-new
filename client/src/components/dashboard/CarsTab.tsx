import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Loader2 } from "lucide-react";
import type { Car as CarType } from "@shared/schema";

interface CarsTabProps {
  cars: CarType[];
  isLoading: boolean;
  onAddCar: () => void;
  onEditCar: (car: CarType) => void;
  onDeleteCar: (carId: string) => void;
}

export function CarsTab({ cars, isLoading, onAddCar, onEditCar, onDeleteCar }: CarsTabProps) {
  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mașinile Mele</h2>
        <Button onClick={onAddCar}>
          <Car className="mr-2 h-4 w-4" />
          Adaugă mașină
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#00aff5]" />
          </div>
        ) : cars.length > 0 ? (
          cars.map((car) => (
            <Card key={car.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{car.brand} {car.model}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">An:</span> {car.year}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Kilometraj:</span> {car.mileage} km
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Combustibil:</span> {car.fuelType}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Transmisie:</span> {car.transmission}
                  </p>
                  {car.vin && (
                    <p className="text-sm">
                      <span className="font-medium">VIN:</span> {car.vin}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditCar(car)}
                  >
                    Editează
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteCar(car.id.toString())}
                  >
                    Șterge
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 mb-4">Nu aveți nicio mașină înregistrată.</p>
                <div className="flex justify-center">
                  <Button onClick={onAddCar}>
                    <Car className="mr-2 h-4 w-4" />
                    Adaugă mașină
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
