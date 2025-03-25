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
import { NotificationPreference } from "@shared/schema";

// Tipul pentru preferințele de notificări pentru UI
interface NotificationPreferences extends Omit<NotificationPreference, 'createdAt' | 'updatedAt'> {
  // Asigurăm că toate proprietățile necesare sunt incluse
}

// Valori implicite pentru preferințe
const defaultPreferences: NotificationPreferences = {
  emailNotificationsEnabled: true,
  newRequestEmailEnabled: true,
  acceptedOfferEmailEnabled: true,
  newMessageEmailEnabled: true,
  newReviewEmailEnabled: true,
  
  browserNotificationsEnabled: true,
  newRequestBrowserEnabled: true,
  acceptedOfferBrowserEnabled: true,
  newMessageBrowserEnabled: true,
  newReviewBrowserEnabled: true,
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
  const notificationsAvailable = typeof Notification !== 'undefined';
  
  // Obținem preferințele de notificări
  const { data: preferences, isLoading, error } = useQuery<NotificationPreferences>({
    queryKey: ['/api/service/notification-preferences'],
    refetchOnWindowFocus: false
  });

  // Detectare permisiune browser la încărcare
  useEffect(() => {
    if (notificationsAvailable) {
      setHasBrowserPermission(Notification.permission === 'granted');
      
      // Actualizăm starea când se schimbă preferințele
      if (preferences) {
        setHasBrowserPermission(preferences.browserPermission);
      }
    }
  }, [preferences, notificationsAvailable]);

  // Mutație pentru actualizarea preferințelor
  const updateMutation = useMutation({
    mutationFn: async (updatedPreferences: NotificationPreferences) => {
      const response = await apiRequest('PUT', '/api/service/notification-preferences', updatedPreferences);
      if (!response.ok) {
        throw new Error('Nu am putut actualiza preferințele de notificări');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service/notification-preferences'] });
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
      updatedPreferences.newRequestEmailEnabled = false;
      updatedPreferences.acceptedOfferEmailEnabled = false;
      updatedPreferences.newMessageEmailEnabled = false;
      updatedPreferences.newReviewEmailEnabled = false;
    }

    // Dacă dezactivăm toate notificările browser, dezactivăm și preferințele individuale
    if (key === 'browserNotificationsEnabled' && !value) {
      updatedPreferences.newRequestBrowserEnabled = false;
      updatedPreferences.acceptedOfferBrowserEnabled = false;
      updatedPreferences.newMessageBrowserEnabled = false;
      updatedPreferences.newReviewBrowserEnabled = false;
    }

    updateMutation.mutate(updatedPreferences);
  };

  // Manipulator pentru solicitarea permisiunii de notificări browser
  const handleRequestPermission = async () => {
    if (!notificationsAvailable) return;
    
    try {
      setRequestingPermission(true);
      const permission = await Notification.requestPermission();
      setHasBrowserPermission(permission === 'granted');
      
      // Actualizăm și în backend
      if (preferences) {
        const updatedPreferences = {
          ...preferences,
          browserPermission: permission === 'granted'
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
          Gestionează modul în care primești notificări despre activitatea de pe platforma Carvizio
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
                      htmlFor="new-request-email" 
                      className={`${!preferences.emailNotificationsEnabled ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Cereri noi primite
                    </Label>
                  </div>
                  <Switch 
                    id="new-request-email"
                    checked={preferences.newRequestEmailEnabled}
                    disabled={!preferences.emailNotificationsEnabled}
                    onCheckedChange={(checked) => handleToggleChange('newRequestEmailEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label 
                      htmlFor="accepted-offer-email" 
                      className={`${!preferences.emailNotificationsEnabled ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Oferte acceptate de clienți
                    </Label>
                  </div>
                  <Switch 
                    id="accepted-offer-email"
                    checked={preferences.acceptedOfferEmailEnabled}
                    disabled={!preferences.emailNotificationsEnabled}
                    onCheckedChange={(checked) => handleToggleChange('acceptedOfferEmailEnabled', checked)}
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

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label 
                      htmlFor="new-review-email" 
                      className={`${!preferences.emailNotificationsEnabled ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Recenzii noi primite
                    </Label>
                  </div>
                  <Switch 
                    id="new-review-email"
                    checked={preferences.newReviewEmailEnabled}
                    disabled={!preferences.emailNotificationsEnabled}
                    onCheckedChange={(checked) => handleToggleChange('newReviewEmailEnabled', checked)}
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

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <Label htmlFor="browser-notifications-master" className="font-medium text-gray-900">
                    Toate notificările browser
                  </Label>
                  <p className="text-sm text-gray-500">
                    Activează sau dezactivează toate notificările în browser
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
                      htmlFor="new-request-browser" 
                      className={`${!preferences.browserNotificationsEnabled || !hasBrowserPermission ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Cereri noi primite
                    </Label>
                  </div>
                  <Switch 
                    id="new-request-browser"
                    checked={preferences.newRequestBrowserEnabled}
                    disabled={!preferences.browserNotificationsEnabled || !hasBrowserPermission}
                    onCheckedChange={(checked) => handleToggleChange('newRequestBrowserEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label 
                      htmlFor="accepted-offer-browser" 
                      className={`${!preferences.browserNotificationsEnabled || !hasBrowserPermission ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Oferte acceptate de clienți
                    </Label>
                  </div>
                  <Switch 
                    id="accepted-offer-browser"
                    checked={preferences.acceptedOfferBrowserEnabled}
                    disabled={!preferences.browserNotificationsEnabled || !hasBrowserPermission}
                    onCheckedChange={(checked) => handleToggleChange('acceptedOfferBrowserEnabled', checked)}
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

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label 
                      htmlFor="new-review-browser" 
                      className={`${!preferences.browserNotificationsEnabled || !hasBrowserPermission ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      Recenzii noi primite
                    </Label>
                  </div>
                  <Switch 
                    id="new-review-browser"
                    checked={preferences.newReviewBrowserEnabled}
                    disabled={!preferences.browserNotificationsEnabled || !hasBrowserPermission}
                    onCheckedChange={(checked) => handleToggleChange('newReviewBrowserEnabled', checked)}
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