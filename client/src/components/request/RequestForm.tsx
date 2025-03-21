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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CalendarIcon, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { romanianCounties, getCitiesForCounty } from "@/lib/romaniaData";
import { useQuery } from "@tanstack/react-query";
import type { Car as CarType } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

// Get today's date
const today = new Date();
today.setHours(0, 0, 0, 0);
const defaultDate = new Date();
defaultDate.setDate(defaultDate.getDate() + 1); // Add one day to current date

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
  preferredDates: z
    .array(z.date())
    .min(1, {
      message: "Te rugăm să selectezi cel puțin o dată preferată.",
    })
    .max(5, {
      message: "Poți selecta maxim 5 date preferate.",
    }),
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
  const [selectedCounty, setSelectedCounty] = useState<string>(
    initialData?.county || "",
  );
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const { data: userCars = [] } = useQuery<CarType[]>({
    queryKey: ['/api/cars'],
  });

  // Initialize form with initial data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      carId: initialData?.carId || "",
      preferredDates: initialData?.preferredDates || [defaultDate],
      county: initialData?.county || "",
      cities: initialData?.cities || [],
    },
  });

  // Load cities when county changes or form is initialized with a county
  useEffect(() => {
    if (selectedCounty) {
      const citiesForCounty = getCitiesForCounty(selectedCounty);
      setAvailableCities(citiesForCounty);
      if (!initialData?.cities || initialData.county !== selectedCounty) {
        form.setValue("cities", []);
      }
    }
  }, [selectedCounty, form, initialData]);

  // Watch for car selection changes
  useEffect(() => {
    const selectedCarId = form.watch("carId");
    if (selectedCarId) {
      const selectedCar = userCars.find(car => car.id === parseInt(selectedCarId));
      if (selectedCar) {
        const existingDescription = form.getValues("description");
        if (!existingDescription || !existingDescription.includes("Detalii mașină:")) {
          const carDetails = `
Detalii mașină:
- Marca: ${selectedCar.brand}
- Model: ${selectedCar.model}
- An fabricație: ${selectedCar.year}
${selectedCar.vin ? `- Serie șasiu (VIN): ${selectedCar.vin}` : ''}
- Motor: ${selectedCar.fuelType}
- Transmisie: ${selectedCar.transmission}
- Kilometraj: ${selectedCar.mileage} km

Descriere cerere:
${form.getValues("description").split("\n\nDetalii mașină:")[0] || ""}`;

          form.setValue("description", carDetails.trim(), { shouldDirty: true });
        }
      }
    }
  }, [form.watch("carId"), userCars]);

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
                  <FormLabel htmlFor="request-title">Titlu cerere</FormLabel>
                  <FormControl>
                    <Input
                      id="request-title"
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
                  <FormLabel htmlFor="request-car">Selectare mașină</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id="request-car" className="w-full">
                          <SelectValue placeholder="Selectează mașina" />
                        </SelectTrigger>
                        <SelectContent>
                          {userCars.map((car) => (
                            <SelectItem key={car.id} value={car.id.toString()}>
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
                  <FormLabel htmlFor="request-description">Descriere cerere</FormLabel>
                  <FormControl>
                    <Textarea
                      id="request-description"
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
              name="preferredDates"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date preferate (maxim 5)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !field.value?.length && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value?.length > 0
                          ? `${field.value.length} date selectate`
                          : "Selectați datele preferate"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={field.value}
                        onSelect={(dates) => {
                          // Limitează la maxim 5 date
                          if (Array.isArray(dates) && dates.length > 5) {
                            field.onChange(dates.slice(0, 5));
                          } else {
                            field.onChange(dates);
                          }
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value?.map((date, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="px-3 py-1"
                      >
                        {format(date, "dd.MM.yyyy", { locale: ro })}
                        <button
                          type="button"
                          className="ml-2 hover:text-destructive"
                          onClick={() => {
                            const newDates = [...field.value];
                            newDates.splice(index, 1);
                            field.onChange(newDates);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="request-county">Județ</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCounty(value);
                      if (!initialData?.cities) {
                        form.setValue("cities", []);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="request-county">
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
                    {availableCities.map((city) => {
                      const cityId = `city-${city.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        <div key={city} className="flex items-center space-x-2">
                          <Checkbox
                            id={cityId}
                            checked={form.watch("cities")?.includes(city)}
                            onCheckedChange={(checked) => {
                              const currentCities = form.getValues("cities") || [];
                              if (checked) {
                                if (currentCities.length < 2) {
                                  form.setValue("cities", [...currentCities, city]);
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
                              (form.watch("cities")?.length || 0) >= 2
                            }
                          />
                          <label
                            htmlFor={cityId}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {city}
                          </label>
                        </div>
                      );
                    })}
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