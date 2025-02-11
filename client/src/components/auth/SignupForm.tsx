import { useState, createContext, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, MapPin, Phone, Building, ArrowLeft } from "lucide-react";
import RoleSelection from "./RoleSelection";
import { romanianCounties, getCitiesForCounty } from "@/lib/romaniaData";
import { useLocation } from "wouter";

type AuthContextType = {
  user: any;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, login: () => {}, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

const clientSchema = z.object({
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
  password: z.string().min(6, {
    message: "Parola trebuie să conțină cel puțin 6 caractere.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Parolele nu coincid",
  path: ["confirmPassword"],
});

const serviceSchema = z.object({
  companyName: z.string().min(2, {
    message: "Numele companiei trebuie să conțină cel puțin 2 caractere.",
  }),
  representativeName: z.string().min(2, {
    message: "Numele reprezentantului trebuie să conțină cel puțin 2 caractere.",
  }),
  email: z.string().email({
    message: "Te rugăm să introduci o adresă de email validă.",
  }),
  phone: z.string().min(10, {
    message: "Te rugăm să introduci un număr de telefon valid.",
  }),
  cui: z.string()
    .min(6, { message: "CUI trebuie să conțină minim 6 caractere." })
    .max(10, { message: "CUI nu poate depăși 10 caractere." })
    .regex(/^[0-9]+$/, { message: "CUI trebuie să conțină doar cifre." }),
  tradeRegNumber: z.string()
    .regex(/^J[0-9]{2}\/[0-9]{1,6}\/[0-9]{4}$/, {
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
  password: z.string().min(6, {
    message: "Parola trebuie să conțină cel puțin 6 caractere.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Parolele nu coincid",
  path: ["confirmPassword"],
});

type UserRole = "client" | "service" | null;

//const AuthContext = createContext(null);

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const clientForm = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      county: "",
      city: "",
      password: "",
      confirmPassword: "",
    },
  });

  const serviceForm = useForm<z.infer<typeof serviceSchema>>({
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
    },
  });

  async function onSubmit(values: z.infer<typeof clientSchema> | z.infer<typeof serviceSchema>) {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register user');
      }

      toast({
        title: "Success",
        description: "Cont creat cu succes! Te rugăm să verifici email-ul pentru a confirma adresa.",
      });

      if (role === "client") {
        setLocation("/dashboard");
      } else if (role === "service") {
        setLocation("/service-dashboard");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "A apărut o eroare la înregistrare. Te rugăm să încerci din nou.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!role) {
    return <RoleSelection onSelect={setRole} />;
  }

  const currentForm = role === "client" ? clientForm : serviceForm;

  return (
    <div className="w-full max-w-4xl space-y-6 p-6 bg-white rounded-lg shadow-lg relative max-h-[80vh] overflow-y-auto">
      <Button
        variant="ghost"
        className="absolute left-4 top-4 p-0 text-[#00aff5]"
        onClick={() => setRole(null)}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-[#00aff5]">
          {role === "client" ? "Înregistrare Client" : "Înregistrare Service Auto"}
        </h2>
      </div>

      <Form {...currentForm}>
        <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {role === "client" ? (
              <FormField
                control={currentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Nume și Prenume</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input {...field} placeholder="Ion Popescu" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <FormField
                  control={currentForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Nume Service</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input {...field} placeholder="Auto Service SRL" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={currentForm.control}
                  name="representativeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Nume Reprezentant</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input {...field} placeholder="Ion Popescu" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={currentForm.control}
                  name="cui"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">CUI</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input {...field} placeholder="12345678" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={currentForm.control}
                  name="tradeRegNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Nr. Înreg.</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input {...field} placeholder="J40/1234/2025" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={currentForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input {...field} type="email" placeholder="email@example.com" className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={currentForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Telefon</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input {...field} placeholder="0712 345 678" className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === "service" && (
              <FormField
                control={currentForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Adresă</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input {...field} placeholder="Strada, Număr" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={currentForm.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Județ</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCounty(value);
                      currentForm.setValue("city", "");
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
              control={currentForm.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Localitate</FormLabel>
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
              control={currentForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Parolă</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input {...field} type="password" placeholder="••••••••" className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={currentForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Confirmă Parola</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input {...field} type="password" placeholder="••••••••" className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col items-center space-y-4 pt-4">
            <Button type="submit" className="w-full max-w-md bg-[#00aff5] hover:bg-[#0099d6]" disabled={isLoading}>
              {isLoading ? "Se încarcă..." : "Creează cont"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}