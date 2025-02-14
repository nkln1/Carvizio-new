import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Car, Plus } from "lucide-react";
import { romanianCounties, getCitiesForCounty } from "@/lib/romaniaData";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import type { Car as CarType } from "@/pages/dashboard/CarManagement";
import { Checkbox } from "@/components/ui/checkbox";

// Get today's date in YYYY-MM-DD format
const today = new Date();
today.setHours(0, 0, 0, 0);
const formattedToday = today.toISOString().split("T")[0];

const formSchema = z.object({
  title: z.string().min(3, {
    message: "Titlul trebuie să conțină cel puțin 3 caractere.",
  }),
  description: z.string().min(10, {
    message: "Descrierea trebuie să conțină cel puțin 10 caractere.",
  }),
  carId: z.string({
    required_error: "Te rugăm să selectezi o mașină.",
  }),
  preferredDate: z
    .string()
    .min(1, {
      message: "Te rugăm să selectezi o dată preferată.",
    })
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        return selectedDate >= today;
      },
      {
        message: "Data preferată nu poate fi anterioară datei curente.",
      },
    ),
  county: z.string().min(1, {
    message: "Te rugăm să selectezi județul.",
  }),
  cities: z
    .array(z.string())
    .min(1, {
      message: "Te rugăm să selectezi cel puțin o localitate.",
    })
    .max(2, {
      message: "Poți selecta maxim 2 localități.",
    }),
});

interface RequestFormProps {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
  onAddCar: (currentFormData: z.infer<typeof formSchema>) => void;
  initialData?: Partial<z.infer<typeof formSchema>>;
}

export function RequestForm({
  onSubmit,
  onCancel,
  onAddCar,
  initialData,
}: RequestFormProps) {
  const [cars, setCars] = useState<CarType[]>([]);
  const { user } = useAuth();
  const [selectedCounty, setSelectedCounty] = useState<string>(
    initialData?.county || "",
  );
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      carId: initialData?.carId || "",
      preferredDate: initialData?.preferredDate || formattedToday,
      county: initialData?.county || "",
      cities: initialData?.cities || [],
    },
  });

  // Watch for car selection changes
  useEffect(() => {
    const selectedCarId = form.watch("carId");
    if (selectedCarId) {
      const selectedCar = cars.find(car => car.id === selectedCarId);
      if (selectedCar) {
        // Format car details
        const carDetails = `
Detalii mașină:
- Marca: ${selectedCar.brand}
- Model: ${selectedCar.model}
- An fabricație: ${selectedCar.year}
${selectedCar.licensePlate ? `- Număr înmatriculare: ${selectedCar.licensePlate}` : ''}
${selectedCar.vin ? `- Serie șasiu (VIN): ${selectedCar.vin}` : ''}
${selectedCar.engine ? `- Motor: ${selectedCar.engine}` : ''}
${selectedCar.transmission ? `- Transmisie: ${selectedCar.transmission}` : ''}
${selectedCar.fuelType ? `- Combustibil: ${selectedCar.fuelType}` : ''}
${selectedCar.mileage ? `- Kilometraj: ${selectedCar.mileage} km` : ''}

Descriere cerere:
${form.getValues("description").split("\n\nDetalii mașină:")[0] || ""}`;

        form.setValue("description", carDetails.trim(), { shouldDirty: true });
      }
    }
  }, [form.watch("carId"), cars]);

  useEffect(() => {
    if (selectedCounty) {
      const citiesForCounty = getCitiesForCounty(selectedCounty);
      setAvailableCities(citiesForCounty);

      // Reset cities selection when county changes
      form.setValue("cities", []);
    }
  }, [selectedCounty, form]);

  useEffect(() => {
    const loadCars = async () => {
      if (!user) return;

      try {
        const carsQuery = query(
          collection(db, "cars"),
          where("userId", "==", user.uid),
        );
        const querySnapshot = await getDocs(carsQuery);
        const loadedCars: CarType[] = [];
        querySnapshot.forEach((doc) => {
          loadedCars.push({ id: doc.id, ...doc.data() } as CarType);
        });
        setCars(loadedCars);
      } catch (error) {
        console.error("Error loading cars:", error);
      }
    };

    loadCars();
  }, [user]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titlu cerere</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: Revizie anuală la 30.000 km"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="carId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selectare mașină</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selectează mașina" />
                        </SelectTrigger>
                        <SelectContent>
                          {cars.map((car) => (
                            <SelectItem key={car.id} value={car.id}>
                              {car.brand} {car.model} ({car.year})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onAddCar(form.getValues())}
                      className="whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adaugă mașină
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descriere cerere</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ex: Doresc oferta de preț revizie anuală la 30.000 km pentru o MAZDA CX5 din 2020."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data preferată</FormLabel>
                  <FormControl>
                    <Input type="date" min={formattedToday} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Județ</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCounty(value);
                      form.setValue("cities", []);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează județul" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {romanianCounties.map((county) => (
                        <SelectItem key={county} value={county}>
                          {county}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cities"
              render={() => (
                <FormItem>
                  <FormLabel>Localități (selectați maxim 2)</FormLabel>
                  <div className="space-y-2">
                    {availableCities.map((city) => (
                      <div key={city} className="flex items-center space-x-2">
                        <Checkbox
                          checked={form.watch("cities")?.includes(city)}
                          onCheckedChange={(checked) => {
                            const currentCities =
                              form.getValues("cities") || [];
                            if (checked) {
                              if (currentCities.length < 2) {
                                form.setValue("cities", [
                                  ...currentCities,
                                  city,
                                ]);
                              }
                            } else {
                              form.setValue(
                                "cities",
                                currentCities.filter((c) => c !== city),
                              );
                            }
                          }}
                          disabled={
                            !form.watch("cities")?.includes(city) &&
                            (form.watch("cities")?.length || 0) >= 3
                          }
                        />
                        <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {city}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            Anulează
          </Button>
          <Button type="submit">Trimite cererea</Button>
        </div>
      </form>
    </Form>
  );
}