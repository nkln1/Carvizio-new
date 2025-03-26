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

import { useEffect } from "react";
import NotificationHelper from "./lib/notifications";

function App() {
  // Inițializare handler pentru notificări la încărcarea aplicației
  useEffect(() => {
    console.log("[App] Încărcare aplicație...");
    
    // Verifică și inițializează notificările dacă sunt suportate
    if (NotificationHelper.isSupported()) {
      const currentPermission = NotificationHelper.checkPermission();
      console.log("Stare permisiune notificări:", currentPermission);
      
      // Importăm și inițializăm WebSocketService
      import("@/lib/websocket").then((module) => {
        const websocketService = module.default;
        
        // Ne asigurăm că WebSocket este conectat
        websocketService.ensureConnection().then(() => {
          console.log("WebSocket conectat pentru notificări");
          
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
            
            // Verificăm dacă este un mesaj nou
            if (data && data.type === 'NEW_MESSAGE') {
              if (NotificationHelper.checkPermission() === 'granted') {
                // Verificăm preferințele de notificări
                const preferences = await fetchNotificationPreferences();
                
                // Verificăm dacă notificările pentru mesaje noi sunt activate
                if (preferences && 
                    preferences.browserNotificationsEnabled && 
                    preferences.newMessageBrowserEnabled) {
                  
                  console.log("Afișare notificare pentru mesaj nou");
                  NotificationHelper.showNotification('Mesaj nou', {
                    body: data.message || 'Ați primit un mesaj nou',
                    icon: '/favicon.ico'
                  });
                } else {
                  console.log("Notificările pentru mesaje noi sunt dezactivate în preferințe");
                }
              } else {
                console.log("Permisiunea browserului pentru notificări nu este acordată");
              }
            }
          });
          
          // Adaugă un window event listener pentru testare manuală
          window.addEventListener('test-notification', () => {
            NotificationHelper.testNotification();
          });
          
          // Clean-up la unmount
          return () => {
            removeHandler();
            window.removeEventListener('test-notification', () => {});
          };
        }).catch(error => {
          console.error("Eroare la conectarea WebSocket pentru notificări:", error);
        });
      });
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