import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function UserInfo() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your profile details and preferences</CardDescription>
          </div>
          <Badge variant={user.verified ? "default" : "secondary"}>
            {user.verified ? "Verified" : "Pending Verification"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Personal Details</h3>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 text-sm">
              <div className="font-medium text-muted-foreground">Name</div>
              <div className="col-span-2">{user.name || 'Not provided'}</div>
            </div>
            <div className="grid grid-cols-3 text-sm">
              <div className="font-medium text-muted-foreground">Email</div>
              <div className="col-span-2">{user.email}</div>
            </div>
            <div className="grid grid-cols-3 text-sm">
              <div className="font-medium text-muted-foreground">Phone</div>
              <div className="col-span-2">{user.phone || 'Not provided'}</div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Location</h3>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 text-sm">
              <div className="font-medium text-muted-foreground">City</div>
              <div className="col-span-2">{user.city || 'Not provided'}</div>
            </div>
            <div className="grid grid-cols-3 text-sm">
              <div className="font-medium text-muted-foreground">County</div>
              <div className="col-span-2">{user.county || 'Not provided'}</div>
            </div>
            <div className="grid grid-cols-3 text-sm">
              <div className="font-medium text-muted-foreground">Address</div>
              <div className="col-span-2">{user.address || 'Not provided'}</div>
            </div>
          </div>
        </div>

        {user.role === 'service' && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Business Information</h3>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 text-sm">
                  <div className="font-medium text-muted-foreground">Company Name</div>
                  <div className="col-span-2">{user.companyName || 'Not provided'}</div>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <div className="font-medium text-muted-foreground">Representative</div>
                  <div className="col-span-2">{user.representativeName || 'Not provided'}</div>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <div className="font-medium text-muted-foreground">CUI</div>
                  <div className="col-span-2">{user.cui || 'Not provided'}</div>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <div className="font-medium text-muted-foreground">Trade Reg Number</div>
                  <div className="col-span-2">{user.tradeRegNumber || 'Not provided'}</div>
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="grid grid-cols-3 text-sm">
          <div className="font-medium text-muted-foreground">Account Created</div>
          <div className="col-span-2">
            {new Date(user.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}