import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Lista de adrese email cu rol de admin
const ADMIN_EMAILS = ['nikelino6@yahoo.com'];

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Verifică dacă utilizatorul este deja autentificat
  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      if (user && ADMIN_EMAILS.includes(user.email || '')) {
        setLocation('/admin/dashboard');
      }
    };
    
    checkAuth();
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Vă rugăm să completați toate câmpurile.',
      });
      return;
    }
    
    // Verifică dacă email-ul are permisiuni de admin
    if (!ADMIN_EMAILS.includes(email)) {
      toast({
        variant: 'destructive',
        title: 'Acces restricționat',
        description: 'Nu aveți drepturi de administrator.',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: 'Autentificare reușită',
        description: 'Bine ați venit în dashboard-ul de administrare.',
      });
      
      setLocation('/admin/dashboard');
    } catch (error) {
      console.error('Eroare la autentificare:', error);
      
      toast({
        variant: 'destructive',
        title: 'Eroare la autentificare',
        description: 'Email sau parolă incorectă. Vă rugăm să încercați din nou.',
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Se procesează...' : 'Autentificare'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;