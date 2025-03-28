import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bell, Check, X, Smartphone, Volume2 } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

/**
 * Pagină de test pentru notificări
 * Permite testarea notificărilor și configurarea preferințelor
 */
export default function NotificationTest() {
  const { toast } = useToast();
  const { isEnabled, enableNotifications, unreadCount } = useNotifications();
  const { isLoggedIn } = useAuth();
  const [notificationTitle, setNotificationTitle] = useState('Test Notificare');
  const [notificationBody, setNotificationBody] = useState('Acesta este un mesaj de test pentru a verifica funcționarea notificărilor.');
  const [isSending, setIsSending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Handler pentru activarea notificărilor
  const handleEnableNotifications = async () => {
    try {
      const result = await enableNotifications();
      if (result) {
        toast({
          title: 'Notificări activate',
          description: 'Vei primi notificări pentru mesaje și actualizări importante.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Eroare',
          description: 'Nu s-au putut activa notificările. Verifică permisiunile browserului.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare la activarea notificărilor.',
        variant: 'destructive',
      });
    }
  };

  // Handler pentru trimiterea unei notificări de test
  const handleSendNotification = async () => {
    if (!isEnabled) {
      toast({
        title: 'Notificări dezactivate',
        description: 'Trebuie să activezi notificările mai întâi.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // Simulăm trimiterea unei notificări (într-o implementare reală, aceasta ar veni de la server)
      // Folosim setInterval pentru a simula o întârziere
      setTimeout(() => {
        // Obținem Service Worker-ul înregistrat
        navigator.serviceWorker.ready.then(registration => {
          // Afișăm notificarea
          registration.showNotification(notificationTitle, {
            body: notificationBody,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'test-notification',
            data: {
              url: '/test-notificari',
            },
            requireInteraction: true,
            vibrate: [200, 100, 200],
            silent: !soundEnabled,
          });

          // Redăm sunetul manual dacă este activat
          if (soundEnabled) {
            try {
              const audio = new Audio('/notification-sound.mp3');
              audio.volume = 0.5;
              audio.play().catch(err => console.warn('Nu s-a putut reda sunetul:', err));
            } catch (err) {
              console.warn('Eroare la redarea sunetului:', err);
            }
          }

          toast({
            title: 'Notificare trimisă',
            description: 'Verifiază dacă ai primit notificarea.',
            variant: 'default',
          });
        });
      }, 1000);
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut trimite notificarea de test.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Test Notificări</CardTitle>
            <CardDescription>Trebuie să fii autentificat pentru a testa notificările.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Te rugăm să te autentifici pentru a accesa această pagină.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Bell className="h-6 w-6" /> Test Notificări
              </CardTitle>
              <CardDescription>
                Testează și configurează notificările browserului
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm px-2">
                {unreadCount} necitite
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <h3 className="font-semibold text-lg">Stare notificări</h3>
              <Badge variant={isEnabled ? "default" : "destructive"} className={`ml-2 ${isEnabled ? "bg-green-500 hover:bg-green-600" : ""}`}>
                {isEnabled ? "Activate" : "Dezactivate"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {isEnabled 
                ? "Notificările sunt activate. Vei primi alerte pentru mesaje și actualizări importante." 
                : "Notificările sunt dezactivate. Activează-le pentru a primi alerte pentru mesaje și actualizări importante."}
            </p>
            {!isEnabled && (
              <Button onClick={handleEnableNotifications} className="mt-2 w-full sm:w-auto">
                Activează Notificările
              </Button>
            )}
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-semibold text-lg mb-3">Trimite notificare de test</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Titlu notificare
                </label>
                <Input
                  id="title"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Titlul notificării"
                  disabled={!isEnabled}
                />
              </div>
              <div>
                <label htmlFor="body" className="block text-sm font-medium mb-1">
                  Conținut notificare
                </label>
                <Textarea
                  id="body"
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  placeholder="Conținutul notificării"
                  rows={3}
                  disabled={!isEnabled}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  disabled={!isEnabled}
                />
                <label htmlFor="sound" className="text-sm flex items-center gap-1">
                  <Volume2 className="h-4 w-4" /> Sunet notificare
                </label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground italic">
            Notă: Notificările pot fi blocate de browser sau de sistem.
          </div>
          <Button 
            onClick={handleSendNotification} 
            disabled={!isEnabled || isSending}
          >
            {isSending ? 'Se trimite...' : 'Trimite notificare test'}
          </Button>
        </CardFooter>
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Informații despre notificări</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-1">
                <Check className="h-4 w-4 text-green-500" /> Avantaje
              </h3>
              <ul className="space-y-1 text-sm list-disc pl-5">
                <li>Primești alerte pentru mesaje noi în timp real</li>
                <li>Nu ratezi nicio actualizare importantă</li>
                <li>Ești notificat chiar și când site-ul nu este deschis</li>
                <li>Notificările funcționează pe desktop și mobil</li>
              </ul>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-1">
                <Smartphone className="h-4 w-4" /> Compatibilitate
              </h3>
              <ul className="space-y-1 text-sm list-disc pl-5">
                <li>Chrome (Desktop și Android)</li>
                <li>Firefox (Desktop)</li>
                <li>Edge (Desktop)</li>
                <li>Safari (macOS și iOS - suport limitat)</li>
                <li>Alte browsere bazate pe Chromium</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}