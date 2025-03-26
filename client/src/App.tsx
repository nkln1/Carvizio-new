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
      let websocketService: any = null;
      import("@/lib/websocket").then((module) => {
        websocketService = module.default;
        
        // Ne asigurăm că WebSocket este conectat
        websocketService.ensureConnection().then(() => {
          console.log("WebSocket conectat pentru notificări");
          setWebSocketInitialized(true);
          
          // Obținem preferințele de notificări
          const fetchNotificationPreferences = async () => {
            try {
              const response = await fetch('/api/service/notification-preferences');
              if (response.ok) {
                return await response.json();
              }
              return null;
            } catch (error) {
              console.error("Eroare la obținerea preferințelor de notificări:", error);
              return null;
            }
          };
          
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
                const preferences = await fetchNotificationPreferences();
                
                if (preferences && 
                    preferences.browserNotificationsEnabled && 
                    preferences.newMessageBrowserEnabled) {
                  console.log("Afișăm notificare pentru mesaj nou:", data.payload);
                  
                  let messageBody = 'Ați primit un mesaj nou';
                  if (data.payload && data.payload.content) {
                    messageBody = data.payload.content;
                  }
                  
                  NotificationHelper.showNotification('Mesaj nou', {
                    body: messageBody,
                    icon: '/favicon.ico',
                    tag: `message-${Date.now()}`
                  });
                } else {
                  console.log("Notificările pentru mesaje noi sunt dezactivate în preferințe");
                }
              } catch (error) {
                console.error("Eroare la procesarea notificării:", error);
              }
            } else {
              // Pentru alte tipuri de evenimente, delegăm către NotificationHelper
              NotificationHelper.handleNotificationEvent(data);
            }
          });
          
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
                icon: '/favicon.ico'
              });
            }
          }, 3000);
          
          // Clean-up la unmount
          return () => {
            if (websocketService) {
              removeHandler();
              websocketService.disconnect();
            }
            window.removeEventListener('test-notification', testNotificationHandler);
            setWebSocketInitialized(false);
          };
        }).catch(error => {
          console.error("Eroare la conectarea WebSocket pentru notificări:", error);
        });
      });
    } else {
      console.warn("Acest browser nu suportă notificările");
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