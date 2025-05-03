import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import type { Request } from "@shared/schema";
import { useAuth } from "@/hooks/auth";

const offerFormSchema = z.object({
  title: z.string().min(1, "Titlul este obligatoriu"),
  details: z.string().min(10, "Vă rugăm să oferiți mai multe detalii despre serviciile incluse"),
  availableDates: z.array(z.date()).min(1, "Selectați cel puțin o dată disponibilă"),
  price: z.number().min(1, "Prețul trebuie să fie mai mare decât 0"),
  notes: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerFormSchema>;

interface SubmitOfferFormProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request;
  onSubmit: (values: OfferFormValues) => Promise<void>;
}

export function SubmitOfferForm({
  isOpen,
  onClose,
  request,
  onSubmit,
}: SubmitOfferFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Creăm titlul automat bazat pe cerere
  const defaultTitle = `Ofertă pentru ${request.title}`;

  // Inițializăm formularul
  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      title: defaultTitle,
      details: "",
      availableDates: [],
      price: 0,
      notes: "",
    },
  });

  // Resetăm formularul când se deschide dialogul
  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: defaultTitle, // Setăm titlul automat
        details: "",
        availableDates: [],
        price: 0,
        notes: "",
      });
    }
  }, [isOpen, request, form, defaultTitle]);

  const handleSubmit = async (values: OfferFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Format dates before submitting
      const formattedValues = {
        ...values,
        availableDates: values.availableDates.map(date => date.toISOString())
      };
      
      // Pass the formatted values to the parent component's onSubmit
      await onSubmit(formattedValues);
      onClose();
    } catch (error) {
      console.error("Error submitting offer:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite oferta. Încercați din nou.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeDate = (dateToRemove: Date) => {
    const currentDates = form.getValues("availableDates");
    form.setValue(
      "availableDates",
      currentDates.filter(
        (date) => format(date, "yyyy-MM-dd") !== format(dateToRemove, "yyyy-MM-dd")
      )
    );
  };

  // ID unic pentru descriere, pentru a rezolva avertismentul de accesibilitate
  const descriptionId = "offer-form-description";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle>Trimite Ofertă</DialogTitle>
          <DialogDescription id={descriptionId}>
            Completați detaliile ofertei pentru această cerere de service
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titlul ofertei</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      readOnly={true} // Facem câmpul readonly
                      disabled={true} // Adăugăm și disabled pentru un aspect vizual clar
                      className="bg-gray-100 cursor-not-allowed" // Stil pentru a arăta clar că este readonly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detaliere ofertă</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Această ofertă include următoarele operațiuni: schimb ulei și filtru ulei, verificare presiune anvelope și completare lichid de parbriz. Vom folosi următoarele produse: Motul 5L 5W-30, filtru ulei Mann, filtru aer Bosch."
                      className="min-h-[120px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availableDates"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date disponibile service</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                          : "Selectați datele disponibile"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={field.value}
                        onSelect={field.onChange}
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
                          onClick={() => removeDate(date)}
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
              name="price"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Preț (RON)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(Number(e.target.value))}
                      placeholder="500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observații (opțional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Oferta este valabilă 7 zile. Oferim garanție de 6 luni pentru piesele montate."
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Anulează
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se trimite...
                  </>
                ) : (
                  "Trimite oferta"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}