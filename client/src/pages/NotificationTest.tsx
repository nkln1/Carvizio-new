import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Bell, Check, Info, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NotificationHelper from "@/lib/notifications";

// Extindem Window pentru a adăuga proprietățile custom
declare global {
  interface Window {
    swRegistration?: ServiceWorkerRegistration;
    showNotificationViaSW?: (title: string, options?: NotificationOptions) => Promise<any>;
    startBackgroundMessageCheck?: (options: any) => Promise<any>;
    stopBackgroundMessageCheck?: () => Promise<any>;
    firebase?: any;
  }
}

export default function NotificationTest() {
  const { toast } = useToast();
  const [notificationSupported, setNotificationSupported] = useState<boolean>(false);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState<boolean>(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<string>("necunoscut");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

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

  useEffect(() => {
    // Verificare suport browser pentru notificări
    const checkNotificationSupport = () => {
      const isNotificationSupported = 'Notification' in window;
      setNotificationSupported(isNotificationSupported);
      
      if (isNotificationSupported) {
        setNotificationPermission(Notification.permission);
      }
    };
    
    // Verificare suport browser pentru Service Worker
    const checkServiceWorkerSupport = () => {
      const isServiceWorkerSupported = 'serviceWorker' in navigator;
      setServiceWorkerSupported(isServiceWorkerSupported);
      
      if (isServiceWorkerSupported && navigator.serviceWorker.controller) {
        setServiceWorkerStatus('activ');
      } else if (isServiceWorkerSupported) {
        setServiceWorkerStatus('suportat, dar inactiv');
      } else {
        setServiceWorkerStatus('nesuportat');
      }
    };
    
    checkNotificationSupport();
    checkServiceWorkerSupport();
    
    // Ascultător pentru schimbări de status Service Worker
    const onServiceWorkerControllerChange = () => {
      setServiceWorkerStatus(navigator.serviceWorker.controller ? 'activ' : 'inactiv');
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onServiceWorkerControllerChange);
    }
    
    // Cleanup
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', onServiceWorkerControllerChange);
      }
    };
  }, []);

  const requestNotificationPermission = async () => {
    setTestResult(null);
    
    try {
      if (!('Notification' in window)) {
        setTestResult({
          success: false,
          message: "Notificările nu sunt suportate de acest browser."
        });
        return;
      }
      
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      setTestResult({
        success: permission === 'granted',
        message: permission === 'granted' 
          ? "Permisiune acordată pentru notificări!"
          : permission === 'denied'
            ? "Permisiunea pentru notificări a fost refuzată."
            : "Utilizatorul a ignorat cererea de permisiune."
      });
    } catch (error) {
      console.error('Eroare la solicitarea permisiunii pentru notificări:', error);
      setTestResult({
        success: false,
        message: "Eroare la solicitarea permisiunii pentru notificări: " + error
      });
    }
  };

  const registerServiceWorker = () => {
    setTestResult(null);
    
    if (!('serviceWorker' in navigator)) {
      setTestResult({
        success: false,
        message: "Service Worker nu este suportat de acest browser."
      });
      return;
    }
    
    const timestamp = new Date().getTime();
    navigator.serviceWorker.register(`/sw.js?t=${timestamp}`, { scope: '/' })
      .then(registration => {
        console.log('Service Worker înregistrat cu succes:', registration.scope);
        window.swRegistration = registration;
        setServiceWorkerStatus('activ');
        setTestResult({
          success: true,
          message: "Service Worker înregistrat cu succes!"
        });
      })
      .catch(error => {
        console.error('Eroare la înregistrarea Service Worker:', error);
        setTestResult({
          success: false,
          message: "Eroare la înregistrarea Service Worker: " + error
        });
      });
  };

  const testDirectNotification = () => {
    setTestResult(null);
    
    try {
      if (Notification.permission !== 'granted') {
        setTestResult({
          success: false,
          message: "Nu ai permisiunea pentru notificări. Solicită permisiunea mai întâi."
        });
        return;
      }
      
      const notification = new Notification('Test Notificare Directă', {
        body: 'Aceasta este o notificare de test directă.',
        icon: '/favicon.ico',
        tag: 'test-direct-' + Date.now()
      });
      
      notification.onclick = () => {
        console.log('Notificare accesată');
        setTestResult({
          success: true,
          message: "Notificare directă afișată și accesată cu succes."
        });
      };
      
      notification.onclose = () => {
        console.log('Notificare închisă');
      };
      
      notification.onerror = (error) => {
        console.error('Eroare la afișarea notificării:', error);
        setTestResult({
          success: false,
          message: "Eroare la afișarea notificării directe: " + error
        });
      };
      
      setTestResult({
        success: true,
        message: "Notificare directă afișată cu succes. Verifică dacă o vezi."
      });
    } catch (error) {
      console.error('Eroare la testarea notificării directe:', error);
      setTestResult({
        success: false,
        message: "Eroare la testarea notificării directe: " + error
      });
    }
  };

  const testServiceWorkerNotification = () => {
    setTestResult(null);
    
    if (!serviceWorkerSupported || !navigator.serviceWorker.controller) {
      setTestResult({
        success: false,
        message: "Service Worker-ul nu este activ. Înregistrează Service Worker-ul și reîncarcă pagina."
      });
      return;
    }
    
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_NOTIFICATION',
        payload: {
          title: 'Test Service Worker',
          body: 'Aceasta este o notificare de test prin Service Worker.',
          tag: 'test-sw-' + Date.now()
        }
      });
      
      setTestResult({
        success: true,
        message: "Cerere de notificare trimisă către Service Worker. Verifică dacă vezi notificarea."
      });
      
      // Ascultăm răspunsul de la Service Worker
      const messageListener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'TEST_NOTIFICATION_RESULT') {
          if (event.data.success) {
            setTestResult({
              success: true,
              message: "Notificare prin Service Worker afișată cu succes."
            });
          } else {
            setTestResult({
              success: false,
              message: "Eroare la afișarea notificării prin Service Worker: " + (event.data.error || "Necunoscută")
            });
          }
          navigator.serviceWorker.removeEventListener('message', messageListener);
        }
      };
      
      navigator.serviceWorker.addEventListener('message', messageListener);
      
      // Timeout pentru a evita blocarea
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', messageListener);
      }, 5000);
    } catch (error) {
      console.error('Eroare la testarea notificării prin Service Worker:', error);
      setTestResult({
        success: false,
        message: "Eroare la testarea notificării prin Service Worker: " + error
      });
    }
  };

  const testHelperNotification = () => {
    setTestResult(null);
    
    try {
      NotificationHelper.testNotification();
      
      setTestResult({
        success: true,
        message: "Cerere de notificare trimisă prin NotificationHelper. Verifică dacă vezi notificarea."
      });
    } catch (error) {
      console.error('Eroare la testarea notificării prin Helper:', error);
      setTestResult({
        success: false,
        message: "Eroare la testarea notificării prin Helper: " + error
      });
    }
  };

  const startBackgroundCheck = async () => {
    setTestResult(null);
    
    if (!window.firebase) {
      setTestResult({
        success: false,
        message: "Firebase nu este disponibil. Verifică configurarea."
      });
      return;
    }
    
    if (!window.startBackgroundMessageCheck) {
      setTestResult({
        success: false,
        message: "Funcția startBackgroundMessageCheck nu este disponibilă. Înregistrează Service Worker-ul și reîncarcă pagina."
      });
      return;
    }
    
    try {
      // Obținem un token de autentificare
      const auth = window.firebase.auth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setTestResult({
          success: false,
          message: "Nu sunteți autentificat. Autentificați-vă și încercați din nou."
        });
        return;
      }
      
      const token = await currentUser.getIdToken();
      
      // Pornește verificarea mesajelor în fundal
      const result = await window.startBackgroundMessageCheck({
        userId: 1, // Înlocuiește cu ID-ul real al utilizatorului
        userRole: 'service', // Înlocuiește cu rolul real al utilizatorului
        token,
        interval: 30000 // 30 secunde
      });
      
      setTestResult({
        success: result.success,
        message: result.message || "Verificare mesaje în fundal pornită"
      });
      
    } catch (error) {
      console.error('Eroare la pornirea verificării mesajelor în fundal:', error);
      setTestResult({
        success: false,
        message: "Eroare la obținerea token-ului de autentificare: " + error
      });
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6">Test Notificări Browser</h1>
      
      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Informații Suport Notificări</CardTitle>
            <CardDescription>Verifică dacă browserul tău suportă notificările și Service Worker</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Suport notificări browser:</span>
              <span className="flex items-center gap-2">
                {notificationSupported ? 
                  <><Check className="h-5 w-5 text-green-500" /> Suportat</> : 
                  <><XCircle className="h-5 w-5 text-red-500" /> Nesuportat</>}
              </span>
            </div>
            
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Suport Service Worker:</span>
              <span className="flex items-center gap-2">
                {serviceWorkerSupported ? 
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

        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{testResult.success ? "Succes" : "Eroare"}</AlertTitle>
            <AlertDescription>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Testare Notificări</CardTitle>
            <CardDescription>Testează diferite metode de afișare a notificărilor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 mb-4">
              <p>Aceste teste te vor ajuta să înțelegi ce parte a sistemului de notificări funcționează corect:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Testul direct folosește API-ul Notification nativ</li>
                <li>Testul Service Worker trimite notificarea prin Service Worker</li>
                <li>Testul Helper folosește modulul NotificationHelper</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3">
            <Button 
              onClick={testDirectNotification} 
              disabled={notificationPermission !== "granted"}
              variant="outline"
            >
              Test Notificare Directă
            </Button>
            
            <Button 
              onClick={testServiceWorkerNotification} 
              disabled={notificationPermission !== "granted" || serviceWorkerStatus !== "activ"}
              variant="outline"
            >
              Test Notificare Service Worker
            </Button>
            
            <Button 
              onClick={testHelperNotification} 
              disabled={notificationPermission !== "granted"}
              variant="outline"
            >
              Test Notificare Helper
            </Button>
            
            <Button 
              onClick={startBackgroundCheck} 
              disabled={notificationPermission !== "granted" || serviceWorkerStatus !== "activ"}
              variant="secondary"
            >
              Pornire Verificare în Fundal
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="text-sm text-gray-500 mt-6">
        <h3 className="font-medium mb-2">Probleme comune:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dacă folosești HTTPS, verifică dacă certificatul este valid.</li>
          <li>Service Worker-ul funcționează doar pe HTTPS sau localhost.</li>
          <li>Browserul poate bloca notificările la nivel de site sau global.</li>
          <li>Unele browsere restricționează notificările pe dispozitivele mobile.</li>
          <li>Verifică permisiunile site-ului în setările browserului dacă notificările nu apar.</li>
        </ul>
      </div>
    </div>
  );
}


  useEffect(() => {
    // Verifică suportul pentru notificări
    const notifSupported = 'Notification' in window;
    setNotificationSupported(notifSupported);

    // Verifică suportul pentru Service Worker
    const swSupported = 'serviceWorker' in navigator;
    setServiceWorkerSupported(swSupported);

    // Verifică permisiunea curentă pentru notificări
    if (notifSupported) {
      setNotificationPermission(Notification.permission);
    }

    // Verifică starea Service Worker-ului
    if (swSupported) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length === 0) {
          setServiceWorkerStatus("neînregistrat");
        } else {
          const swReg = registrations[0];
          const isActive = !!navigator.serviceWorker.controller;
          setServiceWorkerStatus(isActive ? "activ" : "înregistrat, dar inactiv");
        }
      }).catch(err => {
        console.error("Eroare la verificarea Service Worker:", err);
        setServiceWorkerStatus("eroare");
      });
    } else {
      setServiceWorkerStatus("nesuportat");
    }
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: "Permisiune acordată",
          description: "Poți acum primi notificări în browser.",
          variant: "default"
        });
      } else {
        toast({

  // Funcție de testare pentru a verifica dacă Service Worker este încărcat corect
  const testServiceWorkerMimeType = async () => {
    try {
      const response = await fetch('/sw.js');
      const contentType = response.headers.get('Content-Type');
      
      toast({
        title: 'Rezultat verificare Service Worker',
        description: `Content-Type pentru sw.js: ${contentType || 'nedefinit'}`,
        variant: contentType?.includes('javascript') ? 'default' : 'destructive'
      });
      
      return contentType?.includes('javascript') || false;
    } catch (error) {
      toast({
        title: 'Eroare la verificarea Service Worker',
        description: `Eroare: ${error instanceof Error ? error.message : 'Necunoscută'}`,
        variant: 'destructive'
      });
      return false;
    }
  };

          title: "Permisiune refuzată",
          description: "Nu vei putea primi notificări în browser până nu permiți acest lucru.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Eroare la solicitarea permisiunii:", error);
      toast({
        title: "Eroare",
        description: "Nu am putut solicita permisiunea. Verifică setările browserului.",
        variant: "destructive"
      });
    }
  };

  const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker înregistrat cu succes:', registration.scope);
          setServiceWorkerStatus("înregistrat");
          toast({
            title: "Service Worker înregistrat",
            description: "Service Worker-ul a fost înregistrat cu succes.",
            variant: "default"
          });
          
          // Salvăm registration pentru a-l folosi mai târziu
          window.swRegistration = registration;
          
          // Reload pentru a activa Service Worker-ul
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        })
        .catch(error => {
          console.error('Eroare la înregistrarea Service Worker:', error);
          setServiceWorkerStatus("eroare la înregistrare");
          toast({
            title: "Eroare",
            description: "Nu am putut înregistra Service Worker-ul.",
            variant: "destructive"
          });
        });
    }
  };

  const testDirectNotification = () => {
    setTestResult(null);
    
    try {
      if (Notification.permission !== 'granted') {
        setTestResult({
          success: false,
          message: "Nu ai permisiunea pentru notificări. Solicită permisiunea mai întâi."
        });
        return;
      }
      
      const notification = new Notification('Test Notificare Directă', {
        body: 'Aceasta este o notificare de test directă.',
        icon: '/favicon.ico',
        tag: 'test-direct-' + Date.now()
      });
      
      notification.onclick = () => {
        console.log('Notificare accesată');
        setTestResult({
          success: true,
          message: "Notificare directă afișată și accesată cu succes."
        });
      };
      
      notification.onclose = () => {
        console.log('Notificare închisă');
      };
      
      notification.onerror = (error) => {
        console.error('Eroare la afișarea notificării:', error);
        setTestResult({
          success: false,
          message: "Eroare la afișarea notificării directe: " + error
        });
      };
      
      setTestResult({
        success: true,
        message: "Notificare directă afișată cu succes. Verifică dacă o vezi."
      });
    } catch (error) {
      console.error('Eroare la testarea notificării directe:', error);
      setTestResult({
        success: false,
        message: "Eroare la testarea notificării directe: " + error
      });
    }
  };

  const testServiceWorkerNotification = () => {
    setTestResult(null);
    
    if (!serviceWorkerSupported || !navigator.serviceWorker.controller) {
      setTestResult({
        success: false,
        message: "Service Worker-ul nu este activ. Înregistrează Service Worker-ul și reîncarcă pagina."
      });
      return;
    }
    
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_NOTIFICATION',
        payload: {
          title: 'Test Service Worker',
          body: 'Aceasta este o notificare de test prin Service Worker.',
          tag: 'test-sw-' + Date.now()
        }
      });
      
      setTestResult({
        success: true,
        message: "Cerere de notificare trimisă către Service Worker. Verifică dacă vezi notificarea."
      });
      
      // Ascultăm răspunsul de la Service Worker
      const messageListener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'TEST_NOTIFICATION_RESULT') {
          if (event.data.success) {
            setTestResult({
              success: true,
              message: "Notificare prin Service Worker afișată cu succes."
            });
          } else {
            setTestResult({
              success: false,
              message: "Eroare la afișarea notificării prin Service Worker: " + (event.data.error || "Necunoscută")
            });
          }
          navigator.serviceWorker.removeEventListener('message', messageListener);
        }
      };
      
      navigator.serviceWorker.addEventListener('message', messageListener);
      
      // În caz că nu primim răspuns în 3 secunde, considerăm că a fost o problemă
      setTimeout(() => {
        setTestResult(prevResult => {
          if (prevResult && prevResult.message.includes("Cerere de notificare trimisă")) {
            navigator.serviceWorker.removeEventListener('message', messageListener);
            return {
              success: false,
              message: "Nu am primit confirmare de la Service Worker. Este posibil să fie o problemă de comunicare."
            };
          }
          return prevResult;
        });
      }, 3000);
      
    } catch (error) {
      console.error('Eroare la testarea notificării prin Service Worker:', error);
      setTestResult({
        success: false,
        message: "Eroare la testarea notificării prin Service Worker: " + error
      });
    }
  };

  const testHelperNotification = () => {
    setTestResult(null);
    
    try {
      NotificationHelper.testNotification();
      
      setTestResult({
        success: true,
        message: "Cerere de notificare trimisă prin NotificationHelper. Verifică dacă vezi notificarea."
      });
    } catch (error) {
      console.error('Eroare la testarea notificării prin Helper:', error);
      setTestResult({
        success: false,
        message: "Eroare la testarea notificării prin Helper: " + error
      });
    }
  };

  const startBackgroundCheck = () => {
    if (!window.startBackgroundMessageCheck) {
      setTestResult({
        success: false,
        message: "Funcția startBackgroundMessageCheck nu este disponibilă. Reîncarcă pagina."
      });
      return;
    }
    
    // În mod normal, am obține aceste date din autentificare/context
    const userId = 1; // Înlocuiește cu ID-ul utilizatorului real
    const userRole = 'service'; // sau 'client'
    
    // Obținem token-ul de autentificare
    const getToken = async () => {
      try {
        // Implementează logica pentru obținerea token-ului
        const token = "test-token"; // Înlocuiește cu token-ul real
        
        if (window.startBackgroundMessageCheck) {
          window.startBackgroundMessageCheck({
            userId,
            userRole,
            token,
            interval: 10000 // Verificăm la fiecare 10 secunde
          }).then(() => {
            setTestResult({
              success: true,
              message: "Verificare periodică în fundal pornită cu succes."
            });
          }).catch((error: Error) => {
            setTestResult({
              success: false,
              message: "Eroare la pornirea verificării în fundal: " + error.message
            });
          });
        } else {
          setTestResult({
            success: false,
            message: "Funcția startBackgroundMessageCheck nu este disponibilă. Reîncarcă pagina."
          });
        }
        
      } catch (error) {
        console.error('Eroare la obținerea token-ului:', error);
        setTestResult({
          success: false,
          message: "Eroare la obținerea token-ului de autentificare: " + error
        });
      }
    };
    
    getToken();
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6">Test Notificări Browser</h1>
      
      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Informații Suport Notificări</CardTitle>
            <CardDescription>Verifică dacă browserul tău suportă notificările și Service Worker</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Suport notificări browser:</span>
              <span className="flex items-center gap-2">
                {notificationSupported ? 
                  <><Check className="h-5 w-5 text-green-500" /> Suportat</> : 
                  <><XCircle className="h-5 w-5 text-red-500" /> Nesuportat</>}
              </span>
            </div>
            
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Suport Service Worker:</span>
              <span className="flex items-center gap-2">
                {serviceWorkerSupported ? 
                  <><Check className="h-5 w-5 text-green-500" /> Suportat</> : 
                  <><XCircle className="h-5 w-5 text-red-500" /> Nesuportat</>}
              </span>
            </div>
            
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Stare Service Worker:</span>
              <span className="flex items-center gap-2">
                {serviceWorkerStatus === "activ" ? 
                  <><Check className="h-5 w-5 text-green-500" /> {serviceWorkerStatus}</> : 
                  <><Info className="h-5 w-5 text-amber-500" /> {serviceWorkerStatus}</>}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Permisiune notificări:</span>
              <span className="flex items-center gap-2">
                {notificationPermission === "granted" ? 
                  <><Check className="h-5 w-5 text-green-500" /> Acordată</> : 
                  notificationPermission === "denied" ?
                  <><XCircle className="h-5 w-5 text-red-500" /> Refuzată</> :
                  <><Info className="h-5 w-5 text-amber-500" /> Neverificată</>}
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3">
            {notificationPermission !== "granted" && (
              <Button onClick={requestPermission} variant="default">
                <Bell className="h-4 w-4 mr-2" />
                Solicită permisiune notificări
              </Button>
            )}
            
            {serviceWorkerSupported && serviceWorkerStatus !== "activ" && (
              <Button onClick={registerServiceWorker} variant="secondary">
                Înregistrează Service Worker
              </Button>
            )}
          </CardFooter>
        </Card>

        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{testResult.success ? "Succes" : "Eroare"}</AlertTitle>
            <AlertDescription>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Testare Notificări</CardTitle>
            <CardDescription>Testează diferite metode de afișare a notificărilor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 mb-4">
              <p>Aceste teste te vor ajuta să înțelegi ce parte a sistemului de notificări funcționează corect:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Testul direct folosește API-ul Notification nativ</li>
                <li>Testul Service Worker trimite notificarea prin Service Worker</li>
                <li>Testul Helper folosește modulul NotificationHelper</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3">
            <Button 
              onClick={testDirectNotification} 
              disabled={notificationPermission !== "granted"}
              variant="outline"
            >
              Test Notificare Directă
            </Button>
            
            <Button 
              onClick={testServiceWorkerNotification} 
              disabled={notificationPermission !== "granted" || serviceWorkerStatus !== "activ"}
              variant="outline"
            >
              Test Notificare Service Worker
            </Button>
            
            <Button 
              onClick={testHelperNotification} 
              disabled={notificationPermission !== "granted"}
              variant="outline"
            >
              Test Notificare Helper
            </Button>
            
            <Button 
              onClick={startBackgroundCheck} 
              disabled={notificationPermission !== "granted" || serviceWorkerStatus !== "activ"}
              variant="secondary"
            >
              Pornire Verificare în Fundal
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="text-sm text-gray-500 mt-6">
        <h3 className="font-medium mb-2">Probleme comune:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dacă folosești HTTPS, verifică dacă certificatul este valid.</li>
          <li>Service Worker-ul funcționează doar pe HTTPS sau localhost.</li>
          <li>Browserul poate bloca notificările la nivel de site sau global.</li>
          <li>Unele browsere restricționează notificările pe dispozitive mobile.</li>
          <li>Verifică setările browserului pentru a permite notificări pentru acest site.</li>
        </ul>
      </div>
    </div>
  );
}