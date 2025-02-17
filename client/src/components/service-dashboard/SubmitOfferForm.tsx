import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const offerSchema = z.object({
  price: z.string().min(1, "Prețul este obligatoriu"),
  description: z.string().min(10, "Descrierea trebuie să conțină cel puțin 10 caractere"),
  availability: z.string().min(1, "Disponibilitatea este obligatorie"),
});

type OfferFormValues = z.infer<typeof offerSchema>;

interface SubmitOfferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: OfferFormValues) => Promise<void>;
  request: any;
}

export function SubmitOfferForm({ isOpen, onClose, onSubmit, request }: SubmitOfferFormProps) {
  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      price: "",
      description: "",
      availability: "",
    },
  });

  const handleSubmit = async (values: OfferFormValues) => {
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error submitting offer:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Trimite Ofertă</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preț (RON)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descriere Servicii</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrieți serviciile incluse în ofertă..."
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
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disponibilitate</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Luni-Vineri, 9:00-17:00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Anulează
              </Button>
              <Button type="submit">
                Trimite Oferta
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
