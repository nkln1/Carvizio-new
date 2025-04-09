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
import NotificationHelper from '@/lib/notifications';

// Tipul pentru preferințele de notificări pentru UI
interface NotificationPreferences {
  id: number;
  serviceProviderId: number;
  emailNotificationsEnabled: boolean;
  newRequestEmailEnabled: boolean;
  acceptedOfferEmailEnabled: boolean;
  newMessageEmailEnabled: boolean;
  newReviewEmailEnabled: boolean;
  browserNotificationsEnabled: boolean;
  newRequestBrowserEnabled: boolean;
  acceptedOfferBrowserEnabled: boolean;
  newMessageBrowserEnabled: boolean;
  newReviewBrowserEnabled: boolean;
  browserPermission: boolean;
}

// API-ul va furniza valorile implicite sau cele existente,
// nu folosim direct această constantă
const defaultValues = {
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

  // Folosim NotificationHelper pentru verificarea suportului notificărilor

  // Verificăm dacă API-ul de notificări este disponibil
  const notificationsAvailable = NotificationHelper.isSupported();

  // Obținem preferințele de notificări
  const { data: preferences, isLoading, error } = useQuery<NotificationPreferences>({
    queryKey: ['/api/service/notification-preferences'],
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
      // Folosim POST în loc de PUT pentru a fi compatibili cu implementarea backend-ului
      const response = await apiRequest('POST', '/api/service/notification-preferences', updatedPreferences);
      if (!response.ok) {
        console.error('Eroare la actualizarea preferințelor, status:', response.status);
        throw new Error('Nu am putut actualiza preferințele de notificări');
      }
      const data = await response.json();
      console.log('Răspuns actualizare preferințe:', data);
      return data;
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

    // Pentru browserNotificationsEnabled folosim acum implementarea directă 
    // din onCheckedChange, dar menținem acest cod pentru compatibilitate

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
            body: 'Veți primi notificări pentru mesaje noi și alte actualizări importante',
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
                        // Afișăm doar o notificare de test locală în browser - fără a trimite email
                        NotificationHelper.showNotification('Notificare de test', {
                          body: 'Aceasta este doar o notificare de test în browser. Nu se trimite email.',
                          icon: '/favicon.ico',
                          requireInteraction: false
                        });
                        toast({
                          title: "Notificare de test afișată",
                          description: "Am afișat o notificare de test doar în browser. Niciun email nu a fost trimis.",
                          variant: "default",
                        });
                      }}
                      className="w-full sm:w-auto bg-green-100 hover:bg-green-200 text-green-800"
                    >
                      Testează notificările browser
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <Label htmlFor="browser-notifications-master" className="font-medium text-gray-900">
                    Notificări Browser
                  </Label>
                  <p className="text-sm text-gray-500">
                    Activează sau dezactivează toate notificările în browser (cereri, oferte, mesaje, recenzii)
                  </p>
                </div>
                <Switch 
                  id="browser-notifications-master"
                  checked={preferences.browserNotificationsEnabled}
                  disabled={!hasBrowserPermission}
                  onCheckedChange={(checked) => {
                    // Actualizăm și preferințele individuale când se schimbă setarea master
                    const updatedPreferences = {
                      ...preferences,
                      browserNotificationsEnabled: checked,
                      // Actualizăm toate preferințele specifice în același timp
                      newRequestBrowserEnabled: checked,
                      acceptedOfferBrowserEnabled: checked,
                      newMessageBrowserEnabled: checked,
                      newReviewBrowserEnabled: checked
                    };

                    // Afișăm un toast pentru a informa utilizatorul despre schimbarea stării
                    toast({
                      title: checked ? "Notificări activate" : "Notificări dezactivate",
                      description: checked 
                        ? "Vei primi notificări pentru mesaje noi, cereri și oferte acceptate" 
                        : "Nu vei mai primi notificări în browser",
                      variant: "default",
                    });

                    // Mai întâi trimitem preferințele la server și așteptăm finalizarea
                    // Stocăm o referință la preferințele actualizate pentru a le folosi după actualizare
                    const prefsToUpdate = { ...updatedPreferences };
                    
                    // Dezactivăm callback-ul switch-ului temporar pentru a preveni dubla activare
                    updateMutation.mutate(updatedPreferences, {
                      onSuccess: async () => {
                        console.log('Preferințe actualizate cu succes:', prefsToUpdate.browserNotificationsEnabled);
                        
                        // Actualizare service worker după ce preferințele au fost salvate
                        if (checked && hasBrowserPermission) {
                          console.log('Activăm verificare notificări în Service Worker după actualizarea preferințelor');
                          
                          try {
                            // Încărcăm modulul de notificări
                            const NotificationsModule = await import('../../lib/notifications');
                            const NotificationHelper = NotificationsModule.default;
                            
                            // Obținem datele utilizatorului din toate sursele posibile
                            let userData;
                            
                            try {
                              // Prima sursă: localStorage userData
                              userData = JSON.parse(localStorage.getItem('userData') || '{}');
                              
                              // A doua sursă: verificăm în preferences pentru serviceProviderId
                              if (!userData.id && preferences.serviceProviderId) {
                                userData = {
                                  ...userData,
                                  id: preferences.serviceProviderId,
                                  role: 'service' // Pentru dashboard-ul furnizorului, știm că rolul este 'service'
                                };
                                console.log('Folosim ID-ul din preferințele notificărilor:', userData.id);
                              }
                              
                              // A treia sursă: verificăm în sessionStorage
                              if (!userData.id || !userData.role) {
                                const sessionData = JSON.parse(sessionStorage.getItem('userData') || '{}');
                                if (sessionData.id) {
                                  userData = {
                                    ...userData,
                                    ...sessionData
                                  };
                                  console.log('Folosim date utilizator din sessionStorage:', userData.id);
                                }
                              }
                              
                              // Dacă încă nu avem datele, dar avem serviceProviderId, folosim asta
                              if (!userData.id && !userData.role && preferences.serviceProviderId) {
                                userData = {
                                  id: preferences.serviceProviderId,
                                  role: 'service'
                                };
                                console.log('Folosim service provider ID ca ultimă soluție:', userData.id);
                              }
                              
                              // Verificăm final dacă avem datele necesare
                              if (!userData.id || !userData.role) {
                                throw new Error('Datele utilizatorului lipsesc și nu pot fi recuperate');
                              }
                              
                              // Salvăm datele recuperate în localStorage pentru viitoare utilizări
                              localStorage.setItem('userData', JSON.stringify(userData));
                              console.log('Date utilizator salvate pentru refolosire:', userData);
                            
                            } catch (parseError) {
                              console.error('Eroare la procesarea datelor utilizatorului:', parseError);
                              // Încercăm să obținem cel puțin ID-ul din preferințe
                              if (preferences.serviceProviderId) {
                                userData = {
                                  id: preferences.serviceProviderId,
                                  role: 'service'
                                };
                                console.log('Folosim ID serviciu din preferințe după eroare:', userData.id);
                              } else {
                                throw new Error('Nu s-au putut recupera datele utilizatorului');
                              }
                            }
                            
                            console.log('Repornim verificarea notificărilor pentru utilizator:', userData.id, userData.role);
                            
                            // Obținem tokenul de autentificare și ne asigurăm că este valabil
                            const token = localStorage.getItem('firebase_auth_token') || localStorage.getItem('authToken');
                            if (!token) {
                              console.error('Token de autentificare lipsește, nu se poate porni verificarea');
                              throw new Error('Token de autentificare lipsește');
                            }
                            
                            console.log('Token de autentificare disponibil:', !!token);
                            
                            // 1. Mai întâi oprim orice verificare existentă
                            await NotificationHelper.stopBackgroundMessageCheck();
                            console.log('Verificările existente au fost oprite cu succes');
                            
                            // 2. Verificăm starea service worker-ului
                            if ('serviceWorker' in navigator) {
                              const registrations = await navigator.serviceWorker.getRegistrations();
                              
                              if (registrations.length === 0) {
                                console.log('Nu există service worker înregistrat, reîncărcăm pagina');
                                toast({
                                  title: "Reîncărcare necesară",
                                  description: "Se reîncarcă pagina pentru a reactiva notificările...",
                                  variant: "default",
                                });
                                setTimeout(() => window.location.reload(), 1500);
                                return;
                              } else {
                                console.log('Service worker activ găsit:', registrations[0].active?.state);
                              }
                            }
                            
                            // 3. Pornirea verificării după un delay pentru a asigura starea corectă
                            console.log('Pornirea verificării de notificări după un delay...');
                            
                            // Semnalăm utilizatorului că procesul este în curs
                            toast({
                              title: "Activare notificări",
                              description: "Se activează sistemul de notificări...",
                              variant: "default",
                            });
                            
                            // Amânăm pornirea verificării pentru a permite sistemului să se stabilizeze
                            setTimeout(async () => {
                              try {
                                // Forțăm reîmprospătarea token-ului înainte de a porni verificarea
                                const refreshedToken = localStorage.getItem('firebase_auth_token') || localStorage.getItem('authToken');
                                
                                // Pornim verificarea în fundal cu tokenul reîmprospătat
                                const result = await NotificationHelper.startBackgroundMessageCheck(
                                  userData.id, 
                                  userData.role, 
                                  refreshedToken || token
                                );
                                
                                console.log('Rezultat pornire verificare notificări:', result);
                                
                                // Notificare de confirmare pentru utilizator
                                NotificationHelper.showNotification('Notificări activate', {
                                  body: 'Vei primi notificări pentru mesaje noi, cereri și oferte acceptate',
                                  requireInteraction: false,
                                  silent: false
                                });
                                
                                // Confirmăm utilizatorului și în interfață
                                toast({
                                  title: "Notificări activate cu succes",
                                  description: "Vei primi notificări pentru activitatea nouă",
                                  variant: "default",
                                });
                              } catch (error) {
                                console.error('Eroare la pornirea verificării notificărilor:', error);
                                toast({
                                  title: "Eroare la activarea notificărilor",
                                  description: "Nu s-au putut activa notificările. Încercați să reîncărcați pagina.",
                                  variant: "destructive",
                                });
                              }
                            }, 1200); // Creștem delay-ul pentru a asigura stabilitatea
                          } catch (error) {
                            console.error('Eroare la procesul de activare a notificărilor:', error);
                            toast({
                              title: "Eroare la activarea notificărilor",
                              description: error instanceof Error ? error.message : "Eroare neașteptată la activarea notificărilor",
                              variant: "destructive",
                            });
                          }
                        } else if (!checked) {
                          console.log('Dezactivăm verificare notificări în Service Worker');
                          
                          // Oprirea notificărilor este mai simplă și nu necesită verificări extensive
                          import('../../lib/notifications').then(module => {
                            try {
                              const NotificationHelper = module.default;
                              console.log('Oprire notificări browser');
                              
                              // Oprim verificarea în Service Worker
                              NotificationHelper.stopBackgroundMessageCheck();
                              
                              toast({
                                title: "Notificări dezactivate",
                                description: "Nu vei mai primi notificări în browser",
                                variant: "default",
                              });
                            } catch (error) {
                              console.error('Eroare la oprirea notificărilor:', error);
                            }
                          });
                        }
                      },
                      onError: (error) => {
                        console.error('Eroare la actualizarea preferințelor:', error);
                        toast({
                          title: "Eroare",
                          description: "Nu s-au putut actualiza preferințele. Încercați din nou.",
                          variant: "destructive",
                        });
                      }
                    });
                  }}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}