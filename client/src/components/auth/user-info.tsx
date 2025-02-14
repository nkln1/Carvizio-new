import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UserInfo() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-[200px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-[300px]" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <strong>Name:</strong> {user.name || 'N/A'}
        </div>
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>Role:</strong> {user.role}
        </div>
        <div>
          <strong>Phone:</strong> {user.phone || 'N/A'}
        </div>
        {user.role === 'service' && (
          <>
            <div>
              <strong>Company Name:</strong> {user.companyName || 'N/A'}
            </div>
            <div>
              <strong>Representative:</strong> {user.representativeName || 'N/A'}
            </div>
            <div>
              <strong>CUI:</strong> {user.cui || 'N/A'}
            </div>
            <div>
              <strong>Trade Reg Number:</strong> {user.tradeRegNumber || 'N/A'}
            </div>
          </>
        )}
        <div>
          <strong>Location:</strong> {user.city ? `${user.city}, ${user.county}` : 'N/A'}
        </div>
        <div>
          <strong>Address:</strong> {user.address || 'N/A'}
        </div>
        <div>
          <strong>Account Created:</strong> {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
