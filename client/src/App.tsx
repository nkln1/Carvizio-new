import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Navigation from "@/components/layout/Navigation";
import Contact from "@/pages/Contact"; // Added import for Contact page

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/contact" component={Contact} /> {/* Added Contact route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

// Added minimal Contact component
const Contact = () => {
  return (
    <div>
      <h1>Contact Us</h1>
      <p>This is the contact page.</p>
    </div>
  );
};

export { Contact };