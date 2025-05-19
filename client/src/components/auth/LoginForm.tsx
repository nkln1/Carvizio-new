import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { UserRole } from "@shared/schema";

// Lista de adrese email cu rol de admin
const ADMIN_EMAILS = ['nikelino6@yahoo.com'];

const formSchema = z.object({
  email: z.string().email({
    message: "Te rugăm să introduci o adresă de email validă.",
  }),
  password: z.string().min(6, {
    message: "Parola trebuie să conțină cel puțin 6 caractere.",
  }),
});

interface LoginFormProps {
  onSuccess?: (role: UserRole) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      // Verifică dacă emailul este în lista de administratori
      const isAdmin = ADMIN_EMAILS.includes(values.email.toLowerCase());

      // Dacă este admin, redirecționează direct către pagina de login admin
      // Aceasta va verifica apoi autentificarea din nou și va face redirecționarea finală
      if (isAdmin) {
        console.log("Admin login detected:", values.email);
        
        toast({
          title: "Autentificare reușită",
          description: "Te redirecționăm către panoul de administrare...",
        });
        
        // Redirecționăm către pagina de login admin, care va verifica autentificarea
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 1000);
        
        setIsLoading(false);
        return;
      }

      // Get the Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // Call our backend to create session
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with backend');
      }

      const userData = await response.json();
      const userRole = userData.role as UserRole;

      toast({
        title: "Success",
        description: "Te-ai conectat cu succes!",
      });

      // Handle redirect based on role immediately
      if (userRole === "client") {
        setLocation("/dashboard");
      } else if (userRole === "service") {
        setLocation("/service-dashboard");
      }

      // Notify parent component if needed
      onSuccess?.(userRole);

    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Email sau parolă incorectă.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handlePasswordReset = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Te rugăm să introduci adresa de email pentru resetarea parolei.",
      });
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Email trimis",
        description: "Verifică-ți email-ul pentru instrucțiuni de resetare a parolei.",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = "A apărut o eroare la trimiterea email-ului de resetare.";

      // Customize error message based on Firebase error codes
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Nu există niciun cont asociat cu acest email.";
      }

      toast({
        variant: "destructive",
        title: "Eroare",
        description: errorMessage,
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-lg">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Intră în cont</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      {...field}
                      type="email"
                      placeholder="nume@example.com"
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parolă</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      {...field}
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Se încarcă..." : "Conectare"}
          </Button>
        </form>
      </Form>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="link"
          className="text-sm text-[#00aff5] hover:text-[#0099d6]"
          onClick={handlePasswordReset}
          disabled={isSendingReset}
        >
          {isSendingReset ? "Se trimite..." : "Mi-am uitat parola"}
        </Button>
      </div>
    </div>
  );
}