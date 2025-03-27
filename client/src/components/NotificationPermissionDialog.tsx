import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

/**
 * Dialog pentru solicitarea permisiunii de notificări
 * Apare automat la prima logare a utilizatorului
 */
const NotificationPermissionDialog = () => {
  const [open, setOpen] = useState(false);
  const { isEnabled, enableNotifications } = useNotifications();
  const { isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(false);

  // Verificăm dacă utilizatorul a fost întrebat deja despre notificări
  useEffect(() => {
    const hasBeenAsked = localStorage.getItem('notification_permission_asked');
    
    if (isLoggedIn && !isEnabled && !hasBeenAsked) {
      // Așteptăm puțin înainte de a afișa dialogul
      const timer = setTimeout(() => {
        setOpen(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, isEnabled]);

  // Funcție pentru activarea notificărilor
  const handleEnableNotifications = async () => {
    setLoading(true);
    
    try {
      await enableNotifications();
      setOpen(false);
    } catch (error) {
      console.error('Eroare la activarea notificărilor:', error);
    } finally {
      // Marcăm că utilizatorul a fost întrebat
      localStorage.setItem('notification_permission_asked', 'true');
      setLoading(false);
    }
  };

  // Funcție pentru renunțare
  const handleDismiss = () => {
    setOpen(false);
    // Marcăm că utilizatorul a fost întrebat
    localStorage.setItem('notification_permission_asked', 'true');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Activați notificările
          </DialogTitle>
          <DialogDescription>
            Primiți notificări despre mesaje noi, oferte și actualizări importante chiar și când nu sunteți pe site.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="bg-muted p-4 rounded-lg text-sm">
            <p className="font-medium mb-2">Beneficii:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Aflați imediat când primiți un mesaj nou</li>
              <li>Fiți notificat despre oferte și cereri noi</li>
              <li>Nu ratați nicio actualizare importantă</li>
              <li>Funcționează chiar și când browserul este închis</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={handleDismiss}
          >
            Poate mai târziu
          </Button>
          <Button 
            onClick={handleEnableNotifications}
            disabled={loading}
          >
            {loading ? 'Se activează...' : 'Activează notificările'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPermissionDialog;