import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Lock,
  User,
  MapPin,
  Phone,
  Building,
  ArrowLeft,
} from "lucide-react";
import RoleSelection from "./RoleSelection";
import { romanianCounties, getCitiesForCounty } from "@/lib/romaniaData";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { passwordSchema } from "@/lib/passwordValidation";

type UserRole = "client" | "service";

interface ClientFormValues {
  name: string;
  email: string;
  phone: string;
  county: string;
  city: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

interface ServiceFormValues {
  companyName: string;
  representativeName: string;
  email: string;
  phone: string;
  cui: string;
  tradeRegNumber: string;
  address: string;
  county: string;
  city: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

const clientSchema = z
  .object({
    name: z.string().min(2, {
      message: "Numele trebuie să conțină cel puțin 2 caractere.",
    }),
    email: z.string().email({
      message: "Te rugăm să introduci o adresă de email validă.",
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
    password: passwordSchema,
    confirmPassword: z.string(),
    termsAccepted: z.boolean().refine(val => val === true, {
      message: "Trebuie să accepți termenii și condițiile pentru a continua.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  });

const serviceSchema = z
  .object({
    companyName: z.string().min(2, {
      message: "Numele companiei trebuie să conțină cel puțin 2 caractere.",
    }),
    representativeName: z.string().min(2, {
      message:
        "Numele reprezentantului trebuie să conțină cel puțin 2 caractere.",
    }),
    email: z.string().email({
      message: "Te rugăm să introduci o adresă de email validă.",
    }),
    phone: z.string().min(10, {
      message: "Te rugăm să introduci un număr de telefon valid.",
    }),
    cui: z
      .string()
      .min(6, { message: "CUI trebuie să conțină minim 6 caractere." })
      .max(10, { message: "CUI nu poate depăși 10 caractere." })
      .regex(/^[0-9]+$/, { message: "CUI trebuie să conțină doar cifre." }),
    tradeRegNumber: z.string().regex(/^J[0-9]{2}\/[0-9]{1,6}\/[0-9]{4}$/, {
      message: "Format invalid. Exemplu corect: J40/1234/2025",
    }),
    address: z.string().min(5, {
      message: "Te rugăm să introduci adresa completă.",
    }),
    county: z.string().min(1, {
      message: "Te rugăm să selectezi județul.",
    }),
    city: z.string().min(1, {
      message: "Te rugăm să selectezi localitatea.",
    }),
    password: passwordSchema,
    confirmPassword: z.string(),
    termsAccepted: z.boolean().refine(val => val === true, {
      message: "Trebuie să accepți termenii și condițiile pentru a continua.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  });

interface SignupFormProps {
  onSuccess: (role: UserRole) => void;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const { toast } = useToast();

  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      county: "",
      city: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    },
  });

  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      companyName: "",
      representativeName: "",
      email: "",
      phone: "",
      cui: "",
      tradeRegNumber: "",
      address: "",
      county: "",
      city: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    },
  });

  async function onSubmit(values: ClientFormValues | ServiceFormValues) {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Step 1: Check phone number first
      const phoneCheckResponse = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: values.phone }),
      });

      if (!phoneCheckResponse.ok) {
        try {
          const error = await phoneCheckResponse.json();

          if (error?.code === "PHONE_EXISTS") {
            toast({
              variant: "destructive",
              title: "Număr de telefon indisponibil",
              description: "Acest număr de telefon este deja înregistrat. Te rugăm să folosești alt număr de telefon.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Eroare verificare număr",
              description: error?.message || "A apărut o eroare la verificarea numărului de telefon.",
            });
          }
        } catch (err) {
          toast({
            variant: "destructive",
            title: "Eroare conexiune",
            description: "Nu s-a putut verifica numărul de telefon. Te rugăm să încerci din nou.",
          });
        }

        setIsLoading(false);
        return;
      }


      // Step 2: Check email availability
      const methods = await fetchSignInMethodsForEmail(auth, values.email);
      if (methods.length > 0) {
        toast({
          variant: "destructive",
          title: "Email indisponibil",
          description:
            "Această adresă de email este deja folosită. Te rugăm să folosești altă adresă de email.",
        });
        setIsLoading(false);
        return;
      }

      // Step 3: Create Firebase account only if phone and email are available
      const { email, password } = values;
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { user: firebaseUser } = userCredential;

      try {
        // Step 4: Register user in backend
        const idToken = await firebaseUser.getIdToken(true);
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            ...values,
            role,
            firebaseUid: firebaseUser.uid,
          }),
        });

        if (!response.ok) {
          // If backend registration fails, delete the Firebase account
          await firebaseUser.delete();
          const errorData = await response.json();
          console.error("Backend registration error:", errorData); // Add logging

          if (errorData.error === "Phone number already registered") {
            toast({
              variant: "destructive",
              title: "Număr de telefon indisponibil",
              description: "Acest număr de telefon este deja înregistrat. Te rugăm să folosești alt număr de telefon.",
            });
            if (role === 'client') {
              clientForm.setError('phone', { 
                message: "Acest număr de telefon este deja înregistrat."
              });
            } else {
              serviceForm.setError('phone', { 
                message: "Acest număr de telefon este deja înregistrat."
              });
            }
            setIsLoading(false);
            return;
          }

          throw new Error(errorData.message || 'Failed to register user');
        }

        // Step 5: Only send verification email after successful registration
        await sendEmailVerification(firebaseUser);

