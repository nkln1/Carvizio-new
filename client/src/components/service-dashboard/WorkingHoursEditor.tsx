import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import type { WorkingHour } from "@shared/schema";

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const workingHourSchema = z.object({
  openTime: z.string().regex(timeRegex, "Format invalid. Folosiți HH:MM"),
  closeTime: z.string().regex(timeRegex, "Format invalid. Folosiți HH:MM"),
  isClosed: z.boolean(),
});

type WorkingHourFormValues = z.infer<typeof workingHourSchema>;

interface WorkingHoursEditorProps {
  schedule: WorkingHour;
  onCancel: () => void;
}

export function WorkingHoursEditor({ schedule, onCancel }: WorkingHoursEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<WorkingHourFormValues>({
    resolver: zodResolver(workingHourSchema),
    defaultValues: {
      openTime: schedule.openTime || "09:00",
      closeTime: schedule.closeTime || "17:00",
      isClosed: schedule.isClosed || false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: WorkingHourFormValues) => {
      // Construim obiectul pentru update, incluzând și dayOfWeek
      const updateData = {
        ...values,
        dayOfWeek: schedule.dayOfWeek
      };

      const response = await apiRequest(
        "PUT", // Folosim PUT în loc de PATCH pentru înlocuire completă
        `/api/service/working-hours/${schedule.dayOfWeek}`, // Folosim dayOfWeek ca identificator
        updateData
      );

      if (!response.ok) {
        throw new Error('Failed to update working hours');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service/working-hours"] });
      toast({
        title: "Program actualizat",
        description: "Programul de funcționare a fost actualizat cu succes.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu am putut actualiza programul. Încercați din nou.",
      });
    },
  });

  async function onSubmit(values: WorkingHourFormValues) {
    mutation.mutate(values);
  }

  if (!isEditing) {
    return (
      <div className="flex justify-between items-center py-2">
        <span className="font-medium">
          {schedule.isClosed
            ? "Închis"
            : `${schedule.openTime}-${schedule.closeTime}`}
        </span>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          Modifică
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <FormField
            control={form.control}
            name="isClosed"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormLabel>Închis:</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {!form.watch("isClosed") && (
          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="openTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deschidere:</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="09:00" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closeTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Închidere:</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="17:00" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
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