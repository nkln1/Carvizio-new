import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Navigation from "@/components/layout/Navigation";
import Contact from "@/pages/Contact";
import { AuthProvider } from "@/context/AuthContext";
import ClientDashboard from "@/pages/ClientDashboard";
import ServiceDashboard from "@/pages/ServiceDashboard";
import ServicePublicProfile from "@/pages/ServicePublicProfile";
import CookiePolicy from "@/pages/CookiePolicy";
import CookieBanner from "@/components/common/CookieBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import TermsAndConditions from "./pages/TermsAndConditions"; // Added import

function Router() {
  return (
    <Switch>
      <Route path="/service/:username" component={ServicePublicProfile} />
      <Route path="/service-dashboard" component={ServiceDashboard} />
      <Route path="/dashboard" component={ClientDashboard} />
      <Route path="/contact" component={Contact} />
      <Route path="/cookie-policy" component={CookiePolicy} />
      <Route path="/terms-and-conditions" component={TermsAndConditions} /> {/* Added route */}
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { useEffect, useState } from "react";
import NotificationHelper from "./lib/notifications";

function App() {
  const [webSocketInitialized, setWebSocketInitialized] = useState(false);
  
  // Inițializare handler pentru notificări la încărcarea aplicației
  // Acest cod înlocuiește secțiunea useEffect din App.tsx pentru inițializarea WebSocket

  useEffect(() => {
    console.log("[App] Încărcare aplicație...");

    // Flag pentru a urmări dacă avem permisiunea utilizatorului
    let hasPermission = false;

    // Verifică și inițializează notificările dacă sunt suportate
    if (NotificationHelper.isSupported()) {
      const currentPermission = NotificationHelper.checkPermission();
      console.log("Stare permisiune notificări:", currentPermission);
      hasPermission = currentPermission === 'granted';

      // Dacă avem deja permisiunea, sau utilizatorul nu a răspuns încă, solicităm explicit
      if (currentPermission === 'default') {
        NotificationHelper.requestPermission().then(granted => {
          console.log("Permisiune notificări după solicitare:", granted ? "acordată" : "refuzată");
          hasPermission = granted;
        });
      }

      // Importăm și inițializăm WebSocketService
      import("@/lib/websocket").then((module) => {
        const websocketService = module.default;

        // Încercăm să stabilim o conexiune WebSocket
        let connectionPromise = websocketService.ensureConnection();

        // Adăugăm un timeout pentru a nu aștepta la infinit
        const connectionTimeout = setTimeout(() => {
          console.log("Timeout în așteptarea conexiunii WebSocket, continuăm oricum");
        }, 5000);

        // Așteptăm conexiunea sau timeout-ul
        connectionPromise
          .then(() => {
            console.log("WebSocket conectat pentru notificări");
            clearTimeout(connectionTimeout);

            // Adăugăm un handler pentru mesaje WebSocket
            const removeHandler = websocketService.addMessageHandler(async (data: any) => {
              console.log("Processing websocket message for notifications:", data);

              // Verificăm dacă este un mesaj valid
              if (!data || !data.type) {
                console.warn("Mesaj WebSocket invalid sau fără tip:", data);
                return;
              }

              // Verificăm dacă avem permisiunea de notificare
              const permissionNow = NotificationHelper.checkPermission();
              if (permissionNow !== 'granted') {
                console.log("Notificări browser: Permisiune neacordată, nu putem afișa notificări");
                return;
              }

              // Verificăm preferințele de notificări doar pentru mesaje de tip NEW_MESSAGE
              if (data.type === 'NEW_MESSAGE') {
                try {
                  // Obținem preferințele de notificări
                  const response = await fetch('/api/service/notification-preferences');

                  if (!response.ok) {
                    console.error("Nu am putut obține preferințele de notificări");
                    // Forțăm afișarea notificării direct ca fallback
                    if (data.payload && data.payload.content) {
                      NotificationHelper.forceMessageNotification(data.payload.content);
                    }
                    return;
                  }

                  const preferences = await response.json();

                  console.log("Preferințe notificări obținute:", preferences);

                  if (preferences && 
                      preferences.browserNotificationsEnabled && 
                      preferences.newMessageBrowserEnabled) {
                    console.log("Afișăm notificare pentru mesaj nou:", data.payload);

                    let messageBody = 'Ați primit un mesaj nou';
                    if (data.payload && data.payload.content) {
                      messageBody = data.payload.content;
                    }

                    // Forțăm afișarea notificării direct
                    NotificationHelper.forceMessageNotification(messageBody);
                  } else {
                    console.log("Notificările pentru mesaje noi sunt dezactivate în preferințe");
                  }
                } catch (error) {
                  console.error("Eroare la procesarea notificării:", error);

                  // În caz de eroare, încercăm totuși să afișăm notificarea
                  if (data.payload && data.payload.content) {
                    NotificationHelper.forceMessageNotification(data.payload.content);
                  }
                }
              } else {
                // Pentru alte tipuri de evenimente, delegăm către NotificationHelper
                NotificationHelper.handleNotificationEvent(data);
              }
            });

            // Setăm variabila de stare pentru a indica inițializarea WebSocket
            setWebSocketInitialized(true);

            // Adaugă un window event listener pentru testare manuală
            const testNotificationHandler = () => {
              console.log("Testare notificare din event dispatcher");
              NotificationHelper.testNotification();
            };

            window.addEventListener('test-notification', testNotificationHandler);

            // Test manual de notificare la inițializare pentru a ne asigura că funcționează
            setTimeout(() => {
              if (hasPermission) {
                console.log("Trimitem o notificare de test pentru a verifica funcționalitatea");
                NotificationHelper.showNotification('Notificările sunt active', {
                  body: 'Vei primi notificări pentru mesaje noi și alte evenimente importante',
                  icon: '/favicon.ico',
                  requireInteraction: true
                });
              }
            }, 3000);

            // Clean-up la unmount
            return () => {
              removeHandler();
              websocketService.disconnect();
              window.removeEventListener('test-notification', testNotificationHandler);
              setWebSocketInitialized(false);
            };
          })
          .catch(error => {
            console.error("Eroare la conectarea WebSocket pentru notificări:", error);
            clearTimeout(connectionTimeout);

            // Implementăm o strategie de fallback pentru notificări
            console.log("Implementăm strategia de fallback pentru notificări");

            // Putem folosi un polling pentru a verifica mesajele noi la intervale regulate
            const checkNewMessages = async () => {
              try {
                const response = await fetch('/api/messages/unread', {
                  headers: {
                    'Authorization': `Bearer ${await getAuthToken()}`
                  }
                });

                if (response.ok) {
                  const data = await response.json();
                  if (data.newMessages && data.newMessages.length > 0) {
                    // Procesăm mesajele noi
                    data.newMessages.forEach((message: any) => {
                      NotificationHelper.forceMessageNotification(
                        message.content || 'Ați primit un mesaj nou'
                      );
                    });
                  }
                }
              } catch (error) {
                console.error("Eroare la verificarea mesajelor noi:", error);
              }
            };

            // Verificăm inițial
            checkNewMessages();

            // Apoi setăm un interval pentru verificare periodică
            const pollingInterval = setInterval(checkNewMessages, 30000); // 30 secunde

            // Clean-up la unmount
            return () => {
              clearInterval(pollingInterval);
              setWebSocketInitialized(false);
            };
          });
      }).catch(error => {
        console.error("Eroare la importarea WebSocketService:", error);
      });
    } else {
      console.warn("Acest browser nu suportă notificările");
    }

    // Helper pentru a obține token-ul de autentificare
    async function getAuthToken() {
      try {
        // Presupunem că folosim Firebase Auth
        if (typeof window !== 'undefined' && window.firebase && window.firebase.auth) {
          const user = window.firebase.auth().currentUser;
          if (user) {
            return await user.getIdToken();
          }
        }
        return null;
      } catch (error) {
        console.error("Eroare la obținerea token-ului de autentificare:", error);
        return null;
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Navigation />
          <Router />
          <CookieBanner />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;