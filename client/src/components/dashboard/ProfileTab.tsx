import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { EditProfile } from "@/components/auth/EditProfile";
import type { User as UserType } from "@shared/schema";
import { useState } from "react";

interface ProfileTabProps {
  userProfile: UserType;
}

export function ProfileTab({ userProfile }: ProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informații Cont</CardTitle>
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
                  <p className="text-sm font-medium text-gray-500">Nume Complet</p>
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
                <Button variant="outline" className="w-full sm:w-auto text-red-600 hover:text-red-700">
                  Schimbă Parola
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