        // Step 6: Sign in and establish session
        await signInWithEmailAndPassword(auth, email, password);
        const newIdToken = await firebaseUser.getIdToken(true);

        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newIdToken}`,
          },
          credentials: "include",
        });

        if (!loginResponse.ok) {
          const error = await loginResponse.json();
          throw new Error(error.message || "Failed to establish session");
        }

        toast({
          title: "Cont creat cu succes",
          description:
            "Te rugăm să verifici email-ul pentru a confirma adresa.",
        });

        if (role) {
          onSuccess(role);
        }
      } catch (error: any) {
        // Clean up Firebase account if anything fails after creation
        await firebaseUser.delete();
        console.error("Error after Firebase account creation:", error);
        toast({
          variant: "destructive",
          title: "Eroare",
          description:
            error.message || "A apărut o eroare. Te rugăm să încerci din nou.",
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);

      // Handle phone number error
      if (error.message?.includes('telefon') || error.message?.includes('phone')) {
        toast({
          variant: "destructive",
          title: "Număr de telefon indisponibil",
          description: error.message || "Acest număr de telefon este deja înregistrat. Te rugăm să folosești alt număr de telefon.",
        });
        if (role === 'client') {
          clientForm.setError('phone', { 
            message: error.message || "Acest număr de telefon este deja înregistrat."
          });
        } else {
          serviceForm.setError('phone', { 
            message: error.message || "Acest număr de telefon este deja înregistrat."
          });
        }
      } else if (error.code === "auth/email-already-in-use") {
        toast({
          variant: "destructive",
          title: "Email indisponibil",
          description: "Această adresă de email este deja folosită. Te rugăm să folosești altă adresă de email.",
        });
      } else {
        console.error("Detailed error:", error);
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "A apărut o eroare la înregistrare. Te rugăm să încerci din nou.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (!role) {
    return (
      <RoleSelection
        onSelect={(selectedRole: UserRole) => setRole(selectedRole)}
      />
    );
  }

  const renderClientForm = () => (
    <Form {...clientForm}>
      <form onSubmit={clientForm.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={clientForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="name"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Nume
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      {...field}
                      placeholder="Ion Popescu"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={clientForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="email"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Email
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      {...field}
                      type="email"
                      placeholder="email@example.com"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={clientForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="phone"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Telefon
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone"
                      {...field}
                      placeholder="0712 345 678"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={clientForm.control}
            name="county"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="county"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Județ
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedCounty(value);
                    clientForm.setValue("city", "");
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
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={clientForm.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="city"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Localitate
                </FormLabel>
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
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={clientForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="password"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Parolă
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      {...field}
                      type="password"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={clientForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="confirmPassword"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Confirmă parola
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      {...field}
                      type="password"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-4 mb-2">
          <FormField
            control={clientForm.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 border">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Am citit și sunt de acord cu{" "}
                    <a
                      href="/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00aff5] hover:underline"
                    >
                      termenii și condițiile
                    </a>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col items-center space-y-4 pt-6">
          <Button
            type="submit"
            className="w-full max-w-md h-12 sm:h-10 text-base sm:text-sm bg-[#00aff5] hover:bg-[#0099d6] transition-colors duration-300"
            disabled={isLoading}
          >
            {isLoading ? "Se încarcă..." : "Creează cont"}
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderServiceForm = () => (
    <Form {...serviceForm}>
      <form onSubmit={serviceForm.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={serviceForm.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="companyName"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Nume companie
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="companyName"
                      {...field}
                      placeholder="Auto Service SRL"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="representativeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="representativeName"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Nume reprezentant
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="representativeName"
                      {...field}
                      placeholder="Ion Popescu"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="email"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Email
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      {...field}
                      type="email"
                      placeholder="service@example.com"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="phone"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Telefon
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone"
                      {...field}
                      placeholder="0712 345 678"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="cui"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="cui"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  CUI
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="cui"
                      {...field}
                      placeholder="12345678"
                      className="h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="tradeRegNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="tradeRegNumber"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Nr. Reg. Comerțului
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="tradeRegNumber"
                      {...field}
                      placeholder="J40/1234/2025"
                      className="h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="address"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Adresa
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="address"
                      {...field}
                      placeholder="Str. Exemplu, Nr. 123"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="county"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="county"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Județ
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedCounty(value);
                    serviceForm.setValue("city", "");
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
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="city"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Localitate
                </FormLabel>
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
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="password"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Parolă
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      {...field}
                      type="password"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={serviceForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="confirmPassword"
                  className="text-sm sm:text-base font-medium text-gray-700"
                >
                  Confirmă parola
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      {...field}
                      type="password"
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-4 mb-2">
          <FormField
            control={serviceForm.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 border">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Am citit și sunt de acord cu{" "}
                    <a
                      href="/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00aff5] hover:underline"
                    >
                      termenii și condițiile
                    </a>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col items-center space-y-4 pt-6">
          <Button
            type="submit"
            className="w-full max-w-md h-12 sm:h-10 text-base sm:text-sm bg-[#00aff5] hover:bg-[#0099d6] transition-colors duration-300"
            disabled={isLoading}
          >
            {isLoading ? "Se încarcă..." : "Creează cont"}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="w-full max-w-4xl space-y-6 p-4 sm:p-6 bg-white rounded-lg shadow-lg relative max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
      <Button
        variant="ghost"
        className="p-0 h-auto absolute top-4 left-4"
        onClick={() => setRole(null)}
      >
        <ArrowLeft className="h-5 w-5 mr-1" />
        <span className="text-sm">Înapoi</span>
      </Button>

      <div className="text-center mb-6 pt-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          {role === "client"
            ? "Înregistrare client"
            : "Înregistrare service auto"}
        </h2>
        <p className="text-sm sm:text-base text-gray-500 mt-2">
          Completează formularul pentru a crea un cont
        </p>
      </div>

      {role === "client" ? renderClientForm() : renderServiceForm()}
    </div>
  );
}