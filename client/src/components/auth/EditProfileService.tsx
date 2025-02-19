import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, ServiceProviderUser, isServiceProviderUser } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { romanianCounties, getCitiesForCounty } from "@/lib/romaniaData";
import * as z from "zod";

const editServiceProfileSchema = z.object({
  phone: z.string().min(10, {
    message: "Te rugăm să introduci un număr de telefon valid.",
  }),
  county: z.string().min(1, {
    message: "Te rugăm să selectezi județul.",
  }),
  city: z.string().min(1, {
    message: "Te rugăm să selectezi localitatea.",
  }),
  address: z.string().min(1, {
    message: "Te rugăm să introduci adresa service-ului.",
  }),
  companyName: z.string().min(1, {
    message: "Te rugăm să introduci numele companiei.",
  }),
  representativeName: z.string().min(1, {
    message: "Te rugăm să introduci numele reprezentantului.",
  }),
});

type EditServiceProfileFormValues = z.infer<typeof editServiceProfileSchema>;

interface EditProfileServiceProps {
  user: User;
  onCancel: () => void;
}

export function EditProfileService({ user, onCancel }: EditProfileServiceProps) {
  if (!isServiceProviderUser(user)) {
    throw new Error("EditProfileService can only be used with service provider users");
  }

  const [selectedCounty, setSelectedCounty] = useState(user.county || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditServiceProfileFormValues>({
    resolver: zodResolver(editServiceProfileSchema),
    defaultValues: {
      phone: user.phone || "",
      county: user.county || "",
      city: user.city || "",
      address: user.address || "",
      companyName: user.companyName || "",
      representativeName: user.representativeName || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: EditServiceProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Profil actualizat",
        description: "Datele service-ului au fost salvate cu succes.",
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu am putut actualiza profilul. Te rugăm să încerci din nou.",
      });
    },
  });

  async function onSubmit(values: EditServiceProfileFormValues) {
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon</FormLabel>
              <FormControl>
                <Input {...field} placeholder="0712 345 678" />
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
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedCounty(value);
                  form.setValue("city", "");
                }}
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
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Localitate</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!selectedCounty}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează localitatea" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {selectedCounty &&
                    getCitiesForCounty(selectedCounty).map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
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
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresă Service</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Strada, Număr, Bloc, etc." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nume Companie</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Numele companiei" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="representativeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nume Reprezentant</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Numele reprezentantului legal" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            Anulează
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Se salvează..." : "Salvează"}
          </Button>
        </div>
      </form>
    </Form>
  );
}