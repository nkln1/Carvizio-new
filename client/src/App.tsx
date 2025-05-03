import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Navigation from "@/components/layout/Navigation";
import Contact from "@/pages/Contact";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import ClientDashboard from "@/pages/ClientDashboard";
import ServiceDashboard from "@/pages/ServiceDashboard";
import ServicePublicProfile from "@/pages/ServicePublicProfile";
import CookiePolicy from "@/pages/CookiePolicy";
import CookieBanner from "@/components/common/CookieBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import TermsAndConditions from "./pages/TermsAndConditions";
import NotificationTest from "./pages/NotificationTest";
import NotificationPermissionDialog from "@/components/NotificationPermissionDialog";
import { useEffect, useState } from "react";
import React from "react";
import TestEmailButton from "@/components/TestEmailButton";
import TestEmail from "@/pages/TestEmail";

// Nu mai avem nevoie de extensia proprietăților globale window
// deoarece folosim direct NotificationHelper.handleNotificationEvent()
// care are propria gestiune a ID-urilor de notificări procesate

function Router() {
  return (
    <Switch>
      <Route path="/service/:username" component={ServicePublicProfile} />
      <Route path="/service-dashboard" component={ServiceDashboard} />
      <Route path="/dashboard" component={ClientDashboard} />
      <Route path="/contact" component={Contact} />
      <Route path="/cookie-policy" component={CookiePolicy} />
      <Route path="/terms-and-conditions" component={TermsAndConditions} />
      <Route path="/test-notificari" component={NotificationTest} />
      <Route path="/test-email" component={TestEmail} />
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Component pentru inițializarea notificărilor și securității
const AppInitializer: React.FC = () => {
  const [webSocketInitialized, setWebSocketInitialized] = React.useState(false);
  const [csrfInitialized, setCsrfInitialized] = React.useState(false);
  
  React.useEffect(() => {
    console.log("[App] Încărcare aplicație...");

    // Inițializare CSRF
    const initializeCsrf = async () => {
      try {
        // Importăm dinamic modulul CSRF
        const csrfModule = await import('./lib/csrfInitializer');
        await csrfModule.initializeCsrfProtection();
        setCsrfInitialized(true);
        console.log("Protecție CSRF inițializată");
      } catch (error) {
        console.error("Eroare la inițializarea protecției CSRF:", error);
      }
    };

    // Inițializăm protecția CSRF
    initializeCsrf();

    // Pentru a evita problemele cu hook-urile, importăm direct tote modulele necesare
    const initializeNotifications = async () => {
      try {
        // Importăm dinammic modulele
        const NotificationHelperModule = await import("./lib/notifications");
        const NotificationHelper = NotificationHelperModule.default;
        
        // Flag pentru a urmări dacă avem permisiunea utilizatorului
        let hasPermission = false;

        // Verifică și inițializează notificările dacă sunt suportate
        if (NotificationHelper.isSupported()) {
          const currentPermission = NotificationHelper.checkPermission();
          console.log("Stare permisiune notificări:", currentPermission);
          hasPermission = currentPermission === 'granted';

          // Dacă avem deja permisiunea, sau utilizatorul nu a răspuns încă, solicităm explicit
          if (currentPermission === 'default') {
            const granted = await NotificationHelper.requestPermission();
            console.log("Permisiune notificări după solicitare:", granted ? "acordată" : "refuzată");
            hasPermission = granted;
          }

          // Importăm și inițializăm WebSocketService
          const websocketModule = await import("@/lib/websocket");
          const websocketService = websocketModule.default;

          // Încercăm să stabilim o conexiune WebSocket
          let connectionPromise = websocketService.ensureConnection();

          // Adăugăm un timeout pentru a nu aștepta la infinit
          const connectionTimeout = setTimeout(() => {
            console.log("Timeout în așteptarea conexiunii WebSocket, continuăm oricum");
          }, 5000);

          try {
            // Așteptăm conexiunea
            await connectionPromise;
            console.log("WebSocket conectat pentru notificări");
            clearTimeout(connectionTimeout);

            // Adăugăm un handler pentru mesaje WebSocket
            const removeHandler = websocketService.addMessageHandler(async (data) => {
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

              // Pentru toate tipurile de evenimente, delegăm către NotificationHelper
              // Acest lucru centralizează gestionarea notificărilor și previne duplicarea lor
              NotificationHelper.handleNotificationEvent(data);
            });

            // Setăm variabila de stare pentru a indica inițializarea WebSocket
            setWebSocketInitialized(true);

            // Adaugă un window event listener pentru testare manuală
            const testNotificationHandler = () => {
              console.log("Testare notificare din event dispatcher");
              NotificationHelper.testNotification();
            };

            window.addEventListener('test-notification', testNotificationHandler);
            
            // Doar afișăm un mesaj în consolă că notificările sunt active, fără a afișa notificări inițiale
            if (hasPermission) {
              console.log("Notificările sunt active și configurate corect");
            }

            // Clean-up la unmount
            return () => {
              removeHandler();
              websocketService.disconnect();
              window.removeEventListener('test-notification', testNotificationHandler);
              setWebSocketInitialized(false);
            };
          } catch (error) {
            console.error("Eroare la conectarea WebSocket pentru notificări:", error);
            clearTimeout(connectionTimeout);

            // Implementăm o strategie de fallback pentru notificări
            console.log("Implementăm strategia de fallback pentru notificări");

            // Putem folosi un polling pentru a verifica mesajele noi la intervale regulate
            const checkNewMessages = async () => {
              try {
                // Obținem token-ul de autentificare pentru cererea API
                const firebaseModule = await import('./lib/firebase');
                const auth = firebaseModule.auth;
                let token = null;
                
                if (auth.currentUser) {
                  token = await auth.currentUser.getIdToken();
                }
                
                const headers: Record<string, string> = {};
                if (token) {
                  headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await fetch('/api/messages/unread', { headers });

                if (response.ok) {
                  const data = await response.json();
                  if (data.newMessages && data.newMessages.length > 0) {
                    // Procesăm mesajele noi, dar doar unul pentru a evita spam-ul cu notificări
                    // Acest mecanism este doar un fallback când WebSocket nu funcționează
                    console.log(`Fallback mechanism: ${data.newMessages.length} new messages found`);
                    
                    // Folosim întotdeauna doar primul mesaj pentru notificare pentru a reduce zgomotul
                    const firstMessage = data.newMessages[0];
                    
                    // Generăm un ID unic pentru notificare
                    const notificationId = `fallback-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    
                    // Creăm un eveniment de notificare și delegăm gestiunea către NotificationHelper
                    // pentru a beneficia de mecanismul existent de prevenire a duplicatelor
                    const notificationEvent = {
                      type: 'NEW_MESSAGE',
                      notificationId: notificationId,
                      payload: {
                        content: `Aveți ${data.newMessages.length} mesaje necitite`
                      }
                    };
                    
                    // Folosim handleNotificationEvent pentru a beneficia de logica de deduplicare
                    console.log(`Afișăm notificare fallback pentru ${data.newMessages.length} mesaje necitite`);
                    NotificationHelper.handleNotificationEvent(notificationEvent);
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
          }
        } else {
          console.warn("Acest browser nu suportă notificările");
        }
      } catch (error) {
        console.error("Eroare la inițializarea notificărilor:", error);
      }
    };

    // Apelăm funcția de inițializare
    initializeNotifications();
  }, []);

  return null; // Acest component nu randează nimic
};

// Optimizăm componenta folosind React.memo pentru a preveni re-renderurile inutile
const AppInitializerMemo = React.memo(AppInitializer);

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <AppInitializerMemo />
            <Navigation />
            <Router />
            <CookieBanner />
            <NotificationPermissionDialog />
            <Toaster />
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;