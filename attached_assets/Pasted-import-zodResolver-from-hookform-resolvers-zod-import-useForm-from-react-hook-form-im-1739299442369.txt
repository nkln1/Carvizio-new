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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Numele trebuie să conțină cel puțin 2 caractere.",
  }),
  email: z.string().email({
    message: "Te rugăm să introduci o adresă de email validă.",
  }),
  phone: z.string().min(10, {
    message: "Te rugăm să introduci un număr de telefon valid.",
  }),
  message: z.string().min(10, {
    message: "Mesajul trebuie să conțină cel puțin 10 caractere.",
  }),
});

export default function Contact() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // Here we will implement the form submission logic later
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-4 sm:mb-8">
            Contactează-ne
          </h1>
          <p className="text-base sm:text-lg text-gray-600 text-center mb-8 sm:mb-12 font-sans">
            Ai întrebări sau sugestii? Scrie-ne un mesaj și îți vom răspunde cât
            mai curând posibil.
          </p>

          <div className="bg-white shadow-xl rounded-lg p-4 sm:p-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 sm:space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume și Prenume</FormLabel>
                      <FormControl>
                        <Input placeholder="Andrei Cătălin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="catalin@example.com"
                          {...field}
                        />
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
                        <Input type="tel" placeholder="0712345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mesaj</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Scrie mesajul tău aici..."
                          className="min-h-[120px] sm:min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-[#00aff5] hover:bg-[#0099d6] transition-colors duration-200"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Trimite Mesajul
                </Button>
              </form>
            </Form>
          </div>

          <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="flex items-center justify-center sm:justify-start space-x-4 text-gray-600 p-4 bg-white rounded-lg shadow-md">
              <Mail className="h-6 w-6 text-[#00aff5]" />
              <span className="font-sans">contact@carvizio.com</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-4 text-gray-600 p-4 bg-white rounded-lg shadow-md">
              <Phone className="h-6 w-6 text-[#00aff5]" />
              <span className="font-sans">0712 345 678</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}