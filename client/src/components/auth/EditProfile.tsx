import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@shared/schema";
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

const editProfileSchema = z.object({
  name: z.string().min(2, {
    message: "Numele trebuie să conțină cel puțin 2 caractere.",
  }),
  phone: z.string().min(10, {
    message: "Te rugăm să introduci un număr de telefon valid.",
  }),
  county: z.string().min(1, {
    message: "Te rugăm să selectezi județul.",
  }),
  city: z.string().min(1, {
    message: "Te rugăm să selectezi localitatea.",
  }),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

interface EditProfileProps {
  user: User;
  onCancel: () => void;
}

export function EditProfile({ user, onCancel }: EditProfileProps) {
  const [selectedCounty, setSelectedCounty] = useState(user.county || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      county: user.county || "",
      city: user.city || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: EditProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Profil actualizat",
        description: "Datele tale au fost salvate cu succes.",
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

  async function onSubmit(values: EditProfileFormValues) {
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nume și Prenume</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ion Popescu" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
