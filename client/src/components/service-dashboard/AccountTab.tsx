import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Settings, Loader2 } from "lucide-react";
import { EditProfileService } from "@/components/auth/EditProfileService";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import type { ServiceProviderUser } from "@shared/schema";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import NotificationPreferences from "./NotificationPreferences";
import { setNotificationPreferences } from "@/services/notificationService";

export default function AccountTab() {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const { data: userProfile, isLoading } = useQuery<ServiceProviderUser>({
    queryKey: ['/api/auth/me'],
    retry: 1,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (userProfile?.notificationPreferences) {
      console.log("Setting notification preferences from user profile:", userProfile.notificationPreferences);
      setNotificationPreferences(userProfile.notificationPreferences);
    }
  }, [userProfile]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <User className="h-5 w-5" />
            Profilul Meu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-[#00aff5] flex items-center gap-2">
            <User className="h-5 w-5" />
            Profilul Meu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {isEditing ? (
              <EditProfileService
                user={userProfile}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nume Companie</p>
                    <p className="mt-1 text-sm">{userProfile.companyName || 'Nu este specificat'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nume Reprezentant</p>
                    <p className="mt-1 text-sm">{userProfile.representativeName || 'Nu este specificat'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-sm">{userProfile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Telefon</p>
                    <p className="mt-1 text-sm">{userProfile.phone || 'Nu este specificat'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Județ</p>
                    <p className="mt-1 text-sm">{userProfile.county || 'Nu este specificat'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Oraș</p>
                    <p className="mt-1 text-sm">{userProfile.city || 'Nu este specificat'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Adresă</p>
                    <p className="mt-1 text-sm">{userProfile.address || 'Nu este specificat'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">CUI</p>
                    <p className="mt-1 text-sm">{userProfile.cui || 'Nu este specificat'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Număr Registru Comerț</p>
                    <p className="mt-1 text-sm">{userProfile.tradeRegNumber || 'Nu este specificat'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Data Înregistrării</p>
                    <p className="mt-1 text-sm">
                      {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('ro-RO') : 'Nu este specificat'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Editează Profilul
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto text-red-600 hover:text-red-700"
                    onClick={() => setShowPasswordDialog(true)}
                  >
                    Schimbă Parola
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>

        <ChangePasswordDialog 
          open={showPasswordDialog} 
          onOpenChange={setShowPasswordDialog}
        />
      </Card>

      {/* Adaugăm secțiunea Preferințe Notificări */}
      <NotificationPreferences />
    </div>
  );
}