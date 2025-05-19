import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWithCsrf, refreshCsrfToken } from '@/lib/csrfToken';

// Schema pentru validarea formularului de login admin
const loginSchema = z.object({
  username: z.string().min(3, "Numele de utilizator trebuie să aibă minim 3 caractere"),
  password: z.string().min(6, "Parola trebuie să aibă minim 6 caractere"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const AdminLogin: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Configurare formular
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Verifică dacă există sesiune activă de admin
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/check-session', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include' // Important pentru sesiune
        });
        
        const data = await response.json();
        
        if (data.authenticated) {
          console.log('Sesiune admin validă detectată');
          setLocation('/admin/dashboard');
        }
      } catch (error) {
        console.error('Eroare la verificarea sesiunii:', error);
      }
    };
    
    checkAdminSession();
  }, [setLocation]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      // Asigurăm că avem un token CSRF proaspăt
      await refreshCsrfToken();
      
      // Folosim fetchWithCsrf pentru a include automat token-ul CSRF în cerere
      const response = await fetchWithCsrf('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Eroare la autentificare');
      }
      
      toast({
        title: 'Autentificare reușită',
        description: 'Bine ați venit în dashboard-ul de administrare.',
      });
      
      // Stocăm informații despre admin în localStorage
      localStorage.setItem('adminId', data.admin.id);
      localStorage.setItem('adminUsername', data.admin.username);
      
      setLocation('/admin/dashboard');
    } catch (error) {
      console.error('Eroare la autentificare:', error);
      
      toast({
        variant: 'destructive',
        title: 'Eroare la autentificare',
        description: error instanceof Error ? error.message : 'Nume de utilizator sau parolă incorecte.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Autentificare Administrator</CardTitle>
          <CardDescription className="text-center">
            Introduceți datele pentru a accesa dashboard-ul de administrare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nume utilizator</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="username_admin" 
                        {...field} 
                        disabled={isLoading}
                      />
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
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Se procesează...' : 'Autentificare'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;