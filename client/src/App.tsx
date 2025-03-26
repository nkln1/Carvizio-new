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
      
      // Adăugăm un handler pentru mesaje WebSocket
      const handleWebSocketMessage = (data: any) => {
        if (data && data.type === 'NEW_MESSAGE' && NotificationHelper.checkPermission() === 'granted') {
          NotificationHelper.showNotification('Mesaj nou', {
            body: data.message || 'Ați primit un mesaj nou',
            icon: '/favicon.ico'
          });
        }
      };
      
      // Adaugă un window event listener pentru testare manuală
      window.addEventListener('test-notification', () => {
        NotificationHelper.testNotification();
      });
      
      // Clean-up la unmount
      return () => {
        window.removeEventListener('test-notification', () => {});
      };
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