import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export const AccountTab = () => {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contul meu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Email</h3>
            <p className="text-gray-600">{user?.email}</p>
          </div>
          {/* More account details can be added here */}
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountTab;
