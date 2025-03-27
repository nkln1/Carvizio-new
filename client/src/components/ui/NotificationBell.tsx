import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Componenta pentru iconița de notificări care include un buton pentru 
 * activarea notificărilor și afișarea numărului de notificări necitite
 */
const NotificationBell: React.FC = () => {
  const { isEnabled, unreadCount, enableNotifications } = useNotifications();
  const { toast } = useToast();
  const [isActivating, setIsActivating] = React.useState(false);

  // Handler pentru activarea notificărilor
  const handleEnableNotifications = async () => {
    setIsActivating(true);
    
    try {
      const result = await enableNotifications();
      
      if (result) {
        toast({
          title: 'Notificări activate',
          description: 'Vei primi notificări pentru activitatea importantă din cont.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Notificările nu au putut fi activate',
          description: 'Te rugăm să permiți notificările în browser și să încerci din nou.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare la activarea notificărilor.',
        variant: 'destructive',
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="relative ml-2">
      {isEnabled ? (
        <div className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 flex items-center justify-center px-1 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      ) : (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleEnableNotifications}
          disabled={isActivating}
          title="Activează notificările"
          aria-label="Activează notificările"
        >
          <BellOff className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default NotificationBell;