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

function Router() {
  return (
    <Switch>
      <Route path="/service/:username" component={ServicePublicProfile} />
      <Route path="/service-dashboard" component={ServiceDashboard} />
      <Route path="/dashboard" component={ClientDashboard} />
      <Route path="/contact" component={Contact} />
      <Route path="/cookie-policy" component={CookiePolicy} />
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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