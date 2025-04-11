import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Mail, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/firebase";
import NotificationHelper from "@/lib/notifications";

interface NotificationPreference {
  emailNotificationsEnabled: boolean;
  newOfferEmailEnabled: boolean;
  newMessageEmailEnabled: boolean;
  offerStatusEmailEnabled: boolean;
  soundNotificationsEnabled?: boolean;
}

export const NotificationPreferences = () => {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference>({
    emailNotificationsEnabled: true,
    newOfferEmailEnabled: true,
    newMessageEmailEnabled: true,
    offerStatusEmailEnabled: true,
    soundNotificationsEnabled: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Fetch notification preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No authentication token available');

        const response = await fetch('/api/client/notification-preferences', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch notification preferences: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched notification preferences:', data);

        setPreferences({
          emailNotificationsEnabled: data.emailNotificationsEnabled ?? true,
          newOfferEmailEnabled: data.newOfferEmailEnabled ?? true,
          newMessageEmailEnabled: data.newMessageEmailEnabled ?? true,
          offerStatusEmailEnabled: data.offerStatusEmailEnabled ?? true,
          soundNotificationsEnabled: data.soundNotificationsEnabled ?? true
        });
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu s-au putut încărca preferințele de notificare."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [toast]);

  // Handle toggle change
  const handleToggleChange = async (key: keyof NotificationPreference, checked: boolean) => {
    try {
      const updatedPreferences = {
        ...preferences,
        [key]: checked
      };
      setPreferences(updatedPreferences);

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/client/notification-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedPreferences)
      });

      if (!response.ok) {
        throw new Error(`Failed to update notification preferences: ${response.status}`);
      }

      toast({
        title: "Succes",
        description: "Preferințele de notificare au fost actualizate."
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut actualiza preferințele de notificare."
      });

      // Revert the state change
      setPreferences(preferences);
    }
  };

  // Send test email
  const handleSendTestEmail = async () => {
    try {
      setTestEmailStatus('loading');
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // Get user profile to make sure we have the email address
      const profileResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch profile: ${profileResponse.status}`);
      }

      const profile = await profileResponse.json();

      // Call test email endpoint
      const response = await fetch('/api/client/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: profile.email,
          name: profile.name || 'Client'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send test email: ${response.status}`);
      }

      setTestEmailStatus('success');
      toast({
        title: "Email de test trimis",
        description: "Verificați căsuța de email pentru a confirma că notificările funcționează."
      });

      // Play sound notification to demonstrate
      NotificationHelper.playNotificationSound('notification');
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestEmailStatus('error');
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut trimite email-ul de test."
      });
    } finally {
      // Reset status after a while
      setTimeout(() => {
        setTestEmailStatus('idle');
      }, 3000);
    }
  };

  // Test sound notification
  const handleTestSound = () => {
    NotificationHelper.playNotificationSound('notification');
    toast({
      title: "Test sunet",
      description: "Testare sunet de notificare"
    });
  };

  if (isLoading) {
    return <div>Se încarcă preferințele de notificare...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferințe Notificări
        </CardTitle>
        <CardDescription>
          Configurați preferințele pentru notificările primite prin email și browser
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="mb-6 space-y-4 bg-blue-50 p-4 rounded-md">
            <h3 className="font-medium text-blue-700 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notificări Email
            </h3>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="email-notifications" className="text-gray-900">
                  Notificări email
                </Label>
                <p className="text-sm text-gray-500">
                  Activați sau dezactivați toate notificările prin email
                </p>
              </div>
              <Switch 
                id="email-notifications"
                checked={preferences.emailNotificationsEnabled}
                onCheckedChange={(checked) => handleToggleChange('emailNotificationsEnabled', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <Label 
                  htmlFor="new-offer-email" 
                  className={`${!preferences.emailNotificationsEnabled ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  Oferte noi
                </Label>
              </div>
              <Switch 
                id="new-offer-email"
                checked={preferences.newOfferEmailEnabled}
                disabled={!preferences.emailNotificationsEnabled}
                onCheckedChange={(checked) => handleToggleChange('newOfferEmailEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label 
                  htmlFor="new-message-email" 
                  className={`${!preferences.emailNotificationsEnabled ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  Mesaje noi
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
                  htmlFor="offer-status-email" 
                  className={`${!preferences.emailNotificationsEnabled ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  Actualizări status oferte
                </Label>
              </div>
              <Switch 
                id="offer-status-email"
                checked={preferences.offerStatusEmailEnabled}
                disabled={!preferences.emailNotificationsEnabled}
                onCheckedChange={(checked) => handleToggleChange('offerStatusEmailEnabled', checked)}
              />
            </div>

            <div className="mt-4">
              <Button 
                size="sm" 
                onClick={handleSendTestEmail}
                disabled={!preferences.emailNotificationsEnabled || testEmailStatus === 'loading'}
                variant={testEmailStatus === 'success' ? 'outline' : 
                        testEmailStatus === 'error' ? 'destructive' : 'secondary'}
              >
                {testEmailStatus === 'loading' ? 'Se trimite...' : 
                 testEmailStatus === 'success' ? 'Email trimis ✓' : 
                 testEmailStatus === 'error' ? 'Eroare la trimitere' : 
                 'Trimite email de test'}
              </Button>
            </div>
          </div>

          <div className="mb-6 space-y-4 bg-purple-50 p-4 rounded-md">
            <h3 className="font-medium text-purple-700 flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Notificări în browser
            </h3>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="sound-notifications" className="text-gray-900">
                  Notificări sonore
                </Label>
                <p className="text-sm text-gray-500">
                  Activați sau dezactivați sunetele pentru notificări
                </p>
              </div>
              <Switch 
                id="sound-notifications"
                checked={preferences.soundNotificationsEnabled}
                onCheckedChange={(checked) => handleToggleChange('soundNotificationsEnabled', checked)}
              />
            </div>

            <div className="mt-4">
              <Button 
                size="sm" 
                onClick={handleTestSound}
                disabled={!preferences.soundNotificationsEnabled}
                variant="secondary"
              >
                Testează sunetul
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md mt-4">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <BellOff className="h-4 w-4" />
              Notificările în browser vor continua să funcționeze indiferent de setările de email.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};