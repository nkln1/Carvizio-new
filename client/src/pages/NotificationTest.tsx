
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Info, XCircle, Bell } from "lucide-react";
import useNotifications from "@/hooks/useNotifications";

export default function NotificationTest() {
  const [testResult, setTestResult] = useState<any>(null);
  const [swRegistered, setSwRegistered] = useState<boolean>(false);
  const [backgroundActive, setBackgroundActive] = useState<boolean>(false);
  const { permission, supported, error, requestPermission, showNotification } = useNotifications();

  useEffect(() => {
    // Verifică dacă Service Worker este înregistrat
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration()
        .then(registration => {
          setSwRegistered(!!registration);
        })
        .catch(err => {
          console.error('Eroare la verificarea Service Worker:', err);
          setSwRegistered(false);
        });
    }
  }, []);

  const handleTestServiceWorker = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        setTestResult({
          success: false,
          message: 'Service Worker nu este suportat de acest browser.'
        });
        return;
      }

      // Înregistrăm Service Worker sau obținem înregistrarea existentă
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        const timestamp = new Date().getTime();
        const newRegistration = await navigator.serviceWorker.register(`/sw.js?t=${timestamp}`, {
          scope: '/'
        });
        
        setTestResult({
          success: true,
          message: `Service Worker înregistrat cu succes: ${newRegistration.scope}`
        });
        setSwRegistered(true);
      } else {
        setTestResult({
          success: true,
          message: `Service Worker deja înregistrat: ${registration.scope}`
        });
        setSwRegistered(true);
      }
    } catch (err) {
      console.error('Eroare la testarea Service Worker:', err);
      setTestResult({
        success: false,
        message: `Eroare la testarea Service Worker: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const handleTestPermission = async () => {
    try {
      const result = await requestPermission();
      setTestResult({
        success: result,
        message: result 
          ? 'Permisiune pentru notificări acordată!' 
          : `Permisiune pentru notificări refuzată. Status: ${permission}`
      });
    } catch (err) {
      console.error('Eroare la testarea permisiunii:', err);
      setTestResult({
        success: false,
        message: `Eroare la testarea permisiunii: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      const result = await showNotification('Test Notificare', {
        body: 'Aceasta este o notificare de test.',
        icon: '/favicon.ico',
        requireInteraction: true,
        tag: 'test-notification'
      });

      setTestResult({
        success: result,
        message: result 
          ? 'Notificare trimisă cu succes!' 
          : 'Nu s-a putut trimite notificarea.'
      });
    } catch (err) {
      console.error('Eroare la testarea notificării:', err);
      setTestResult({
        success: false,
        message: `Eroare la testarea notificării: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const handleStartBackgroundCheck = async () => {
    if (!swRegistered) {
      setTestResult({
        success: false,
        message: 'Service Worker nu este înregistrat. Testați mai întâi Service Worker.'
      });
      return;
    }

    try {
      if (typeof window.startBackgroundMessageCheck === 'function') {
        await window.startBackgroundMessageCheck({
          userId: 1, // Folosim un ID de test
          userRole: 'client',
          token: 'test-token',
          interval: 30000
        });
        
        setBackgroundActive(true);
        setTestResult({
          success: true,
          message: 'Verificare mesaje în fundal pornită cu succes!'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Funcția startBackgroundMessageCheck nu este disponibilă.'
        });
      }
    } catch (err) {
      console.error('Eroare la pornirea verificării în fundal:', err);
      setTestResult({
        success: false,
        message: `Eroare la pornirea verificării în fundal: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const handleStopBackgroundCheck = async () => {
    try {
      if (typeof window.stopBackgroundMessageCheck === 'function') {
        await window.stopBackgroundMessageCheck();
        
        setBackgroundActive(false);
        setTestResult({
          success: true,
          message: 'Verificare mesaje în fundal oprită cu succes!'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Funcția stopBackgroundMessageCheck nu este disponibilă.'
        });
      }
    } catch (err) {
      console.error('Eroare la oprirea verificării în fundal:', err);
      setTestResult({
        success: false,
        message: `Eroare la oprirea verificării în fundal: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Test Notificări Browser</h1>
      
      <Tabs defaultValue="service-worker">
        <TabsList className="mb-4">
          <TabsTrigger value="service-worker">Service Worker</TabsTrigger>
          <TabsTrigger value="permissions">Permisiuni</TabsTrigger>
          <TabsTrigger value="notifications">Notificări</TabsTrigger>
          <TabsTrigger value="background">Verificare Fundal</TabsTrigger>
        </TabsList>
        
        <TabsContent value="service-worker">
          <Card>
            <CardHeader>
              <CardTitle>Service Worker</CardTitle>
              <CardDescription>
                Înregistrează și verifică Service Worker-ul pentru notificări.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="font-semibold mr-2">Status:</span>
                {swRegistered ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="w-4 h-4 mr-1" /> Înregistrat
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center">
                    <Info className="w-4 h-4 mr-1" /> Neînregistrat
                  </span>
                )}
              </div>
              <Button onClick={handleTestServiceWorker}>
                Testează Service Worker
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permisiuni Notificări</CardTitle>
              <CardDescription>
                Verifică și solicită permisiuni pentru notificări.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="font-semibold mr-2">Status:</span>
                {permission === 'granted' ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="w-4 h-4 mr-1" /> Permisiune acordată
                  </span>
                ) : permission === 'denied' ? (
                  <span className="text-red-600 flex items-center">
                    <XCircle className="w-4 h-4 mr-1" /> Permisiune respinsă
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center">
                    <Info className="w-4 h-4 mr-1" /> Permisiune nesolicitată
                  </span>
                )}
              </div>
              
              <div className="mb-4">
                <span className="font-semibold mr-2">Suportat:</span>
                {supported ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="w-4 h-4 mr-1" /> Da
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <XCircle className="w-4 h-4 mr-1" /> Nu
                  </span>
                )}
              </div>
              
              <Button onClick={handleTestPermission} disabled={!supported}>
                Solicită Permisiune
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Test Notificări</CardTitle>
              <CardDescription>
                Trimite o notificare de test pentru a verifica funcționalitatea.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="font-semibold mr-2">Prerequisite:</span>
                {(swRegistered && permission === 'granted') ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="w-4 h-4 mr-1" /> Toate condițiile îndeplinite
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center">
                    <Info className="w-4 h-4 mr-1" /> 
                    {!swRegistered && 'Service Worker neînregistrat. '}
                    {permission !== 'granted' && 'Permisiune pentru notificări neacordată.'}
                  </span>
                )}
              </div>
              
              <Button 
                onClick={handleTestNotification} 
                disabled={!supported || permission !== 'granted'}
              >
                <Bell className="w-4 h-4 mr-2" />
                Trimite Notificare Test
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="background">
          <Card>
            <CardHeader>
              <CardTitle>Verificare Mesaje în Fundal</CardTitle>
              <CardDescription>
                Pornește și oprește verificarea periodică a mesajelor noi în fundal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="font-semibold mr-2">Status:</span>
                {backgroundActive ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="w-4 h-4 mr-1" /> Activ
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center">
                    <Info className="w-4 h-4 mr-1" /> Inactiv
                  </span>
                )}
              </div>
              
              <div className="flex space-x-4">
                <Button 
                  onClick={handleStartBackgroundCheck} 
                  disabled={!swRegistered || backgroundActive}
                >
                  Pornește Verificare
                </Button>
                
                <Button 
                  onClick={handleStopBackgroundCheck} 
                  disabled={!backgroundActive}
                  variant="outline"
                >
                  Oprește Verificare
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {testResult && (
        <Card className={`mt-6 ${testResult.success ? 'border-green-500' : 'border-red-500'}`}>
          <CardHeader>
            <CardTitle className={testResult.success ? 'text-green-700' : 'text-red-700'}>
              {testResult.success ? 'Succes!' : 'Eroare!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{testResult.message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
