import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Settings } from "lucide-react";
import { EditProfile } from "@/components/auth/EditProfile";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import type { User as UserType } from "@shared/schema";
import { useState } from "react";

interface ProfileTabProps {
  userProfile: UserType;
}

export function ProfileTab({ userProfile }: ProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  return (
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
            <EditProfile
              user={userProfile}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Nume și Prenume</p>
                  <p className="mt-1 text-sm">{userProfile.name || 'Nu este specificat'}</p>
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
                  <p className="text-sm font-medium text-gray-500">Tip Cont</p>
                  <p className="mt-1 text-sm capitalize">{userProfile.role || 'Nu este specificat'}</p>
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
  );
}