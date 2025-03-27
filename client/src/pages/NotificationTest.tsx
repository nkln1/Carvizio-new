import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Info, XCircle, Bell } from 'lucide-react';
import useNotifications from '@/hooks/useNotifications';

export default function NotificationTest() {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'neînregistrat' | 'în așteptare' | 'activ'>('neînregistrat');
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const { requestPermission } = useNotifications();

  // Verificăm suportul pentru Service Workers și notificări la încărcarea componentei
  useEffect(() => {
    // Verificare suport Service Worker
    const isServiceWorkerSupported = 'serviceWorker' in navigator;
    setServiceWorkerSupported(isServiceWorkerSupported);

    // Verificare suport notificări
    const isNotificationSupported = 'Notification' in window;
    setNotificationSupported(isNotificationSupported);

    // Verificare permisiune notificări
    if (isNotificationSupported) {
      setNotificationPermission(Notification.permission);
    }

    // Verificare status Service Worker
    if (isServiceWorkerSupported && navigator.serviceWorker.controller) {
      setServiceWorkerStatus('activ');
    }
  }, []);

  // Funcție pentru a solicita permisiunea de notificări
  const requestNotificationPermission = async () => {
    try {
      const permission = await requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error('Eroare la solicitarea permisiunii:', error);
      setTestResult({
        success: false,
        message: `Eroare la solicitarea permisiunii: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // Funcție pentru înregistrarea manuală a Service Worker-ului
  const registerServiceWorker = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker nu este suportat de acest browser');
      }

      setServiceWorkerStatus('în așteptare');

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      if (registration.installing) {
        // Service Worker se instalează
        setServiceWorkerStatus('în așteptare');
      } else if (registration.waiting) {
        // Service Worker este instalat și așteaptă activarea
        setServiceWorkerStatus('în așteptare');
      } else if (registration.active) {
        // Service Worker este activ
        setServiceWorkerStatus('activ');
      }

      setTestResult({
        success: true,
        message: `Service Worker înregistrat cu succes. Scope: ${registration.scope}`
      });
    } catch (error) {
      console.error('Eroare la înregistrarea Service Worker:', error);
      setTestResult({
        success: false,
        message: `Eroare la înregistrarea Service Worker: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // Funcție de testare pentru a verifica dacă Service Worker este încărcat corect
  const testServiceWorkerMimeType = async () => {
    try {
      const response = await fetch('/sw.js');
      const contentType = response.headers.get('Content-Type');

      setTestResult({
        success: contentType?.includes('javascript') || false,
        message: `Content-Type pentru Service Worker: ${contentType || 'necunoscut'}`
      });
    } catch (error) {
      console.error('Eroare la testarea MIME Type pentru Service Worker:', error);
      setTestResult({
        success: false,
        message: `Eroare la testarea MIME Type: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // Funcția pentru a trimite o notificare de test
  const sendTestNotification = async () => {
    try {
      if (!('Notification' in window)) {
        throw new Error('Notificările nu sunt suportate de acest browser');
      }

      if (Notification.permission !== 'granted') {
        throw new Error('Permisiunea pentru notificări nu a fost acordată');
      }

      // Verificăm dacă avem acces la funcția globală
      if (typeof window.showNotificationViaSW !== 'function') {
        throw new Error('Funcția de notificare prin Service Worker nu este disponibilă');
      }

      // Trimitem notificarea prin Service Worker
      const result = await window.showNotificationViaSW('Test Notificare', {
        body: 'Aceasta este o notificare de test trimisă prin Service Worker.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: true,
        data: {
          url: '/notification-test',
          testId: Date.now()
        }
      });

      setTestResult({
        success: true,
        message: `Notificare trimisă cu succes: ${JSON.stringify(result)}`
      });
    } catch (error) {
      console.error('Eroare la trimiterea notificării de test:', error);
      setTestResult({
        success: false,
        message: `Eroare la trimiterea notificării: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // Funcție pentru a începe verificarea de mesaje în background
  const startBackgroundMessagesCheck = async () => {
    try {
      // Verificăm dacă funcția globală există
      if (typeof window.startBackgroundMessageCheck !== 'function') {
        throw new Error('Funcția de verificare a mesajelor în fundal nu este disponibilă');
      }

      // Simulăm un utilizator logat pentru test
      const testUserOptions = {
        userId: 1,
        userRole: 'client',
        token: 'test-token',
        interval: 10000 // 10 secunde între verificări
      };

      const result = await window.startBackgroundMessageCheck(testUserOptions);

      setTestResult({
        success: true,
        message: `Verificare mesaje în fundal pornită: ${JSON.stringify(result)}`
      });
    } catch (error) {
      console.error('Eroare la pornirea verificării mesajelor în fundal:', error);
      setTestResult({
        success: false,
        message: `Eroare la pornirea verificării: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // Funcție pentru a opri verificarea de mesaje în background
  const stopBackgroundMessagesCheck = async () => {
    try {
      // Verificăm dacă funcția globală există
      if (typeof window.stopBackgroundMessageCheck !== 'function') {
        throw new Error('Funcția de oprire a verificării mesajelor nu este disponibilă');
      }

      const result = await window.stopBackgroundMessageCheck();

      setTestResult({
        success: true,
        message: `Verificare mesaje în fundal oprită: ${JSON.stringify(result)}`
      });
    } catch (error) {
      console.error('Eroare la oprirea verificării mesajelor în fundal:', error);
      setTestResult({
        success: false,
        message: `Eroare la oprirea verificării: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Testare Notificări și Service Worker</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Sistem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Suport Service Worker:</span>
              <span className="flex items-center gap-2">
                {serviceWorkerSupported ? 
                  <><Check className="h-5 w-5 text-green-500" /> Suportat</> : 
                  <><XCircle className="h-5 w-5 text-red-500" /> Nesuportat</>}
              </span>
            </div>

            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Suport Notificări:</span>
              <span className="flex items-center gap-2">
                {notificationSupported ? 
                  <><Check className="h-5 w-5 text-green-500" /> Suportat</> : 
                  <><XCircle className="h-5 w-5 text-red-500" /> Nesuportat</>}
              </span>
            </div>

            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Status Service Worker:</span>
              <span className="flex items-center gap-2">
                {serviceWorkerStatus === "activ" ? 
                  <><Check className="h-5 w-5 text-green-500" /> {serviceWorkerStatus}</> : 
                  <><Info className="h-5 w-5 text-blue-500" /> {serviceWorkerStatus}</>}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Permisiune notificări:</span>
              <span className="flex items-center gap-2">
                {notificationPermission === "granted" ? 
                  <><Check className="h-5 w-5 text-green-500" /> Acordată</> : 
                  notificationPermission === "denied" ?
                  <><XCircle className="h-5 w-5 text-red-500" /> Refuzată</> :
                  <><Info className="h-5 w-5 text-blue-500" /> Neprecizată</>}
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3">
            <Button 
              onClick={requestNotificationPermission} 
              disabled={!notificationSupported || notificationPermission === "granted"}
              variant="default"
            >
              Solicită permisiunea pentru notificări
            </Button>

            <Button 
              onClick={testServiceWorkerMimeType} 
              variant="outline"
            >
              Testează MIME Type Service Worker
            </Button>

            {serviceWorkerSupported && serviceWorkerStatus !== "activ" && (
              <Button 
                onClick={registerServiceWorker} 
                variant="secondary"
              >
                Înregistrează Service Worker
              </Button>
            )}
          </CardFooter>
        </Card>

        <Tabs defaultValue="notifications">
          <TabsList className="mb-4">
            <TabsTrigger value="notifications">Notificări</TabsTrigger>
            <TabsTrigger value="background">Verificare Mesaje</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Testare Notificări</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Această secțiune permite testarea funcționalității de notificări prin Service Worker.
                  Asigurați-vă că Service Worker-ul este activ și permisiunea pentru notificări a fost acordată.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={sendTestNotification}
                  disabled={!serviceWorkerSupported || serviceWorkerStatus !== "activ" || notificationPermission !== "granted"}
                  className="flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Trimite notificare de test
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="background">
            <Card>
              <CardHeader>
                <CardTitle>Verificare Mesaje în Fundal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Această secțiune permite testarea funcționalității de verificare periodică a mesajelor noi în fundal.
                  Acest test va simula un utilizator logat pentru a verifica funcționarea corectă a Service Worker-ului.
                </p>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button 
                  onClick={startBackgroundMessagesCheck}
                  disabled={!serviceWorkerSupported || serviceWorkerStatus !== "activ"}
                  variant="default"
                >
                  Pornește verificare
                </Button>

                <Button 
                  onClick={stopBackgroundMessagesCheck}
                  disabled={!serviceWorkerSupported || serviceWorkerStatus !== "activ"}
                  variant="outline"
                >
                  Oprește verificare
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        {testResult && (
          <Card className={testResult.success ? "border-green-300" : "border-red-300"}>
            <CardHeader>
              <CardTitle className={testResult.success ? "text-green-600" : "text-red-600"}>
                {testResult.success ? "Operație reușită" : "Eroare"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{testResult.message}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Declarăm tipurile pentru funcțiile globale adăugate de script-ul inline din index.html
declare global {
  interface Window {
    showNotificationViaSW: (title: string, options?: NotificationOptions) => Promise<any>;
    startBackgroundMessageCheck: (options: any) => Promise<any>;
    stopBackgroundMessageCheck: () => Promise<any>;
    swRegistration?: ServiceWorkerRegistration;
    firebase?: any;
  }
}