import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ClientNotificationPreference } from "@shared/schema";
import NotificationHelper from '@/lib/notifications';

// Tipul pentru preferințele de notificări pentru UI
interface NotificationPreferences {
  id: number;
  clientId: number;
  emailNotificationsEnabled: boolean;
  newOfferEmailEnabled: boolean;
  newMessageEmailEnabled: boolean;
  
  browserNotificationsEnabled: boolean;
  newOfferBrowserEnabled: boolean;
  newMessageBrowserEnabled: boolean;
  browserPermission: boolean;
}

// API-ul va furniza valorile implicite sau cele existente
const defaultValues = {
  emailNotificationsEnabled: true,
  newOfferEmailEnabled: true,
  newMessageEmailEnabled: true,
  
  browserNotificationsEnabled: true,
  newOfferBrowserEnabled: true,
  newMessageBrowserEnabled: true,
  browserPermission: false
};

export default function NotificationPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("email");

  // Stare locală pentru permisiunea browser-ului
  const [hasBrowserPermission, setHasBrowserPermission] = useState<boolean>(false);
  const [requestingPermission, setRequestingPermission] = useState<boolean>(false);

  // Verificăm dacă API-ul de notificări este disponibil
  const notificationsAvailable = NotificationHelper.isSupported();

  // Obținem preferințele de notificări
  const { data: preferences, isLoading, error } = useQuery<NotificationPreferences>({
    queryKey: ['/api/client/notification-preferences'],
    refetchOnWindowFocus: false
  });

  // Detectare permisiune browser la încărcare
  useEffect(() => {
    if (notificationsAvailable) {
      const currentPermission = NotificationHelper.checkPermission();
      setHasBrowserPermission(currentPermission === 'granted');

      // Actualizăm starea când se schimbă preferințele
      if (preferences) {
        // Sincronizăm permisiunea reală cu cea din baza de date
        if (preferences.browserPermission !== (currentPermission === 'granted')) {
          setTimeout(() => {
            handleToggleChange('browserPermission', currentPermission === 'granted');
          }, 500);
        }

        setHasBrowserPermission(currentPermission === 'granted');
      }
    }
  }, [preferences, notificationsAvailable]);

  // Mutație pentru actualizarea preferințelor
  const updateMutation = useMutation({
    mutationFn: async (updatedPreferences: NotificationPreferences) => {
      console.log('Trimit cerere de actualizare a preferințelor:', updatedPreferences);
      const response = await apiRequest('POST', '/api/client/notification-preferences', updatedPreferences);
      if (!response.ok) {
        console.error('Eroare la actualizarea preferințelor, status:', response.status);
        throw new Error('Nu am putut actualiza preferințele de notificări');
      }
      const data = await response.json();
      console.log('Răspuns actualizare preferințe:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/notification-preferences'] });
      toast({
        title: "Succes",
        description: "Preferințele de notificări au fost actualizate",
      });
    },
    onError: () => {
      toast({
        title: "Eroare",
        description: "Nu am putut actualiza preferințele de notificări",
        variant: "destructive"
      });
    }
  });

  // Manipulator pentru schimbarea unei preferințe
  const handleToggleChange = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    const updatedPreferences = {
      ...preferences,
      [key]: value
    };

    // Dacă dezactivăm toate notificările email, dezactivăm și preferințele individuale
    if (key === 'emailNotificationsEnabled' && !value) {
      updatedPreferences.newOfferEmailEnabled = false;
      updatedPreferences.newMessageEmailEnabled = false;
    }

    // Dacă dezactivăm toate notificările din browser, dezactivăm și preferințele individuale
    if (key === 'browserNotificationsEnabled' && !value) {
      updatedPreferences.newOfferBrowserEnabled = false;
      updatedPreferences.newMessageBrowserEnabled = false;
    }

    updateMutation.mutate(updatedPreferences);
  };

  // Manipulator pentru solicitarea permisiunii de notificări browser
  const handleRequestPermission = async () => {
    if (!notificationsAvailable) return;

    try {
      setRequestingPermission(true);
      // Folosim NotificationHelper pentru solicitarea permisiunii
      const granted = await NotificationHelper.requestPermission();
      setHasBrowserPermission(granted);

      // Test notificare dacă permisiunea a fost acordată
      if (granted) {
        setTimeout(() => {
          NotificationHelper.showNotification('Notificări activate', {
            body: 'Veți primi notificări pentru oferte noi și mesaje importante',
            icon: '/favicon.ico'
          });
        }, 500);
      }

      // Actualizăm și în backend
      if (preferences) {
        const updatedPreferences = {
          ...preferences,
          browserPermission: granted
        };

        updateMutation.mutate(updatedPreferences);
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu am putut solicita permisiunea pentru notificări browser",
        variant: "destructive"
      });
    } finally {
      setRequestingPermission(false);
    }
  };

  // Afișăm un loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferințe Notificări
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Afișăm o eroare dacă nu putem încărca preferințele
  if (error || !preferences) {
    return (
      <Card>
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferințe Notificări
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center p-8 gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-gray-500">Nu am putut încărca preferințele de notificări. Încearcă din nou mai târziu.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="text-[#00aff5] flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferințe Notificări
        </CardTitle>
        <CardDescription>
          Gestionează modul în care primești notificări despre oferte și mesaje
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Accordion type="single" collapsible className="w-full">
          {/* Secțiunea de notificări email */}
          <AccordionItem value="email">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 text-lg font-medium">
                <Mail className="h-5 w-5" />
                Notificări prin email
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <Label htmlFor="email-notifications-master" className="font-medium text-gray-900">
                    Toate notificările email
                  </Label>
                  <p className="text-sm text-gray-500">
                    Activează sau dezactivează toate notificările prin email
                  </p>
                </div>
                <Switch 
                  id="email-notifications-master"
                  checked={preferences.emailNotificationsEnabled}
                  onCheckedChange={(checked) => handleToggleChange('emailNotificationsEnabled', checked)}
                />
              </div>

              <div className="space-y-3 pl-1">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label 
                      htmlFor="new-offer-email" 
                      className={`${!preferences.emailNotificationsEnabled ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Oferte noi primite
                    </Label>
                  </div>
                  <Switch 
                    id="new-offer-email"
                    checked={preferences.newOfferEmailEnabled}
                    disabled={!preferences.emailNotificationsEnabled}
                    onCheckedChange={(checked) => handleToggleChange('newOfferEmailEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label 
                      htmlFor="new-message-email" 
                      className={`${!preferences.emailNotificationsEnabled ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Mesaje noi primite
                    </Label>
                  </div>
                  <Switch 
                    id="new-message-email"
                    checked={preferences.newMessageEmailEnabled}
                    disabled={!preferences.emailNotificationsEnabled}
                    onCheckedChange={(checked) => handleToggleChange('newMessageEmailEnabled', checked)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Secțiunea de notificări browser */}
          <AccordionItem value="browser">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 text-lg font-medium">
                <Bell className="h-5 w-5" />
                Notificări browser
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {!notificationsAvailable && (
                <div className="bg-amber-50 p-4 rounded-md mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-800 text-sm">
                      Notificările în browser nu sunt disponibile în acest browser sau context. Încearcă să utilizezi un browser modern pentru a activa această funcționalitate.
                    </p>
                  </div>
                </div>
              )}

              {notificationsAvailable && !hasBrowserPermission && (
                <div className="bg-blue-50 p-4 rounded-md mb-4">
                  <div className="flex flex-col gap-3">
                    <p className="text-blue-800 text-sm">
                      Trebuie să acorzi permisiunea browserului pentru a primi notificări. Apasă butonul de mai jos pentru a activa notificările.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRequestPermission}
                      disabled={requestingPermission}
                      className="w-full sm:w-auto"
                    >
                      {requestingPermission && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Solicită permisiunea browserului
                    </Button>
                  </div>
                </div>
              )}

              {notificationsAvailable && hasBrowserPermission && (
                <div className="bg-green-50 p-4 rounded-md mb-4">
                  <div className="flex flex-col gap-3">
                    <p className="text-green-800 text-sm">
                      Notificările în browser sunt activate. Poți testa funcționalitatea cu butonul de mai jos.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        NotificationHelper.testNotification();
                        toast({
                          title: "Notificare de test",
                          description: "Notificarea de test a fost afișată în browser",
                        });
                      }}
                      className="w-full sm:w-auto bg-green-100 hover:bg-green-200 text-green-800"
                    >
                      Testează notificările
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <Label htmlFor="browser-notifications-master" className="font-medium text-gray-900">
                    Toate notificările browser
                  </Label>
                  <p className="text-sm text-gray-500">
                    Activează sau dezactivează toate notificările din browser
                  </p>
                </div>
                <Switch 
                  id="browser-notifications-master"
                  checked={preferences.browserNotificationsEnabled}
                  disabled={!hasBrowserPermission}
                  onCheckedChange={(checked) => handleToggleChange('browserNotificationsEnabled', checked)}
                />
              </div>

              <div className="space-y-3 pl-1">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label 
                      htmlFor="new-offer-browser" 
                      className={`${!preferences.browserNotificationsEnabled || !hasBrowserPermission ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Oferte noi primite
                    </Label>
                  </div>
                  <Switch 
                    id="new-offer-browser"
                    checked={preferences.newOfferBrowserEnabled}
                    disabled={!preferences.browserNotificationsEnabled || !hasBrowserPermission}
                    onCheckedChange={(checked) => handleToggleChange('newOfferBrowserEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label 
                      htmlFor="new-message-browser" 
                      className={`${!preferences.browserNotificationsEnabled || !hasBrowserPermission ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Mesaje noi primite
                    </Label>
                  </div>
                  <Switch 
                    id="new-message-browser"
                    checked={preferences.newMessageBrowserEnabled}
                    disabled={!preferences.browserNotificationsEnabled || !hasBrowserPermission}
                    onCheckedChange={(checked) => handleToggleChange('newMessageBrowserEnabled', checked)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}